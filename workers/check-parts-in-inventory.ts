import { Camunda8 } from "@camunda8/sdk";
import { pool } from "../db.js";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "check-parts-in-inventory",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const requiredParts = job.variables.requiredParts as string[];
    console.log(`Checking inventory for parts:`, requiredParts);

    try {
      const unavailable: string[] = [];

      // Check each required part
      for (const partName of requiredParts) {
        const [rows] = await pool.execute(
          "SELECT part_name, quantity FROM Inventory WHERE part_name = ?",
          [partName]
        );

        const parts = rows as any[];

        if (parts.length === 0) {
          // Part doesn't exist in inventory
          console.log(`⚠️  Part not found in inventory: ${partName}`);
          unavailable.push(partName);
        } else if (parts[0].quantity <= 0) {
          // Part exists but out of stock
          console.log(
            `⚠️  Part out of stock: ${partName} (quantity: ${parts[0].quantity})`
          );
          unavailable.push(partName);
        } else {
          console.log(
            `✓ Part available: ${partName} (quantity: ${parts[0].quantity})`
          );
        }
      }

      if (unavailable.length > 0) {
        console.log(`Parts unavailable: ${unavailable.join(", ")}`);
      } else {
        console.log("✓ All parts are available in inventory");
      }

      console.log("--------------------------");

      return job.complete({
        unavailableItems: unavailable,
      });
    } catch (error) {
      console.error("Error checking inventory:", error);
      console.log("--------------------------");

      return job.fail({
        errorMessage: `Failed to check inventory: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  },
});

console.log("✓ check-parts-in-inventory worker initialized");
