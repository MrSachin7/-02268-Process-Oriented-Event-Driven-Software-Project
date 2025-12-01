import { Camunda8 } from "@camunda8/sdk";
import {
  createCase,
  executeEvent,
  finishCase as finishDcrCase,
} from "../dcr/helpers/dcr_helpers.js";
import { logSiddhi } from "../dcr/helpers/dcr_logger.js";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "trigger-scheduling",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const turbineID = job.variables.turbineID as string;
    const workOrderID = job.variables.workOrderID as string;

    logSiddhi({
      event: {
        turbineId: turbineID,
        workOrderId: workOrderID,
      },
    });

    try {
      // 1️⃣ CREATE DCR CASE
      const caseId = await createCase(turbineID, "Maintenance Work Order");
      if (!caseId) {
        console.error("❌ Failed to create DCR case");
        return job.complete();
      }

      // 2️⃣ EXECUTE FIRST EVENT (A1)
      const firstEventId = process.env.DCR_START_EVENT_ID || "A1";
      await executeEvent(caseId, firstEventId);

      // 3️⃣ PROCESS CASE AUTOMATICALLY
      await finishDcrCase(caseId);
    } catch (error) {
      console.error("❌ Error processing DCR case:", error);
    }

    return job.complete();
  },
});

console.log("✓ trigger-scheduling worker initialized");
