import { Camunda8 } from "@camunda8/sdk";
import { pool } from "../db.js";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "send-high-priority-alarm",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const turbineID = job.variables.turbineID;
    console.log(`Sending high-priority alarm for turbine: ${turbineID}`);

    try {
      await pool.execute(
        `INSERT INTO TurbinesTable (turbine_id, status, last_updated) 
         VALUES (?, 'High Priority Alert', NOW())
         ON DUPLICATE KEY UPDATE status = 'High Priority Alert', last_updated = NOW()`,
        [turbineID]
      );

      console.log(`✓ High-priority alarm sent for turbine ${turbineID}`);
    } catch (error) {
      console.error("Error sending high-priority alarm:", error);
    }

    console.log("--------------------------");
    return job.complete();
  },
});

console.log("✓ send-high-priority-alarm worker initialized");
