#!/usr/bin/env node
import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import { discoverWorkflows, getWorkflow, reloadWorkflow, removeWorkflow } from './discovery.js';
import { startRun } from './runner.js';
import { runManager } from './run-manager.js';
import { exampleWorkflowTemplate } from './example-workflow.js';

const DEFAULT_PORT = 3000;
const MAX_PORT_ATTEMPTS = 10;

// Parse CLI arguments
function parseArgs(args: string[]): { workspaceDir: string | null; port: number; portExplicit: boolean } {
    let workspaceDir: string | null = null;
    let port = DEFAULT_PORT;
    let portExplicit = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--port' || arg === '-p') {
            const portArg = args[++i];
            if (portArg) {
                port = parseInt(portArg, 10);
                portExplicit = true;
                if (isNaN(port) || port < 0 || port > 65535) {
                    console.error(`Invalid port: ${portArg}`);
                    process.exit(1);
                }
            }
        } else if (!arg.startsWith('-')) {
            workspaceDir = arg;
        }
    }

    return { workspaceDir, port, portExplicit };
}

const { workspaceDir: workspaceArg, port: requestedPort, portExplicit } = parseArgs(process.argv.slice(2));

if (!workspaceArg) {
    console.error("Please specify a workspace directory");
    console.error("Usage: stepforge <workspace-directory> [--port <port>]");
    process.exit(1);
}

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

// WebSocket server setup (noServer: true allows us to handle the upgrade manually for better robustness)
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request: http.IncomingMessage, socket: any, head: Buffer) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);

    if (url.pathname === '/ws' || url.pathname === '/ws/') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else if (isDev && url.pathname === '/vite-hmr') {
        // Proxy Vite HMR WebSocket
        const portFile = path.resolve(cwd, '.vite-port');
        let vitePort = 5173;
        if (fs.existsSync(portFile)) {
            try {
                const savedPort = parseInt(fs.readFileSync(portFile, 'utf-8').trim(), 10);
                if (!isNaN(savedPort)) vitePort = savedPort;
            } catch (e) { }
        }
        if (process.env.VITE_PORT) vitePort = parseInt(process.env.VITE_PORT, 10);

        const proxyReq = http.request({
            host: 'localhost',
            port: vitePort,
            path: request.url,
            method: 'GET',
            headers: {
                'Connection': 'Upgrade',
                'Upgrade': 'websocket',
                ...request.headers
            }
        });

        proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
            socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
                Object.keys(proxyRes.headers).map(h => `${h}: ${proxyRes.headers[h]}\r\n`).join('') +
                '\r\n');

            proxySocket.pipe(socket).pipe(proxySocket);
        });

        proxyReq.on('error', () => {
            socket.destroy();
        });

        proxyReq.end();
    } else {
        // Destroy sockets for other paths to avoid hanging
        socket.destroy();
    }
});

// Resolve relative to where the command was run (INIT_CWD), not the package dir
const cwd = process.env.INIT_CWD || process.cwd();
const WORKSPACE_ROOT = path.resolve(cwd, workspaceArg);

// Broadcast helper (shared across routes and watcher)
const broadcastUpdate = () => {
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
            client.send(JSON.stringify({ type: 'workflow:list_update' }));
        }
    });
};


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

// Create example workflow endpoint
app.post('/api/workflows/create-example', async (req, res) => {
    try {
        // Ensure workspace directory exists
        await fsPromises.mkdir(WORKSPACE_ROOT, { recursive: true });

        // Find a unique filename
        let filename = 'example.forge.ts';
        let filePath = path.join(WORKSPACE_ROOT, filename);
        let counter = 1;

        while (fs.existsSync(filePath)) {
            filename = `example-${counter}.forge.ts`;
            filePath = path.join(WORKSPACE_ROOT, filename);
            counter++;
        }

        // Write the example workflow
        await fsPromises.writeFile(filePath, exampleWorkflowTemplate, 'utf-8');
        console.log(`Created example workflow: ${filePath}`);

        // Reload and broadcast (chokidar will also pick this up, but we do it explicitly for faster feedback)
        const wf = await reloadWorkflow(filePath, WORKSPACE_ROOT);
        broadcastUpdate();

        res.json({
            success: true,
            filename,
            workflowId: wf?.id || null
        });
    } catch (error: any) {
        console.error('Failed to create example workflow:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create example workflow'
        });
    }
});

