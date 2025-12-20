import { workflow } from "../src/sdk/index.js";

export default workflow("Onsite Prediction", (wf) => {
  wf.step("Start PW SM", async (ctx) => {
    ctx.log.info("Creating bucket stepforge-test-bucket...");
    await ctx.sleep(1000);
  });

  wf.step("Waiting for hole 16", async (ctx) => {
    ctx.log.info("Waiting for hole 16...");
    await ctx.sleep(3000);
  });

  wf.step("Resume SM", async (ctx) => {
    const taskToken = "dummy-task-token";
    ctx.log.info(`Found task token ${taskToken}`);
    await ctx.sleep(2000);
  });

  wf.step("Waiting for PW SM to finish", async (ctx) => {
    ctx.log.info("Waiting for 70 seconds...");
    await ctx.sleep(70000);
    ctx.log.info("PW SM finished");
  });
});
