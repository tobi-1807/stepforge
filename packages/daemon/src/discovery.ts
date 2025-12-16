import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';
import { pathToFileURL } from 'url';
import { WorkflowDefinition, buildGraph, WorkflowGraph } from '@stepforge/sdk';

type CachedWorkflow = {
    id: string; // hash(relative path)
    filePath: string;
    definition: WorkflowDefinition;
    graph: WorkflowGraph;
    version: string; // hash(content)
};

// Map to store latest discovered workflows
const workflows = new Map<string, CachedWorkflow>();

// Simple hash function for file paths/content
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return (hash >>> 0).toString(16);
}

export async function reloadWorkflow(filePath: string, rootDir: string) {
    try {
        // 1. Calculate Version (Hash content)
        const content = await fs.readFile(filePath, 'utf-8');
        const version = simpleHash(content);
        const relativePath = path.relative(rootDir, filePath);
        const workflowId = simpleHash(relativePath);

        // 2. Import Definition
        // Bust cache with new query param
        const importUrl = pathToFileURL(filePath).href + `?v=${Date.now()}`;
        const mod = await import(importUrl);

        if (!mod.default || !mod.default.build) {
            console.warn(`Skipping ${relativePath}: No default export with build()`);
            return null;
        }

        const def = mod.default as WorkflowDefinition;

        // 3. Build Graph
        const graph = buildGraph(def, workflowId, version);

        const wf: CachedWorkflow = {
            id: workflowId,
            filePath,
            definition: def,
            graph,
            version
        };

        workflows.set(workflowId, wf);
        console.log(`Loaded workflow: ${def.name} (${workflowId})`);
        return wf;

    } catch (e) {
        console.error(`Failed to load ${filePath}:`, e);
        return null;
    }
}

export function removeWorkflow(filePath: string, rootDir: string) {
    const relativePath = path.relative(rootDir, filePath);
    const workflowId = simpleHash(relativePath);
    if (workflows.delete(workflowId)) {
        console.log(`Removed workflow: ${relativePath} (${workflowId})`);
    }
}

export async function discoverWorkflows(rootDir: string) {
    const pattern = '**/*.forge.ts';
    // Only glob if empty or explicitly requested (but we use watcher for updates now)
    // Actually simpler to just glob once on startup
    if (workflows.size === 0) {
        const files = await glob(pattern, { cwd: rootDir, absolute: true, ignore: '**/node_modules/**' });
        console.log(`Discovered ${files.length} workflow files in ${rootDir}`);

        for (const filePath of files) {
            await reloadWorkflow(filePath, rootDir);
        }
    }

    return Array.from(workflows.values());
}

export function getWorkflow(id: string) {
    return workflows.get(id);
}
