import { workflow, inputs } from "../src/sdk/index.js";

export default workflow(
  "Output Demo",
  inputs([{ name: "count", type: "number", label: "Count", default: 3 }]),
  (wf) => {
    wf.step("Step with Output", async (ctx) => {
      const result = {
        message: "Hello from Stepforge!",
        timestamp: new Date().toISOString(),
        success: true,
        metadata: {
          user: "Tobi",
          environment: "development",
        },
      };
      ctx.output(result);
      ctx.log.info("Emitted output from Step with Output");
    });

    wf.map(
      "Map with Outputs",
      {
        items: (ctx) =>
          Array.from({ length: ctx.inputs.count }, (_, i) => i + 1),
        key: (item) => `item-${item}`,
      },
      (loop) => {
        loop.step("Process Item", async (ctx) => {
          await ctx.sleep(500);
          ctx.output({
            processedItem: ctx.loop.item,
            index: ctx.loop.index,
            cube: ctx.loop.item ** 3,
          });
        });
      }
    );

    wf.step("Large Output Step", async (ctx) => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        random: Math.random(),
      }));
      ctx.output(largeData);
    });
  }
);
