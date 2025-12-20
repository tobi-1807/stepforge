import { workflow } from "../src/sdk/index.js";

/**
 * Example workflow demonstrating wf.map() - the map/loop construct.
 *
 * This workflow processes a list of items sequentially, with template steps
 * rendered once in the graph but executed for each item at runtime.
 *
 * Demonstrates:
 * - ctx.inputs for accessing user-provided configuration
 * - ctx.run for computed values shared between steps
 * - ctx.iteration for per-iteration scratch space within map template steps
 */
export default workflow(
  "Map Example - Process Items",
  [
    {
      name: "itemCount",
      type: "number",
      label: "Number of items to process",
      description: "How many items should be generated and processed",
      default: 5,
    },
  ] as const,
  (wf) => {
    // Step 1: Generate items to process
    wf.step("Generate items", async (ctx) => {
      // ctx.inputs.itemCount is `number` — default is applied by runtime
      const count = ctx.inputs.itemCount;
      const items = Array.from({ length: count }, (_, i) => ({
        id: `item-${i + 1}`,
        value: Math.floor(Math.random() * 100),
      }));

      ctx.log.info(`Generated ${items.length} items`);
      // Use ctx.run for computed values shared between steps
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
          ctx.log.info(`Validating ${ctx.loop.key}...`);
          await new Promise((r) => setTimeout(r, 200)); // Simulate work

          const currentItem = ctx.loop.item as { id: string; value: number };

          // Simulate occasional validation failures
          if (currentItem && currentItem.value < 10) {
            throw new Error(
              `Item ${ctx.loop.key} has value too low: ${currentItem.value}`
            );
          }

          // Store computed value in iteration-scoped scratch space
          // This avoids polluting global ctx.run with per-iteration noise
          const doubledValue = currentItem.value * 2;
          ctx.iteration.set("doubledValue", doubledValue);

          ctx.log.info(
            `${ctx.loop.key} validated successfully, doubled: ${doubledValue}`
          );
        });

        // Template step 2: Process item
        loop.step("Process", async (ctx) => {
          ctx.log.info(`Processing ${ctx.loop.key}...`);
          await new Promise((r) => setTimeout(r, 300)); // Simulate work

          // Retrieve computed value from iteration store (no need to re-derive)
          const doubledValue = ctx.iteration.require<number>("doubledValue");
          ctx.log.info(
            `${ctx.loop.key} processed with pre-computed value: ${doubledValue}`
          );
        });

        // Template step 3: Save result
        loop.step("Save result", async (ctx) => {
          ctx.log.info(`Saving result for ${ctx.loop.key}...`);
          await new Promise((r) => setTimeout(r, 2000)); // Simulate work
          ctx.log.info(`${ctx.loop.key} saved`);
        });
      }
    );

    // Step 3: Summarize
    wf.step("Summarize", async (ctx) => {
      ctx.log.info("All items processed successfully!");
    });
  }
);
