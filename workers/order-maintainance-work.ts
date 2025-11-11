import { Camunda8 } from "@camunda8/sdk";
import { pool } from "../db.js";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "order-maintainance-work",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const turbineID = job.variables.turbineID;
    console.log(`Triggering order maintainance work for turbine: ${turbineID}`);

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
            name: "MaintainanceWorkOrder",
            variables: {
              turbineID: turbineID,
            },
          }),
        }
      );

      if (response.ok) {
        console.log(`✓ Event published successfully for turbine ${turbineID}`);
      } else {
        console.error(
          `Failed to publish event: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error publishing event:", error);
    }

    console.log("--------------------------");

    return job.complete();
  },
});

console.log("✓ order-maintainance-work worker initialized");
