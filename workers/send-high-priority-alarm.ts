import { Camunda8 } from "@camunda8/sdk";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "send-high-priority-alarm",

  taskHandler: async (job) => {
    const turbineID = job.variables.turbineID as string;
    const ttfScore = job.variables.ttfScore;

    console.log("\n");
    console.log(
      "╔═══════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║                                                               ║"
    );
    console.log(
      "║   🚨🚨🚨  HIGH PRIORITY ALARM  🚨🚨🚨                          ║"
    );
    console.log(
      "║                                                               ║"
    );
    console.log(
      "║   ⚠️  CRITICAL TURBINE FAILURE PREDICTION DETECTED  ⚠️        ║"
    );
    console.log(
      "║                                                               ║"
    );
    console.log(
      "╠═══════════════════════════════════════════════════════════════╣"
    );
    console.log(`║   Turbine ID: ${turbineID}`.padEnd(64) + "║");
    console.log(`║   TTF Score: ${ttfScore}`.padEnd(64) + "║");
    console.log(
      "║                                                               ║"
    );
    console.log(
      "║   IMMEDIATE ACTION REQUIRED!                                  ║"
    );
    console.log(
      "║   Maintenance work must be scheduled urgently.                ║"
    );
    console.log(
      "║                                                               ║"
    );
    console.log(
      "╚═══════════════════════════════════════════════════════════════╝"
    );
    console.log("\n");

    return job.complete();
  },
});

console.log("✓ send-high-priority-alarm worker initialized");
