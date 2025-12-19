import { defineWorkflow } from "../src/sdk/index.js";

export default defineWorkflow({
    name: "Onsite Prediction",
    build: (wf) => {
        wf.step("Start PW SM", async (ctx) => {
            ctx.log.info("Creating bucket stepforge-test-bucket...");
            await new Promise(r => setTimeout(r, 1000));
        });

        wf.step("Waiting for hole 16", async (ctx) => {
            ctx.log.info("Waiting for hole 16...");
            await new Promise(r => setTimeout(r, 3000));
        });

        wf.step("Resume SM", async (ctx) => {
            const taskToken = "dummy-task-token";
            ctx.log.info(`Found task token ${taskToken}`);
            await new Promise(r => setTimeout(r, 2000));
        });

        wf.step("Waiting for PW SM to finish", async (ctx) => {
            ctx.log.info("Waiting for 70 seconds...");
            await new Promise(r => setTimeout(r, 70000));
            ctx.log.info("PW SM finished");
        });
    }
});
