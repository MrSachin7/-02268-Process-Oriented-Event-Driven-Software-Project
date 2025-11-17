import { Camunda8 } from "@camunda8/sdk";
import { pool } from "../db.js";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "spare-parts-acquired",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const purchaseOrderID = job.variables.purchaseOrderID;
    const workOrderID = job.variables.workOrderID;
    const turbineID = job.variables.turbineID;

    console.log(
      `Processing spare parts acquisition for purchase order: ${purchaseOrderID}`
    );
    console.log(`Work Order ID: ${workOrderID}`);

    try {
      // Retrieve the purchase order from the database
      const [rows] = await pool.execute(
        "SELECT parts_ordered FROM PurchaseOrders WHERE purchase_order_id = ?",
        [purchaseOrderID]
      );

      const orders = rows as any[];

      if (orders.length === 0) {
        console.error(`⚠️  Purchase order not found: ${purchaseOrderID}`);
        console.log("--------------------------");
        return job.fail({
          errorMessage: `Purchase order not found: ${purchaseOrderID}`,
        });
      }

      // Parse the parts ordered from JSON
      const partsOrdered = JSON.parse(orders[0].parts_ordered) as string[];
      console.log(`Parts to add to inventory:`, partsOrdered);

      // Update inventory for each part - add 5 to each
      for (const partName of partsOrdered) {
        await pool.execute(
          `INSERT INTO Inventory (part_name, quantity) 
           VALUES (?, 5)
           ON DUPLICATE KEY UPDATE quantity = quantity + 5`,
          [partName]
        );
        console.log(`✓ Added 5 units of: ${partName}`);
      }

      console.log(
        `✓ Inventory updated successfully for purchase order ${purchaseOrderID}`
      );

      // Publish correlation event to Siddhi
      try {
        const response = await fetch(
          "http://localhost:8088/v2/messages/correlation",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "spare-parts-acquired",
              correlationKey: workOrderID,
              variables: {
                turbineID: turbineID,
              },
            }),
          }
        );

        if (response.ok) {
          console.log(
            `✓ Spare parts acquired event correlated successfully for work order ${workOrderID}`
          );
        } else {
          console.error(
            `Failed to correlate event: ${response.status} ${response.statusText}`
          );
        }
      } catch (error) {
        console.error("Error correlating spare parts acquired event:", error);
      }

      console.log("--------------------------");

      return job.complete();
    } catch (error) {
      console.error("Error processing spare parts acquisition:", error);
      console.log("--------------------------");

      return job.fail({
        errorMessage: `Failed to process spare parts acquisition: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  },
});

console.log("✓ spare-parts-acquired worker initialized");
