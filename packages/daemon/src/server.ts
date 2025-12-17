import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
// import open from 'open';
import chokidar from 'chokidar';
import { discoverWorkflows, getWorkflow, reloadWorkflow, removeWorkflow } from './discovery.js';
import { startRun } from './runner.js';
import { runManager } from './run-manager.js';

const app = express();
app.use(express.json());

// Enable CORS for UI dev
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    next();
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Workspace Root
const workspaceArg = process.argv[2];
if (!workspaceArg) {
    console.error("Usage: stepforge-daemon <workspace-directory>");
    process.exit(1);
}
// Resolve relative to where the command was run (INIT_CWD), not the package dir
const cwd = process.env.INIT_CWD || process.cwd();
const WORKSPACE_ROOT = path.resolve(cwd, workspaceArg);


// API Routes
app.get('/api/workflows', async (req, res) => {
    const wfs = await discoverWorkflows(WORKSPACE_ROOT);
    res.json(wfs.map(w => ({
        id: w.id,
        name: w.definition.name,
        version: w.version
    })));
});

app.get('/api/workflows/:id/graph', (req, res) => {
    const wf = getWorkflow(req.params.id);
    if (!wf) return res.status(404).json({ error: "Not found" });
    res.json(wf.graph);
});

app.get('/api/workflows/:id/details', (req, res) => {
    const wf = getWorkflow(req.params.id);
    if (!wf) return res.status(404).json({ error: "Not found" });

    res.json({
        id: wf.id,
        name: wf.definition.name,
        version: wf.version,
        inputs: wf.definition.inputs || [],
        graph: wf.graph
    });
});

app.post('/api/runs', (req, res) => {
    const { workflowId, inputs } = req.body;
    const wf = getWorkflow(workflowId);
    if (!wf) return res.status(404).json({ error: "Not found" });

    const runId = `run_${Date.now()}`;
    startRun(wf, runId, wss, inputs);

    res.json({ runId });
});

// Control endpoints
app.post('/api/runs/:runId/pause', (req, res) => {
    const { runId } = req.params;
    const success = runManager.pauseRun(runId);

    if (success) {
        res.json({ success: true, message: 'Run paused' });
    } else {
        res.status(404).json({ error: 'Run not found or already completed' });
    }
});

app.post('/api/runs/:runId/resume', (req, res) => {
    const { runId } = req.params;
    const success = runManager.resumeRun(runId);

    if (success) {
        res.json({ success: true, message: 'Run resumed' });
    } else {
        res.status(404).json({ error: 'Run not found or already completed' });
    }
});

app.post('/api/runs/:runId/cancel', (req, res) => {
    const { runId } = req.params;
    const success = runManager.cancelRun(runId);

    if (success) {
        res.json({ success: true, message: 'Run cancelled' });
    } else {
        res.status(404).json({ error: 'Run not found or already completed' });
    }
});

app.get('/api/runs/:runId/state', (req, res) => {
    const { runId } = req.params;
    const state = runManager.getRunState(runId);

    if (state) {
        res.json(state);
    } else {
        res.status(404).json({ error: 'Run not found or already completed' });
    }
});

app.get('/api/runs/active', (req, res) => {
    const activeRuns = runManager.getAllActiveRuns();
    res.json(activeRuns);
});

// Start Server
const PORT = 3000;
server.listen(PORT, async () => {
    console.log(`Daemon running on http://localhost:${PORT}`);
    console.log(`Watching workspace: ${WORKSPACE_ROOT}`);

    // Initial discovery
    await discoverWorkflows(WORKSPACE_ROOT).catch(console.error);

    // Watch for file changes
    const watcher = chokidar.watch('.', {
        cwd: WORKSPACE_ROOT,
        ignoreInitial: true,
        ignored: '**/node_modules/**',
        usePolling: true,
        interval: 500
    });

    const broadcastUpdate = () => {
        wss.clients.forEach(client => {
            if (client.readyState === 1) { // OPEN
                client.send(JSON.stringify({ type: 'workflow:list_update' }));
            }
        });
    };

    watcher.on('add', async (filePath) => {
        if (!filePath.endsWith('.forge.ts')) return;
        const fullPath = path.resolve(WORKSPACE_ROOT, filePath);
        console.log(`File added: ${fullPath}`);
        await reloadWorkflow(fullPath, WORKSPACE_ROOT);
        broadcastUpdate();
    });

    watcher.on('change', async (filePath) => {
        if (!filePath.endsWith('.forge.ts')) return;
        const fullPath = path.resolve(WORKSPACE_ROOT, filePath);
        console.log(`File changed: ${fullPath}`);
        await reloadWorkflow(fullPath, WORKSPACE_ROOT);
        broadcastUpdate();
    });

    watcher.on('unlink', (filePath) => {
        if (!filePath.endsWith('.forge.ts')) return;
        const fullPath = path.resolve(WORKSPACE_ROOT, filePath);
        console.log(`File removed: ${fullPath}`);
        removeWorkflow(fullPath, WORKSPACE_ROOT);
        broadcastUpdate();
    });

    // Serve UI
    // In production/monorepo dev, we assume standard layout
    try {
        const uiDist = path.resolve(fileURLToPath(import.meta.url), '../../../ui/dist');
        app.use(express.static(uiDist));

        // SPA fallback
        app.get('*', (req, res) => {
            res.sendFile(path.join(uiDist, 'index.html'));
        });

        console.log(`Open in browser: http://localhost:${PORT}`);
        // await open(`http://localhost:${PORT}`);
    } catch (e) {
        console.warn("Failed to serve UI:", e);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log("\nStopping daemon...");
    server.close(() => {
        console.log("Daemon stopped.");
        process.exit(0);
    });
    // Force close if it takes too long
    setTimeout(() => {
        console.error("Forcing shutdown...");
        process.exit(0);
    }, 1000);
});
