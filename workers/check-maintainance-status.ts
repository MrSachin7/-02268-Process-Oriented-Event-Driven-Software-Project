import { Camunda8 } from "@camunda8/sdk";
import { pool } from "../db.js";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "check-maintainance-status",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const turbineID = job.variables.turbineID;
    console.log(`Checking maintenance status for turbine: ${turbineID}`);

    try {
      // Check if the turbine status is "Under maintainance"
      const [rows] = await pool.execute(
        "SELECT status FROM TurbinesTable WHERE turbine_id = ?",
        [turbineID]
      );

      const turbines = rows as any[];

      let alreadyOnMaintainance = false;

      if (turbines.length > 0) {
        const status = turbines[0].status;
        alreadyOnMaintainance = status === "Under maintainance";
        console.log(`Turbine ${turbineID} status: ${status}`);
        console.log(`Already on maintenance: ${alreadyOnMaintainance}`);
      } else {
        console.log(`⚠️  Turbine ${turbineID} not found in database`);
        console.log(`Already on maintenance: ${alreadyOnMaintainance}`);
      }

      console.log("--------------------------");

      return job.complete({
        alreadyOnMaintainance,
      });
    } catch (error) {
      console.error("Error checking maintenance status:", error);
      console.log("--------------------------");

      // In case of error, return false as default
      return job.complete({
        alreadyOnMaintainance: false,
      });
    }
  },
});

console.log("✓ check-maintainance-status worker initialized");
