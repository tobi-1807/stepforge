import { describe, it, expect, vi } from "vitest";
import { workflow, executeWorkflow } from "./index.js";

describe("ctx.sleep", () => {
    it("should wait for the specified duration", async () => {
        const wf = workflow("Sleep Test", (wf) => {
            wf.step("Step 1", async (ctx) => {
                const start = Date.now();
                await ctx.sleep(100);
                const end = Date.now();
                expect(end - start).toBeGreaterThanOrEqual(100);
            });
        });

        await executeWorkflow(wf, "1.0.0", {
            runId: "test-run",
            onEvent: () => { },
        });
    });

    it("should be cancellable", async () => {
        let cancelledError: any = null;
        let signal: "cancel" | null = null;

        const wf = workflow("Cancellation Test", (wf) => {
            wf.step("Step 1", async (ctx) => {
                try {
                    await ctx.sleep(1000);
                } catch (e) {
                    cancelledError = e;
                    throw e;
                }
            });
        });

        const promise = executeWorkflow(wf, "1.0.0", {
            runId: "test-run",
            onEvent: () => { },
            getControlSignal: () => signal,
        });

        // Trigger cancellation after a short delay
        setTimeout(() => {
            signal = "cancel";
        }, 100);

        await expect(promise).rejects.toThrow("Cancelled");
        expect(cancelledError?.message).toBe("Cancelled");
    });

    it("should respect pause", async () => {
        let signal: "pause" | "resume" | null = null;
        let resumeTime: number = 0;

        const wf = workflow("Pause Test", (wf) => {
            wf.step("Step 1", async (ctx) => {
                await ctx.sleep(200);
            });
        });

        const start = Date.now();
        const promise = executeWorkflow(wf, "1.0.0", {
            runId: "test-run",
            onEvent: (evt) => {
                if (evt.type === "run:paused") {
                    setTimeout(() => {
                        signal = "resume";
                        resumeTime = Date.now();
                    }, 200);
                }
            },
            getControlSignal: () => signal,
        });

        // Trigger pause shortly after start
        setTimeout(() => {
            signal = "pause";
        }, 50);

        await promise;
        const totalTime = Date.now() - start;

        // The sleep was 200ms. We paused for 200ms (after 50ms).
        // So we resumed at 250ms. At that point, the 200ms sleep should already be "over".
        // So it should finish very soon after resume.
        expect(totalTime).toBeGreaterThanOrEqual(250);
        expect(totalTime).toBeLessThan(400); // Should not have waited AGAIN
    });
});
