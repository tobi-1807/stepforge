import { defineWorkflow } from "../src/sdk/index.js";

export default defineWorkflow({
  name: "AWS Deployment Pipeline",
  inputs: [
    {
      name: "environment",
      type: "string",
      label: "Environment",
      description: "Target deployment environment",
      required: true,
      default: "staging",
    },
    {
      name: "region",
      type: "string",
      label: "AWS Region",
      description: "AWS region for deployment",
      required: true,
      default: "us-east-1",
    },
    {
      name: "instanceCount",
      type: "number",
      label: "Instance Count",
      description: "Number of EC2 instances to deploy",
      required: false,
      default: 2,
    },
    {
      name: "enableMonitoring",
      type: "boolean",
      label: "Enable CloudWatch Monitoring",
      description: "Enable detailed CloudWatch monitoring",
      required: false,
      default: true,
    },
  ] as const,
  build: (wf) => {
    wf.step(
      "Validate Configuration",
      async (ctx) => {
        // ctx.inputs is strongly typed - no casts needed
        const env = ctx.inputs.environment;
        const region = ctx.inputs.region;
        const count = ctx.inputs.instanceCount;
        const monitoring = ctx.inputs.enableMonitoring;

        ctx.log.info(`Deploying to ${env} in ${region}`);
        ctx.log.info(`Instance count: ${count}`);
        ctx.log.info(`Monitoring enabled: ${monitoring}`);

        await new Promise((r) => setTimeout(r, 1000));
      },
      {
        description: "Validates deployment configuration and parameters",
        tags: ["validation", "config"],
        aws: { service: "Config" },
      }
    );

    wf.group(
      "Infrastructure Setup",
      (g) => {
        g.step(
          "Create VPC",
          async (ctx) => {
            const region = ctx.inputs.region;
            ctx.log.info(`Creating VPC in ${region}...`);
            await new Promise((r) => setTimeout(r, 1500));
            ctx.log.info("VPC created successfully");
          },
          {
            description: "Creates a new VPC with public and private subnets",
            tags: ["networking", "infrastructure"],
            aws: { service: "VPC" },
          }
        );

        g.step(
          "Configure Security Groups",
          async (ctx) => {
            ctx.log.info("Setting up security groups...");
            await new Promise((r) => setTimeout(r, 1000));
            ctx.log.info("Security groups configured");
          },
          {
            description:
              "Configures security groups for application and database tiers",
            tags: ["security", "networking"],
            aws: { service: "EC2" },
          }
        );
      },
      {
        description: "Sets up core infrastructure components",
      }
    );

    wf.step(
      "Deploy Application",
      async (ctx) => {
        const count = ctx.inputs.instanceCount;
        const env = ctx.inputs.environment;

        ctx.log.info(`Deploying ${count} instances to ${env}...`);
        await new Promise((r) => setTimeout(r, 2000));
        ctx.progress({ deployed: count, total: count });
        ctx.log.info("Application deployed successfully");
      },
      {
        description: "Deploys application to EC2 instances using Auto Scaling",
        tags: ["deployment", "compute"],
        aws: { service: "EC2" },
      }
    );

    wf.step(
      "Setup Monitoring",
      async (ctx) => {
        const monitoring = ctx.inputs.enableMonitoring;

        if (monitoring) {
          ctx.log.info("Configuring CloudWatch dashboards...");
          await new Promise((r) => setTimeout(r, 1500));
          ctx.log.info("Monitoring configured");
        } else {
          ctx.log.warn("Monitoring disabled, skipping setup");
        }
      },
      {
        description: "Configures CloudWatch monitoring and alarms",
        tags: ["monitoring", "observability"],
        aws: { service: "CloudWatch" },
      }
    );

    wf.step(
      "Run Health Checks",
      async (ctx) => {
        ctx.log.info("Running health checks...");
        await new Promise((r) => setTimeout(r, 2000));
        ctx.log.info("All health checks passed ✓");
      },
      {
        description: "Validates deployment health and connectivity",
        tags: ["validation", "health-check"],
      }
    );
  },
});
