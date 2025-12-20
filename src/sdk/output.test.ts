import { describe, it, expect, vi } from "vitest";
import { workflow, executeWorkflow } from "./index.js";

describe("ctx.output", () => {
    it("should emit node:output event for regular steps", async () => {
        const onEvent = vi.fn();
        const wf = workflow("test", (wf) => {
            wf.step("Step 1", async (ctx) => {
                ctx.output({ result: 42 });
            });
        });

        await executeWorkflow(wf, "1.0.0", {
            runId: "run-1",
            onEvent,
        });

        expect(onEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "node:output",
                nodeId: expect.any(String),
                nodeTitle: "Step 1",
                runId: "run-1",
                data: { result: 42 },
                at: expect.any(String),
            })
        );
    });

    it("should emit node:output event with map metadata for map iterations", async () => {
        const onEvent = vi.fn();
        const wf = workflow("test", (wf) => {
            wf.map(
                "Map 1",
                { items: () => [1] },
                (item, index, loop) => {
                    loop.step("Process", async (ctx) => {
                        ctx.output({ item: ctx.loop.item });
                    });
                }
            );
        });

        await executeWorkflow(wf, "1.0.0", {
            runId: "run-1",
            onEvent,
        });

        expect(onEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "node:output",
                nodeId: expect.any(String),
                nodeTitle: "Process",
                runId: "run-1",
                mapNodeId: expect.any(String),
                iterationId: expect.any(String),
                data: { item: 1 },
                at: expect.any(String),
            })
        );
    });
});
