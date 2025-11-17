import { Camunda8 } from "@camunda8/sdk";
import { pool } from "../db.js";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "save-report-result",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const turbineID = job.variables.turbineID as string;
    const vibMin = job.variables.vibMin as number;
    const vibMax = job.variables.vibMax as number;
    const vibAvg = job.variables.vibAvg as number;
    const vibCount = job.variables.vibCount as number;
    const tempMin = job.variables.tempMin as number;
    const tempMax = job.variables.tempMax as number;
    const tempAvg = job.variables.tempAvg as number;
    const tempCount = job.variables.tempCount as number;
    const ttfScore = job.variables.ttfScore as number;
    const hasFailed = job.variables.hasFailed as boolean;
    const reportTimestamp = job.variables.reportTimestamp as number;

    console.log(`Saving report result for turbine: ${turbineID}`);
    console.log(`TTF Score: ${ttfScore}, Data Quality Failed: ${hasFailed}`);

    try {
      const currentTimestamp = Date.now();

      // Insert the report result into the database
      await pool.execute(
        `INSERT INTO ReportResults 
         (turbine_id, vib_min, vib_max, vib_avg, vib_count, 
          temp_min, temp_max, temp_avg, temp_count, 
          ttf_score, has_failed, report_timestamp, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          turbineID,
          vibMin,
          vibMax,
          vibAvg,
          vibCount,
          tempMin,
          tempMax,
          tempAvg,
          tempCount,
          ttfScore,
          hasFailed,
          reportTimestamp,
          currentTimestamp,
        ]
      );

      console.log(
        `✓ Report result saved successfully for turbine ${turbineID}`
      );
      console.log("--------------------------");

      return job.complete();
    } catch (error) {
      console.error("Error saving report result:", error);
      console.log("--------------------------");

      return job.fail({
        errorMessage: `Failed to save report result: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  },
});

console.log("✓ save-report-result worker initialized");
