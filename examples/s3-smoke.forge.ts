import { workflow } from "../src/sdk/index.js";

export default workflow("S3 Smoke Test", (wf) => {
  wf.group("Setup", (g) => {
    g.step("Create bucket", async (ctx) => {
      ctx.log.info("Creating bucket stepforge-test-bucket...");
      await ctx.sleep(1000);
      ctx.log.info("Bucket created");
    });
    g.step("Upload file", async (ctx) => {
      ctx.log.info("Uploading test payload...");
      await ctx.sleep(1500);
      ctx.progress({ uploaded: "100%" });
    });
  });

  wf.check("Verify Download", async (ctx) => {
    ctx.log.info("Verifying consistency...");
    await ctx.sleep(2000);
    return false;
  });

  wf.step("Cleanup", async (ctx) => {
    ctx.log.warn("Deleting bucket");
    await ctx.sleep(500);
  });
});
