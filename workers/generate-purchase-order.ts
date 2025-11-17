import { Camunda8 } from "@camunda8/sdk";
import { pool } from "../db.js";
import { v4 as uuidv4 } from "uuid";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "generate-purchase-order",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const turbineID = job.variables.turbineID;
    const unavailable = job.variables.unavailableItems as string[];

    console.log(`Generating purchase order for turbine: ${turbineID}`);
    console.log(`Parts to order:`, unavailable);

    try {
      // Generate a unique purchase order ID
      const purchaseOrderID = uuidv4();
      console.log(`Generated purchase order ID: ${purchaseOrderID}`);

      // Convert unavailable parts array to JSON string for storage
      const partsOrderedJSON = JSON.stringify(unavailable);

      // Insert the purchase order into the database
      await pool.execute(
        "INSERT INTO PurchaseOrders (purchase_order_id, turbine_id, parts_ordered) VALUES (?, ?, ?)",
        [purchaseOrderID, turbineID, partsOrderedJSON]
      );

      console.log(`✓ Purchase order created successfully`);
      console.log("--------------------------");

      return job.complete({
        purchaseOrderID,
      });
    } catch (error) {
      console.error("Error generating purchase order:", error);
      console.log("--------------------------");

      return job.fail({
        errorMessage: `Failed to generate purchase order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  },
});

console.log("✓ generate-purchase-order worker initialized");
