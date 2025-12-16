import { defineWorkflow } from '@stepforge/sdk';

export default defineWorkflow({
    name: "Shared State Verification",
    build: (wf) => {
        wf.step("Set Token", async (ctx) => {
            const token = "verified-token-123";
            ctx.run.set("token", token);
            ctx.log.info(`Set token: ${token}`);
        });

        wf.step("Read Token", async (ctx) => {
            const token = ctx.run.require<string>("token");
            ctx.log.info(`Required token: ${token}`);
            if (token !== "verified-token-123") {
                throw new Error(`Token mismatch! Expected verified-token-123, got ${token}`);
            }
        });

        wf.step("Optional Token", async (ctx) => {
            const missing = ctx.run.get<string>("missing");
            if (missing !== undefined) {
                throw new Error("Expected undefined for missing key");
            }
            ctx.log.info("Correctly handled missing key");
        });
    }
});
