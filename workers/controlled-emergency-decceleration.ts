import { Camunda8 } from "@camunda8/sdk";
import { pool } from "../db.js";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "controlled-emergency-decceleration",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const turbineID = job.variables.turbineID as string;
    console.log(
      `Initiating controlled emergency deceleration for turbine: ${turbineID}`
    );

    try {
      // Update turbine status to "controlled shut down"
      const [result] = await pool.execute(
        `UPDATE TurbinesTable SET status = ?, last_updated = NOW() WHERE turbine_id = ?`,
        ["controlled shut down", turbineID]
      );

      const updateResult = result as any;

      if (updateResult.affectedRows === 0) {
        console.error(`⚠️  Turbine not found: ${turbineID}`);
        console.log("--------------------------");
        return job.fail({
          errorMessage: `Turbine not found: ${turbineID}`,
        });
      }

      console.log(
        `✓ Turbine ${turbineID} status updated to "controlled shut down"`
      );
      console.log(`🛑 Emergency deceleration procedure initiated`);
      console.log("--------------------------");

      return job.complete();
    } catch (error) {
      console.error("Error updating turbine status:", error);
      console.log("--------------------------");

      return job.fail({
        errorMessage: `Failed to update turbine status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  },
});

console.log("✓ controlled-emergency-decceleration worker initialized");
