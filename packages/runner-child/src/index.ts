import { pathToFileURL } from 'url';
import { WorkflowDefinition } from '@stepforge/sdk';

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 5) {
        console.error("Usage: runner <workspaceRoot> <workflowFile> <workflowId> <runId> <version>");
        process.exit(1);
    }

    const [workspaceRoot, workflowFile, workflowId, runId, version] = args;

    // Emit helper
    const emit = (event: any) => {
        console.log(`__SF_EVENT__ ${JSON.stringify({ ...event, runId })}`);
    };

    try {
        // 1. Load Workflow
        const importUrl = pathToFileURL(workflowFile).href;
        const mod = await import(importUrl);
        const def = mod.default as WorkflowDefinition;

        if (!def) throw new Error("No default export found");

        // 2. Execute
        const { executeWorkflow } = await import('@stepforge/sdk');

        // Safety check for version
        if (!version) {
            console.error("Missing version argument");
            process.exit(1);
        }

        await executeWorkflow(def, version, {
            runId,
            onEvent: emit
        });

    } catch (e: any) {
        console.error(e);
        process.exit(1);
    }
}

main();
