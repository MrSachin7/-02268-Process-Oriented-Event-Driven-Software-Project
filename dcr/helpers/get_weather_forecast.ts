export interface WeatherForecast {
  date: string;
  temperature: number; // in Celsius
  windSpeed: number; // in m/s
  precipitation: number; // in mm
  humidity: number; // in percentage
  conditions: string;
}

// Default location: North Sea offshore wind farm area (55.5°N, 12.56°E) -- Copenhagen Denmark
const DEFAULT_LATITUDE = 55.5;
const DEFAULT_LONGITUDE = 12.56;

/**
 * Fetches weather forecast data - either real from Open-Meteo Marine API or mocked
 * Returns weather forecast data for a given date
 */
export async function getWeatherForecast(
  date: string,
  useReal: boolean = false,
  latitude: number = DEFAULT_LATITUDE,
  longitude: number = DEFAULT_LONGITUDE
): Promise<WeatherForecast> {
  console.log(
    `[Weather API] Fetching forecast for date: ${date} at (${latitude}, ${longitude}) - Mode: ${
      useReal ? "REAL" : "MOCK"
    }`
  );

  // If mock mode, return mock data immediately
  if (!useReal) {
    const dateNum = new Date(date).getTime();
    const seed = dateNum % 1000;

    const baseTemp = 15 + (seed % 20);
    const windSpeed = 5 + (seed % 30);
    const precipitation = seed % 50;
    const humidity = 40 + (seed % 50);

    let conditions: string;
    if (windSpeed > 25) {
      conditions = "Stormy";
    } else if (precipitation > 30) {
      conditions = "Rainy";
    } else if (precipitation > 10) {
      conditions = "Cloudy";
    } else {
      conditions = "Clear";
    }

    const forecast: WeatherForecast = {
      date,
      temperature: Math.round(baseTemp * 10) / 10,
      windSpeed: Math.round(windSpeed * 10) / 10,
      precipitation: Math.round(precipitation * 10) / 10,
      humidity: Math.round(humidity),
      conditions,
    };

    console.log(`[Weather API Mock] Forecast:`, forecast);

    return forecast;
  }

  // Real API mode
  try {
    // Open-Meteo Marine API endpoint
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&daily=wave_height_max,wind_speed_10m_max,temperature_2m_max,precipitation_sum&timezone=auto&start_date=${date}&end_date=${date}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Extract daily data
    const daily = data.daily;
    const temperature = daily.temperature_2m_max?.[0] || 15;
    const windSpeed = daily.wind_speed_10m_max?.[0] || 10;
    const precipitation = daily.precipitation_sum?.[0] || 0;

    // Calculate approximate humidity (API doesn't provide this directly)
    // Higher precipitation correlates with higher humidity
    const humidity = Math.min(40 + precipitation * 2 + Math.random() * 20, 100);

    // Determine conditions based on wind speed and precipitation
    let conditions: string;
    if (windSpeed > 25) {
      conditions = "Stormy";
    } else if (precipitation > 30) {
      conditions = "Rainy";
    } else if (precipitation > 10) {
      conditions = "Cloudy";
    } else {
      conditions = "Clear";
    }

    const forecast: WeatherForecast = {
      date,
      temperature: Math.round(temperature * 10) / 10,
      windSpeed: Math.round(windSpeed * 10) / 10,
      precipitation: Math.round(precipitation * 10) / 10,
      humidity: Math.round(humidity),
      conditions,
    };

    console.log(`[Weather API] Forecast:`, forecast);

    return forecast;
  } catch (error) {
    console.error("[Weather API] Error fetching real data:", error);
    console.log("[Weather API] Falling back to mock data");

    // Fallback to mock data if API fails
    const dateNum = new Date(date).getTime();
    const seed = dateNum % 1000;

    const baseTemp = 15 + (seed % 20);
    const windSpeed = 5 + (seed % 30);
    const precipitation = seed % 50;
    const humidity = 40 + (seed % 50);

    let conditions: string;
    if (windSpeed > 25) {
      conditions = "Stormy";
    } else if (precipitation > 30) {
      conditions = "Rainy";
    } else if (precipitation > 10) {
      conditions = "Cloudy";
    } else {
      conditions = "Clear";
    }

    return {
      date,
      temperature: Math.round(baseTemp * 10) / 10,
      windSpeed: Math.round(windSpeed * 10) / 10,
      precipitation: Math.round(precipitation * 10) / 10,
      humidity: Math.round(humidity),
      conditions,
    };
  }
}
