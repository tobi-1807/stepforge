/**
 * Example workflow template for new users.
 */
export const exampleWorkflowTemplate = `import { workflow, inputs } from "stepforge";

/**
 * My First Workflow
 *
 * This is a simple example workflow that demonstrates the basics of Stepforge.
 * Edit this file and save to see hot-reload in action!
 */
export default workflow(
  "Hello World",
  inputs([
    {
      name: "greeting",
      type: "string",
      label: "Greeting message",
      description: "What should we say?",
      default: "Hello from Stepforge!",
    },
  ]),
  (wf) => {
    wf.step("Say hello", async (ctx) => {
      const message = ctx.inputs.greeting;
      ctx.log.info(message);
      await new Promise((r) => setTimeout(r, 500));
      ctx.log.info("Step completed!");
    });

    wf.step("Do some work", async (ctx) => {
      ctx.log.info("Working...");
      await new Promise((r) => setTimeout(r, 1000));
      ctx.log.info("Work done!");
    });

    wf.step("Finish up", async (ctx) => {
      ctx.log.info("Cleaning up...");
      await new Promise((r) => setTimeout(r, 500));
      ctx.log.info("All done! 🎉");
    });
  }
);
`;