// Serve UI (register routes before starting server)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In production (dist/daemon/server.js), UI is at ../ui
// In dev (src/daemon/server.ts), UI is at ../../ui/dist (if built)
let uiDist = path.resolve(__dirname, '../ui');
if (!fs.existsSync(uiDist)) {
    uiDist = path.resolve(__dirname, '../../ui/dist');
}

const uiAvailable = fs.existsSync(uiDist);
const isDev = process.env.STEPFORGE_ENV === 'development' || !__dirname.includes('dist');

if (isDev) {
    const portFile = path.resolve(cwd, '.vite-port');

    // In dev mode, we proxy non-API requests to Vite
    app.use((req, res, next) => {
        if (req.path.startsWith('/api') || req.path === '/ws') {
            return next();
        }

        // Determine port on each request in dev mode to handle Vite restarts/port shifts
        let vitePort = 5173;
        if (fs.existsSync(portFile)) {
            try {
                const savedPort = parseInt(fs.readFileSync(portFile, 'utf-8').trim(), 10);
                if (!isNaN(savedPort)) vitePort = savedPort;
            } catch (e) {
                // Ignore errors
            }
        }
        if (process.env.VITE_PORT) {
            vitePort = parseInt(process.env.VITE_PORT, 10);
        }

        // Simple proxy to Vite
        const proxyReq = http.request({
            host: 'localhost',
            port: vitePort,
            path: req.url,
            method: req.method,
            headers: req.headers
        }, (proxyRes) => {
            if (proxyRes.statusCode === 404) {
                // If Vite returns 404, maybe it's not the UI or Vite is down
                return next();
            }
            res.writeHead(proxyRes.statusCode!, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', () => {
            // Fallback to static if Vite is not running
            next();
        });

        req.pipe(proxyReq);
    });
}

if (uiAvailable) {
    app.use(express.static(uiDist));

    // SPA fallback (must be after API routes)
    app.get('*', (req, res) => {
        const indexPath = path.join(uiDist, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send("UI not built. Run 'npm run build' first.");
        }
    });
}

// Start Server with port fallback
async function startServer(port: number, allowFallback: boolean): Promise<number> {
    return new Promise((resolve, reject) => {
        const onError = (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                if (allowFallback && port < requestedPort + MAX_PORT_ATTEMPTS) {
                    // Try next port
                    server.removeListener('error', onError);
                    startServer(port + 1, allowFallback).then(resolve).catch(reject);
                } else {
                    reject(new Error(`Port ${port} is already in use`));
                }
            } else {
                reject(err);
            }
        };

        server.once('error', onError);
        server.listen(port, () => {
            server.removeListener('error', onError);
            resolve(port);
        });
    });
}

// Start the server
startServer(requestedPort, !portExplicit)
    .then(async (actualPort) => {
        console.log(`\n  Stepforge is running!\n`);
        console.log(`  → Local:     http://localhost:${actualPort}`);
        console.log(`  → Workspace: ${WORKSPACE_ROOT}\n`);

        // Write daemon port to file for Vite proxy
        const daemonPortFile = path.resolve(cwd, '.daemon-port');
        try {
            fs.writeFileSync(daemonPortFile, actualPort.toString());
        } catch (e) {
            console.warn(`  ⚠ Failed to write .daemon-port file: ${e}`);
        }

        if (!uiAvailable) {
            console.warn("  ⚠ UI assets not found. Running in API-only mode.");
            console.warn("    Run 'npm run build' to generate UI assets.\n");
        }

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
    })
    .catch((err) => {
        console.error(`\n  Failed to start server: ${err.message}\n`);
        process.exit(1);
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
