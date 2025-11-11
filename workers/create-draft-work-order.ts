import { Camunda8 } from "@camunda8/sdk";
import { pool } from "../db.js";
import { v4 as uuidv4 } from "uuid";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "create-draft-work-order",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const turbineID = job.variables.turbineID;
    console.log(`Creating draft work order for turbine: ${turbineID}`);

    try {
      // Generate a unique work order ID
      const workOrderID = uuidv4();
      console.log(`Generated work order ID: ${workOrderID}`);

      // Insert the draft work order into the database
      await pool.execute(
        "INSERT INTO MaintainanceWorks (work_order_id, turbine_id) VALUES (?, ?)",
        [workOrderID, turbineID]
      );

      console.log(`✓ Draft work order created successfully`);
      console.log("--------------------------");

      return job.complete({
        workOrderID,
      });
    } catch (error) {
      console.error("Error creating draft work order:", error);
      console.log("--------------------------");

      return job.fail({
        errorMessage: `Failed to create draft work order: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  },
});

console.log("✓ create-draft-work-order worker initialized");
