import { workflow, inputs } from "../src/sdk/index.js";

/**
 * Stepforge Demo Workflow
 *
 * Designed to showcase:
 * - typed inputs
 * - step retries
 * - map / loop with spotlight
 * - checks
 * - clean visual progression
 */
export default workflow(
  "Demo Workflow",
  inputs([
    {
      name: "itemCount",
      type: "number",
      label: "Items to process",
      default: 3,
    },
  ]),
  (wf) => {
    // Step 1: Prepare data
    wf.step("Prepare items", async (ctx) => {
      const count = ctx.inputs.itemCount;

      const items = Array.from({ length: count }, (_, i) => ({
        id: `item-${i + 1}`,
        value: i + 1,
      }));

      ctx.run.set("items", items);
      ctx.log.info(`Prepared ${items.length} items`);
      await ctx.sleep(400);
    });

    // Step 2: Intentional flaky step (shows retry)
    wf.step(
      "Warm up service",
      async (ctx) => {
        ctx.log.info(`Attempt ${ctx.attempt}/${ctx.maxAttempts}`);

        if (ctx.attempt < 2) {
          throw new Error("Service not ready yet");
        }

        ctx.log.info("Service is ready");
      },
      {
        retry: { maxAttempts: 2, backoffMs: 500 },
      }
    );

    // Step 3: Map over items (spotlight shines here)
    wf.map(
      "Process items",
      {
        items: (ctx) =>
          ctx.run.require<Array<{ id: string; value: number }>>("items"),
        key: (item) => item.id,
      },
      (loop) => {
        loop.step("Validate", async (ctx) => {
          ctx.log.info(`Validating ${ctx.loop.key}`);
          await ctx.sleep(300);
          ctx.iteration.set("processedValue", ctx.loop.item.value * 10);
        });

        loop.step("Process", async (ctx) => {
          const value = ctx.iteration.require<number>("processedValue");
          ctx.log.info(`Processed value: ${value}`);
          await ctx.sleep(400);
        });
      }
    );

    // Step 4: Declarative check (compact node)
    wf.check(
      "All items processed",
      (ctx) => {
        const items = ctx.run.require<any[]>("items");
        return items.length === ctx.inputs.itemCount;
      },
      {
        message: "Some items were not processed",
      }
    );

    // Step 5: Finish
    wf.step("Done", async (ctx) => {
      ctx.log.info("Workflow completed successfully 🎉");
      await ctx.sleep(300);
    });
  }
);
