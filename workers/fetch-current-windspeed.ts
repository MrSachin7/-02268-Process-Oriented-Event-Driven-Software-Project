import { Camunda8 } from "@camunda8/sdk";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

zeebe.createWorker({
  taskType: "fetch-current-wind-speed",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const turbineID = job.variables.turbineID as string;
    console.log(`Fetching current wind speed for turbine: ${turbineID}`);

    // Generate wind speed: 50% chance > 35, 50% chance < 35
    let windSpeed: number;
    if (Math.random() < 0.5) {
      // Generate wind speed greater than 35 (35-50 range)
      windSpeed = 35 + Math.random() * 15;
    } else {
      // Generate wind speed less than 35 (10-35 range)
      windSpeed = 10 + Math.random() * 25;
    }

    // Round to 2 decimal places
    windSpeed = Math.round(windSpeed * 100) / 100;

    console.log(`Current wind speed: ${windSpeed} m/s`);

    if (windSpeed > 35) {
      console.log(`⚠️  Wind speed is HIGH (> 35 m/s)`);
    } else {
      console.log(`✓ Wind speed is within safe range (<= 35 m/s)`);
    }

    console.log("--------------------------");

    return job.complete({
      windSpeed,
    });
  },
});

console.log("✓ fetch-current-wind-speed worker initialized");
    