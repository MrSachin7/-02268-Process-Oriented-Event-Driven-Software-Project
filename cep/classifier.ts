// src/cep/classifiers.ts

import type { WeatherForecast } from "../dcr/helpers/get_weather_forecast.js";      
import type { GridOperatorData } from "../dcr/helpers/get_grid_operator_data.js";  

// Weather categories Siddhi will see
export type WeatherClass = "STORMY" | "RAINY" | "SUNNY" | "NORMAL";

// Grid categories Siddhi will see
export type GridClass = "HIGH_DEMAND" | "UNSTABLE_GRID" | "LOW_DEMAND";

/**
 * Convert detailed weather forecast into a simple category for Siddhi
 */
export function classifyWeather(forecast: WeatherForecast): WeatherClass {
  // Strong wind = stormy (offshore risk)
  if (forecast.windSpeed > 25) {
    return "STORMY";
  }

  // Heavy precipitation = rainy
  if (forecast.precipitation > 20) {
    return "RAINY";
  }

  // Nice and clear
  if (forecast.conditions === "Clear") {
    return "SUNNY";
  }

  // Everything else
  return "NORMAL";
}

/**
 * Convert detailed grid operator data into a simple category for Siddhi
 */
export function classifyGrid(data: GridOperatorData): GridClass {
  // If market is in high-value period → avoid maintenance
  if (data.isHighValuePeriod) {
    return "HIGH_DEMAND";
  }

  // If stability is not great → also risky
  if (data.gridStability < 85) {
    return "UNSTABLE_GRID";
  }

  // Otherwise this is a good time to schedule
  return "LOW_DEMAND";
}

/**
 * Optional: small helper to print a human-friendly summary in logs
 */
export function formatConditionsForLog(
  weatherClass: WeatherClass,
  gridClass: GridClass
): string {
  return `Weather=${weatherClass}, Grid=${gridClass}`;
}
