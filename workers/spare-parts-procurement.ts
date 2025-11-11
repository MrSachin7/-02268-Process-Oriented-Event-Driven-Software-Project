import { Camunda8 } from "@camunda8/sdk";
import { pool } from "../db.js";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "spare-part-procurement",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const turbineID = job.variables.turbineID;
    const unavailable = job.variables.unavailableItems as string[];

    console.log(`Triggering spare parts procurement for turbine: ${turbineID}`);
    console.log(`Unavailable parts:`, unavailable);

    try {
      // Publish event to Siddhi
      const response = await fetch(
        "http://localhost:8088/v2/messages/publication",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "spare-part-procurement",
            variables: {
              turbineID: turbineID,
              unavailableItems: unavailable,
            },
          }),
        }
      );

      if (response.ok) {
        console.log(
          `✓ Spare parts procurement event published successfully for turbine ${turbineID}`
        );
      } else {
        console.error(
          `Failed to publish event: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error publishing spare parts procurement event:", error);
    }

    console.log("--------------------------");

    return job.complete();
  },
});

console.log("✓ spare-parts-procurement worker initialized");
