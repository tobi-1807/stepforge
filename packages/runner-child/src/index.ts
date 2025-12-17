import { pathToFileURL } from "url";
import { WorkflowDefinition, RunControlSignal } from "@stepforge/sdk";
import * as readline from "readline";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 5) {
    console.error(
      "Usage: runner <workspaceRoot> <workflowFile> <workflowId> <runId> <version> [inputs]"
    );
    process.exit(1);
  }

  const [
    workspaceRoot,
    workflowFile,
    workflowId,
    runId,
    version,
    inputsJson = "{}",
  ] = args;
  const inputs = JSON.parse(inputsJson);

  // Control signal state
  let currentSignal: RunControlSignal | null = null;

  // Setup stdin listener for control signals
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on("line", (line) => {
    try {
      const msg = JSON.parse(line);
      if (msg.type === "control" && msg.signal) {
        currentSignal = msg.signal as RunControlSignal;
        console.error(`[Control] Received signal: ${currentSignal}`);
      }
    } catch (e) {
      // Ignore parse errors
    }
  });

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
    const { executeWorkflow } = await import("@stepforge/sdk");

    // Safety check for version
    if (!version) {
      console.error("Missing version argument");
      process.exit(1);
    }

    await executeWorkflow(def, version, {
      runId,
      onEvent: emit,
      inputs,
      getControlSignal: () => currentSignal,
      onControlStateChange: (state) => {
        emit({ type: "run:control_state", state });
      },
    });

    // Close readline and exit on success
    rl.close();
    process.exit(0);
  } catch (e: any) {
    console.error(e);
    rl.close();
    process.exit(1);
  }
}

main();
