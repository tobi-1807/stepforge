import { workflow } from "../src/sdk/index.js";

export default workflow("S3 Smoke Test", (wf) => {
  wf.group("Setup", (g) => {
    g.step("Create bucket", async (ctx) => {
      ctx.log.info("Creating bucket stepforge-test-bucket...");
      await new Promise((r) => setTimeout(r, 1000));
      ctx.log.info("Bucket created");
    });
    g.step("Upload file", async (ctx) => {
      ctx.log.info("Uploading test payload...");
      await new Promise((r) => setTimeout(r, 1500));
      ctx.progress({ uploaded: "100%" });
    });
  });

  wf.step("Verify Download", async (ctx) => {
    ctx.log.info("Verifying consistency...");
    await new Promise((r) => setTimeout(r, 2000));
  });

  wf.step("Cleanup", async (ctx) => {
    ctx.log.warn("Deleting bucket");
    await new Promise((r) => setTimeout(r, 500));
  });
});
