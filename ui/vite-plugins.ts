import fs from 'fs'
import path from 'path'
import http from 'http'
import { Plugin } from 'vite'

const getDaemonPort = (root: string) => {
    const daemonPortFile = path.resolve(root, '.daemon-port');
    if (fs.existsSync(daemonPortFile)) {
        try {
            return parseInt(fs.readFileSync(daemonPortFile, 'utf-8').trim(), 10);
        } catch (e) { }
    }
    return 3000; // default fallback
}

/**
 * Writes Vite's own port to a .vite-port file for the daemon to discover.
 */
export function writePortFile(): Plugin {
    return {
        name: 'write-port-file',
        configureServer(server) {
            server.httpServer?.once('listening', () => {
                const address = server.httpServer?.address();
                if (address && typeof address !== 'string') {
                    const root = server.config.root;
                    // Go up one level from 'ui' to project root if needed
                    const portFile = path.resolve(root, '../.vite-port');
                    fs.writeFileSync(portFile, address.port.toString());
                    console.log(`[Vite] Port ${address.port} written to ${portFile}`);
                }
            });
        }
    };
}

/**
 * Dynamically proxies /api and /ws requests to the daemon by reading .daemon-port on each request.
 */
export function dynamicDaemonProxy(): Plugin {
    return {
        name: 'dynamic-daemon-proxy',
        configureServer(server) {
            const root = server.config.root;

            // Dynamic API Proxy Middleware
            server.middlewares.use((req, res, next) => {
                if (req.url?.startsWith('/api')) {
                    const port = getDaemonPort(path.resolve(root, '..'));
                    const proxyReq = http.request({
                        host: 'localhost',
                        port: port,
                        path: req.url,
                        method: req.method,
                        headers: req.headers
                    }, (proxyRes) => {
                        res.writeHead(proxyRes.statusCode!, proxyRes.headers);
                        proxyRes.pipe(res);
                    });
                    proxyReq.on('error', () => {
                        res.statusCode = 502;
                        res.end(`Daemon not reachable on port ${port}`);
                    });
                    req.pipe(proxyReq);
                    return;
                }
                next();
            });

            // Dynamic WebSocket Proxy
            server.httpServer?.on('upgrade', (req, socket, head) => {
                if (req.url?.startsWith('/ws')) {
                    const port = getDaemonPort(path.resolve(root, '..'));
                    const proxyReq = http.request({
                        host: 'localhost',
                        port: port,
                        path: req.url,
                        method: 'GET',
                        headers: {
                            'Connection': 'Upgrade',
                            'Upgrade': 'websocket',
                            ...req.headers
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
                }
            });
        }
    };
}
