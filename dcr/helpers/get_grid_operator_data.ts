export interface GridOperatorData {
  date: string;
  peakDemandPeriods: {
    startTime: string;
    endTime: string;
    demandLevel: "high" | "medium" | "low";
    priceMultiplier: number;
  }[];
  isHighValuePeriod: boolean;
  gridStability: number; // 0-100 percentage
  recommendations: string[];
}

/**
 * Mocks an external Grid Operator API call
 * Returns simulated grid demand and pricing data for a given date
 */
export function getGridOperatorData(date: string): GridOperatorData {
  console.log(`[Grid Operator API Mock] Fetching data for date: ${date}`);

  // Use date to seed pseudo-random values for consistency
  const dateNum = new Date(date).getTime();
  const seed = dateNum % 100;

  // Determine if this is a high-value peak demand period
  const isHighValuePeriod = seed > 40; // 60% chance of high-value period

  // Generate peak demand periods
  const peakDemandPeriods = [];

  // Morning peak (7-9 AM)
  peakDemandPeriods.push({
    startTime: "07:00",
    endTime: "09:00",
    demandLevel: seed > 70 ? ("high" as const) : ("medium" as const),
    priceMultiplier: seed > 70 ? 1.8 : 1.3,
  });

  // Evening peak (17-21 PM)
  peakDemandPeriods.push({
    startTime: "17:00",
    endTime: "21:00",
    demandLevel: seed > 60 ? ("high" as const) : ("medium" as const),
    priceMultiplier: seed > 60 ? 2.0 : 1.5,
  });

  // Optional late night low demand
  if (seed < 30) {
    peakDemandPeriods.push({
      startTime: "23:00",
      endTime: "05:00",
      demandLevel: "low" as const,
      priceMultiplier: 0.7,
    });
  }

  // Grid stability (75-100%)
  const gridStability = 75 + (seed % 25);

  // Generate recommendations based on demand
  const recommendations: string[] = [];
  if (isHighValuePeriod) {
    recommendations.push("High-value demand period detected");
    recommendations.push("Maximize power generation during peak hours");
    recommendations.push("Consider delaying non-critical maintenance");
  } else {
    recommendations.push("Standard demand period");
    recommendations.push("Suitable window for planned maintenance");
  }

  if (gridStability < 85) {
    recommendations.push(
      "Grid stability below optimal - maintain operational readiness"
    );
  }

  const data: GridOperatorData = {
    date,
    peakDemandPeriods,
    isHighValuePeriod,
    gridStability,
    recommendations,
  };

  console.log(`[Grid Operator API Mock] Data:`, data);

  return data;
}
