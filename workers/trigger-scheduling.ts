import { Camunda8 } from "@camunda8/sdk";
import { createCase } from "../dcr/helpers/dcr_helpers.js";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "trigger-scheduling",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const turbineID = job.variables.turbineID as string;
    const workOrderID = job.variables.workOrderID as string;

    console.log(`Triggering scheduling for turbine: ${turbineID}`);
    console.log(`Work Order ID: ${workOrderID}`);
    console.log(`📅 Scheduling maintenance work...`);
    console.log(`✓ Scheduling process initiated`);
    console.log("--------------------------");




    // TODO: Instantiate the scheduling process in DCR graph here..

    // DO some database fetches

    return job.complete();
  },
});

console.log("✓ trigger-scheduling worker initialized");