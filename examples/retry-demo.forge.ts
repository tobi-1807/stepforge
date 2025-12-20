import { workflow } from "../src/sdk/index.js";

export default workflow("Retry Demo", (wf) => {
    wf.step("Standard Retry", async (ctx) => {
        ctx.log.info(`Attempt ${ctx.attempt}/${ctx.maxAttempts}`);
        if (ctx.attempt < 3) {
            throw new Error(`Intentional failure (attempt ${ctx.attempt})`);
        }
        ctx.log.info("Success on attempt 3!");
    }, { retry: { maxAttempts: 3, backoffMs: 500 } });

    wf.map("Map Retry", {
        items: () => [1, 2],
        key: (item) => `item-${item}`
    }, (loop) => {
        loop.step("Conditional Fail", async (ctx) => {
            const item = ctx.loop.item;
            if (item === 2) {
                ctx.log.info(`Item 2 attempt ${ctx.attempt}/${ctx.maxAttempts}`);
                if (ctx.attempt < 2) {
                    throw new Error("Item 2 temporary failure");
                }
                ctx.log.info("Item 2 succeeded on retry");
            } else {
                ctx.log.info(`Item ${item} succeeded first try`);
            }
        }, { retry: { maxAttempts: 2, backoffMs: 500 } });
    });
});
