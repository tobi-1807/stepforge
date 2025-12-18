import { defineWorkflow } from "@stepforge/sdk";

/**
 * Example workflow demonstrating wf.map() - the map/loop construct.
 *
 * This workflow processes a list of items sequentially, with template steps
 * rendered once in the graph but executed for each item at runtime.
 */
export default defineWorkflow({
  name: "Map Example - Process Items",
  inputs: [
    {
      name: "itemCount",
      type: "number",
      label: "Number of items to process",
      description: "How many items should be generated and processed",
      default: 5,
    },
  ],
  build: (wf) => {
    // Step 1: Generate items to process
    wf.step("Generate items", async (ctx) => {
      const count = ctx.run.get<number>("itemCount") ?? 5;
      const items = Array.from({ length: count }, (_, i) => ({
        id: `item-${i + 1}`,
        value: Math.floor(Math.random() * 100),
      }));

      ctx.log.info(`Generated ${items.length} items`);
      ctx.run.set("items", items);
    });

    // Step 2: Map over items - processes each item sequentially
    wf.map(
      "Process items",
      {
        items: (ctx) =>
          ctx.run.require<Array<{ id: string; value: number }>>("items"),
        key: (item) => item.id,
        onError: "fail-fast",
      },
      (item, index, loop) => {
        // Template step 1: Validate item
        loop.step("Validate", async (ctx) => {
          ctx.log.info(`Validating ${ctx.loop?.key}...`);
          await new Promise((r) => setTimeout(r, 200)); // Simulate work

          // Simulate occasional validation failures
          if (ctx.loop?.item && (ctx.loop.item as any).value < 10) {
            throw new Error(
              `Item ${ctx.loop.key} has value too low: ${
                (ctx.loop.item as any).value
              }`
            );
          }

          ctx.log.info(`${ctx.loop?.key} validated successfully`);
        });

        // Template step 2: Process item
        loop.step("Process", async (ctx) => {
          ctx.log.info(`Processing ${ctx.loop?.key}...`);
          await new Promise((r) => setTimeout(r, 300)); // Simulate work

          const item = ctx.loop?.item as { id: string; value: number };
          const result = item.value * 2;
          ctx.log.info(
            `${ctx.loop?.key} processed: ${item.value} -> ${result}`
          );
        });

        // Template step 3: Save result
        loop.step("Save result", async (ctx) => {
          ctx.log.info(`Saving result for ${ctx.loop?.key}...`);
          await new Promise((r) => setTimeout(r, 2000)); // Simulate work
          ctx.log.info(`${ctx.loop?.key} saved`);
        });
      }
    );

    // Step 3: Summarize
    wf.step("Summarize", async (ctx) => {
      ctx.log.info("All items processed successfully!");
    });
  },
});
