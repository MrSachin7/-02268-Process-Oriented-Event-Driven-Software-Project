import { Camunda8 } from "@camunda8/sdk";
import { pool } from "../db.js";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "data-quality-check",

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
    const reportTimestamp = job.variables.reportTimestamp;

    console.log(`Performing data quality check for turbine: ${turbineID}`);
    console.log(
      `Vibration - Min: ${vibMin}, Max: ${vibMax}, Avg: ${vibAvg}, Count: ${vibCount}`
    );
    console.log(
      `Temperature - Min: ${tempMin}, Max: ${tempMax}, Avg: ${tempAvg}, Count: ${tempCount}`
    );
    console.log(`Report Timestamp: ${reportTimestamp}`);

    let hasFailed = false;
    const issues: string[] = [];

    try {
      // Check 1: Insufficient data points
      if (vibCount < 5 || tempCount < 5) {
        issues.push(
          "Insufficient data points (minimum 5 required for each metric)"
        );
        hasFailed = true;
      }

      // Check 2: Invalid value ranges (min should be <= avg <= max)
      if (vibMin > vibAvg || vibAvg > vibMax) {
        issues.push("Invalid vibration data range (min > avg or avg > max)");
        hasFailed = true;
      }

      if (tempMin > tempAvg || tempAvg > tempMax) {
        issues.push("Invalid temperature data range (min > avg or avg > max)");
        hasFailed = true;
      }

      // Check 3: Unrealistic vibration range spread
      // If the range is too large (>50% of average), data might be unreliable
      const vibRange = vibMax - vibMin;
      if (vibAvg > 0 && vibRange / vibAvg > 0.5) {
        issues.push(
          `Excessive vibration variance detected (range: ${vibRange.toFixed(
            2
          )}, avg: ${vibAvg.toFixed(2)})`
        );
        hasFailed = true;
      }

      // Check 4: Unrealistic temperature range spread
      // Temperature shouldn't vary more than 30% from average
      const tempRange = tempMax - tempMin;
      if (tempAvg > 0 && tempRange / tempAvg > 0.3) {
        issues.push(
          `Excessive temperature variance detected (range: ${tempRange.toFixed(
            2
          )}, avg: ${tempAvg.toFixed(2)})`
        );
        hasFailed = true;
      }

      // Check 5: Physically impossible values
      if (vibMin < 0 || vibMax < 0 || vibAvg < 0) {
        issues.push(
          "Negative vibration values detected (physically impossible)"
        );
        hasFailed = true;
      }

      if (tempMin < -50 || tempMax > 150) {
        issues.push(
          "Temperature values outside operational range (-50°C to 150°C)"
        );
        hasFailed = true;
      }

      // Check 6: Suspiciously constant values (no variance might indicate sensor failure)
      if (vibMin === vibMax && vibCount > 10) {
        issues.push(
          "Zero vibration variance detected (possible sensor failure)"
        );
        hasFailed = true;
      }

      if (tempMin === tempMax && tempCount > 10) {
        issues.push(
          "Zero temperature variance detected (possible sensor failure)"
        );
        hasFailed = true;
      }

      // Check 7: Average not between min and max (data consistency check)
      if (vibAvg < vibMin - 0.01 || vibAvg > vibMax + 0.01) {
        issues.push(
          "Vibration average outside min-max range (data inconsistency)"
        );
        hasFailed = true;
      }
      
      if (tempAvg < tempMin - 0.01 || tempAvg > tempMax + 0.01) {
        issues.push(
          "Temperature average outside min-max range (data inconsistency)"
        );
        hasFailed = true;
      }

      // Log results
      if (hasFailed) {
        console.log(`⚠️  Data quality check FAILED for turbine ${turbineID}`);
        console.log(`Issues detected:`);
        issues.forEach((issue) => console.log(`  - ${issue}`));
      } else {
        console.log(`✓ Data quality check PASSED for turbine ${turbineID}`);
      }

      console.log("--------------------------");

      return job.complete({
        hasFailed,
      });
    } catch (error) {
      console.error("Error performing data quality check:", error);
      console.log("--------------------------");

      return job.fail({
        errorMessage: `Failed to perform data quality check: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  },
});

console.log("✓ data-quality-check worker initialized");
