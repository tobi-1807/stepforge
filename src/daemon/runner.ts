import { fileURLToPath } from "url";
import { spawn } from "child_process";
import path from "path";
import { WebSocketServer } from "ws";
import { runManager } from "./run-manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startRun(
  wf: any,
  runId: string,
  wss: WebSocketServer,
  inputs?: Record<string, any>
) {
  // Robust path resolution
  // Check if we are running from dist (prod) or src (dev)
  const isProd = __dirname.includes(path.sep + 'dist' + path.sep);
  const projectRoot = path.resolve(__dirname, "../../");

  const childPath = isProd
    ? path.resolve(projectRoot, "dist/runner/index.js")
    : path.resolve(projectRoot, "src/runner/index.ts");

  const runnerCmd = isProd ? "node" : "tsx";
  const runnerArgs = isProd ? [childPath] : ["tsx", childPath];

  // Broadcast helper
  const broadcast = (data: any) => {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(msg);
      }
    });
  };

  // Initial event
  broadcast({ type: "run:start", runId, workflowId: wf.id });

  // Spawn runner
  const inputsJson = inputs ? JSON.stringify(inputs) : "{}";
  const child = spawn(
    isProd ? "node" : "npx",
    [
      ... (isProd ? [] : ["tsx"]),
      childPath,
      process.cwd(),
      wf.filePath,
      wf.id,
      runId,
      wf.version,
      inputsJson,
    ],
    {
      env: { ...process.env, STEPFORGE_MODE: "run", FORCE_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  console.log(`Spawned ${runnerCmd} runner for ${runId} (pid ${child.pid})`);

  // Register run with manager
  runManager.registerRun(runId, wf.id, child);

  let buffer = "";

  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line

    for (const line of lines) {
      if (line.startsWith("__SF_EVENT__ ")) {
        const jsonStr = line.substring("__SF_EVENT__ ".length);
        try {
          const event = JSON.parse(jsonStr);
          broadcast(event);

          // Update run state if it's a control state event
          if (event.type === "run:control_state" && event.state) {
            runManager.updateRunState(runId, event.state);
          }
        } catch (e) {
          console.error("Failed to parse event:", jsonStr);
        }
      } else {
        // Normal log from child? We can capture it or ignore
        console.log(`[Runner Log]: ${line} `);
      }
    }
  });

  child.stderr.on("data", (chunk) => {
    console.error(`[Runner Log]: ${chunk.toString()} `);
  });

  child.on("close", (code) => {
    console.log(`Run ${runId} completed with code ${code} `);
    broadcast({ type: "run:end", runId, code });
    runManager.unregisterRun(runId);
  });
}
