# Stepforge

**Stepforge** is a code-first workflow runner for developers.

It lets you define operational workflows in **TypeScript**, visualize the steps as a graph, and run them from a local UI with live progress, logs, and status.

Workflows are written as normal async code. The structure is inferred and rendered automatically. No YAML. No visual editors. Code is the source of truth.

---

## What problem does Stepforge solve?

Engineers often rely on ad-hoc scripts and runbooks to:

- test integrations
- orchestrate AWS services
- run operational or setup tasks

These scripts are hard to observe and harder to debug. Existing workflow tools usually require translating working code into configuration or rigid orchestration systems.

Stepforge runs scripts **like workflows**, without turning them into systems.

---

## How it works (high level)

Stepforge consists of three parts, shipped as a single package:

### 1. Workflow definition (TypeScript)

Developers write workflows in `.forge.ts` files using a small SDK:

```ts
export default defineWorkflow({
  name: "Example",
  build: (wf) => {
    wf.step("First step", async (ctx) => { ... });
    wf.step("Second step", async (ctx) => { ... });
  }
});
```

Steps are declared in code. No separate graph definition is required.

### 2. Local daemon (planning + orchestration)

When you run:

```bash
stepforge ./workflows
```

Stepforge:

- scans the directory for \*.forge.ts files

- loads workflows in plan mode to build a static step graph

- serves a local UI

- starts workflow runs on demand

The graph is generated before execution and reused during runs.

### 3. Runner (execution + events)

When a workflow is run:

- it executes in an isolated Node.js process
- steps emit structured runtime events (start, logs, progress, end)
- events are streamed back to the UI in real time

Node IDs are stable, so execution events map directly to the pre-built graph.

---

## Key design principles

- **Code is the source of truth**
- **Graphs are derived, never authored**
- **Execution is observable by default**
- **No side effects at import time**
- **Local-first, developer-friendly**

---

## Status

Stepforge is currently an experimental project.
The architecture is intentionally simple and designed to evolve toward:

- resumable runs
- parameterized workflows
- parallel execution
