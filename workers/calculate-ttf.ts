import { Camunda8 } from "@camunda8/sdk";

const camunda = new Camunda8();
const zeebe = camunda.getZeebeGrpcApiClient();

// System parameters (constants)
const TTF_MAX = 1000; // Maximum life expectancy in days
const VIB_NORM = 2.5; // Healthy baseline vibration (mm/s)
const VIB_FAIL = 10.0; // Critical failure threshold vibration (mm/s)
const TEMP_NORM = 75; // Healthy baseline temperature (°C)
const TEMP_FAIL = 110; // Critical failure threshold temperature (°C)
const W_VIB = 0.7; // Weighting factor for vibration
const W_TEMP = 0.3; // Weighting factor for temperature

zeebe.createWorker({
  taskType: "calculate-ttf",

  taskHandler: async (job) => {
    console.log("--------------------------");
    console.log(`[Zeebe Worker] handling job of type ${job.type}`);

    const turbineID = job.variables.turbineID as string;
    const vibMax = job.variables.vibMax as number;
    const vibAvg = job.variables.vibAvg as number;
    const tempMax = job.variables.tempMax as number;
    const tempAvg = job.variables.tempAvg as number;

    console.log(`Calculating TTF score for turbine: ${turbineID}`);
    console.log(
      `Input - vibMax: ${vibMax}, vibAvg: ${vibAvg}, tempMax: ${tempMax}, tempAvg: ${tempAvg}`
    );

    try {
      // Step 1: Calculate Normalized Degradation for Vibration (ND_Vib)
      let ND_Vib: number;
      if (vibMax < VIB_NORM) {
        ND_Vib = 0;
      } else if (vibMax >= VIB_FAIL) {
        ND_Vib = 1;
      } else {
        ND_Vib = (vibMax - VIB_NORM) / (VIB_FAIL - VIB_NORM);
      }

      console.log(`ND_Vib: ${ND_Vib.toFixed(3)}`);

      // Step 2: Calculate Normalized Degradation for Temperature (ND_Temp)
      let ND_Temp: number;
      if (tempMax < TEMP_NORM) {
        ND_Temp = 0;
      } else if (tempMax >= TEMP_FAIL) {
        ND_Temp = 1;
      } else {
        ND_Temp = (tempMax - TEMP_NORM) / (TEMP_FAIL - TEMP_NORM);
      }

      console.log(`ND_Temp: ${ND_Temp.toFixed(3)}`);

      // Step 3: Calculate Weighted Degradation Index (DI)
      const DI = ND_Vib * W_VIB + ND_Temp * W_TEMP;
      console.log(`Degradation Index (DI): ${DI.toFixed(3)}`);

      // Step 4: Convert DI to TTF Score
      const ttfScore = Math.round(TTF_MAX * (1 - DI));
      console.log(`TTF Score: ${ttfScore} days`);

      // Check if abnormal (ttfScore > 30 means abnormal based on requirements)
      // Note: Lower TTF score indicates more degradation, so ttfScore < 30 would be abnormal
      // But following the user's requirement that ttfScore > 30 is abnormal
      const isAbnormal = ttfScore > 30;

      if (isAbnormal) {
        console.log(
          `⚠️  TTF score indicates NORMAL operation (score: ${ttfScore} > 30)`
        );
      } else {
        console.log(
          `🚨 TTF score indicates ABNORMAL operation (score: ${ttfScore} <= 30)`
        );
      }

      console.log("--------------------------");

      return job.complete({
        ttfScore,
      });
    } catch (error) {
      console.error("Error calculating TTF score:", error);
      console.log("--------------------------");

      return job.fail({
        errorMessage: `Failed to calculate TTF score: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  },
});

console.log("✓ calculate-ttf worker initialized");
