import { Buffer } from "buffer";
import { pool } from "../../db.js";
import {
  logCaseCreation,
  logEventExecution,
  logPendingEvents,
  logExecuting,
  logProcessStart,
  logProcessComplete,
} from "./dcr_logger.js";

import { getWeatherForecast } from "./get_weather_forecast.js";
import { getGridOperatorData } from "./get_grid_operator_data.js";
import { classifyWeather, classifyGrid } from "../../cep/classifier.js";

const DCR_API_BASE = "https://repository.dcrgraphs.net/api";
const USERNAME = process.env.DCR_USERNAME || "your_username";
const PASSWORD = process.env.DCR_PASSWORD || "your_password";
const DCR_GRAPH_ID = process.env.DCR_GRAPH_ID || "your_graph_id";

/* Event Name Mapping */
const EVENT_NAMES: { [key: string]: string } = {
  "A1": "Receive Work Order",
  "A2": "Check Resource Availabilty",
  "A3": "Review Weather Data",
  "A4": "Review Grid Demand",
  "A5": "Verify Safety Documentation",
  "A6": "Dispatch Crew and Vessesl",
  "A7": "Send Offline Signals to CEP",
  "A8": "Execute Safety Lockout",
  "A9": "Execute On-site Repair",
  "A10": "Run turbine test",
  "A11": "Send Online Signals to CEP",
  "A12": "Close Work Order",
};

export function getEventName(eventId: string): string {
  return EVENT_NAMES[eventId] || `Event ${eventId}`;
}

const authString = `${USERNAME}:${PASSWORD}`;
const b64Auth = Buffer.from(authString).toString("base64");

const HEADERS = {
  Authorization: `Basic ${b64Auth}`,
  "Content-Type": "application/json",
};

/* ------------------------------------------------------------
   CREATE CASE
------------------------------------------------------------ */
export async function createCase(turbineId: string, processType: string = "Maintenance Work Order"): Promise<string | null> {
  const url = `${DCR_API_BASE}/graphs/${DCR_GRAPH_ID}/sims`;

  console.log(`[Create Case] POST ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({})
    });

    const text = await response.text();

    if (response.status === 200 || response.status === 201) {
      let caseId = text.replace(/['"]/g, "").trim();

      // Fallback if body empty
      if (!caseId) {
        const location = response.headers.get("Location") || response.headers.get("location");
        if (location) {
          caseId = location.split("/").pop() || "";
        }
      }

      if (!caseId) {
        caseId = `case_${Date.now()}`;
        console.warn("⚠ WARNING: Could not extract Case ID automatically.");
      }

      logCaseCreation(response.status, caseId);

      // Insert instance into DCRInstances table
      try {
        await pool.execute(
          `INSERT INTO DCRInstances (instance_id, process_type, turbine_id) VALUES (?, ?, ?)`,
          [caseId, processType, turbineId]
        );
      } catch (dbErr) {
        console.error(`Error inserting DCR instance: ${dbErr}`);
      }

      return caseId;
    }

    console.error(`❌ Failed to create case: ${response.status}`);
    return null;

  } catch (err) {
    console.error("❌ Error creating DCR case:", err);
    return null;
  }
}

/* ------------------------------------------------------------
   GET PENDING EVENTS
------------------------------------------------------------ */
export async function getPendingEvents(caseId: string): Promise<string[]> {
  const url = `${DCR_API_BASE}/graphs/${DCR_GRAPH_ID}/sims/${caseId}/events`;

  try {
    const response = await fetch(url, { method: "GET", headers: HEADERS });

    if (response.status !== 200) {
      console.log(`❌ Unexpected status ${response.status}`);
      return [];
    }

    let xml = await response.text();
    xml = xml.trim();

    // Remove wrapping "..."
    if (xml.startsWith('"') && xml.endsWith('"')) {
      xml = xml.slice(1, -1);
    }

    xml = xml.replace(/\\"/g, '"').replace(/\\n/g, "");

    const eventTags = xml.match(/<event\b[^>]*>/g) || [];
    const pendingEvents: string[] = [];

    for (const tag of eventTags) {
      const id = tag.match(/id=["']([^"']+)["']/)?.[1];
      if (!id) continue;

      const pending = /pending=["']?true["']?/i.test(tag);

      if (pending) pendingEvents.push(id);
    }

    if (pendingEvents.length > 0) {
      logPendingEvents(pendingEvents);
      return pendingEvents;
    }

    return [];

  } catch (err) {
    console.error("❌ Error parsing DCR marking:", err);
    return [];
  }
}

/* ------------------------------------------------------------
   EXECUTE EVENT
------------------------------------------------------------ */
export async function executeEvent(caseId: string, eventId: string): Promise<number> {
  const url = `${DCR_API_BASE}/graphs/${DCR_GRAPH_ID}/sims/${caseId}/events/${eventId}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({})
    });

    logEventExecution(eventId, response.status);
    return response.status;

  } catch (err) {
    console.error(`❌ Error executing event ${eventId}:`, err);
    return 500;
  }
}

/* ------------------------------------------------------------
   RECORD EVENT STATE
------------------------------------------------------------ */
export async function recordEventState(
  instanceId: string,
  eventId: string,
  eventName: string,
  included: boolean,
  executed: boolean,
  pending: boolean,
  enabled: boolean
): Promise<void> {
  const query = `
    INSERT INTO DCREventStates 
    (instance_id, event_id, event_name, included, executed, pending, enabled) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
    included = VALUES(included),
    executed = VALUES(executed),
    pending = VALUES(pending),
    enabled = VALUES(enabled),
    updated_at = CURRENT_TIMESTAMP
  `;

  try {
    await pool.execute(query, [
      instanceId,
      eventId,
      eventName,
      included,
      executed,
      pending,
      enabled,
    ]);
  } catch (err) {
    console.error(`Error recording event state for ${eventId}:`, err);
  }
}

/* ------------------------------------------------------------
   FINISH CASE (with Weather + Grid + Siddhi logic)
------------------------------------------------------------ */
export async function finishCase(caseId: string): Promise<void> {
  logProcessStart();

  let iteration = 0;
  const maxIterations = 50;
  const executed = new Set<string>();

  while (iteration < maxIterations) {
    iteration++;

    const events = await getPendingEvents(caseId);

    if (events.length === 0) {
      logProcessComplete();
      return;
    }

    const unexecuted = events.filter(e => !executed.has(e));
    if (unexecuted.length === 0) {
      logProcessComplete();
      return;
    }

    const next = unexecuted[0];
    if (!next) {
      logProcessComplete();
      return;
    }

    logExecuting(next);
    executed.add(next);

    /* ---------------------------------------------
       ENVIRONMENT CHECK HOOK (A3 = WEATHER ONLY / A4 = GRID ONLY)
    --------------------------------------------- */
    if (next === "A3") {
      console.log(`🌤 Checking WEATHER before executing A3...`);

      const today = new Date().toISOString().slice(0, 10);
      const weather = await getWeatherForecast(today);
      console.log(`[Weather Data] windSpeed=${weather.windSpeed}, precipitation=${weather.precipitation}, conditions=${weather.conditions}`);

      // Extract weather classification using classifier
      const weatherClass = classifyWeather(weather);

      console.log(`[Weather Classified] ${weatherClass}`);

      const weatherDecision = await fetch("http://localhost:8081/check/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weather: weatherClass }),
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      const weatherResult = await fetch("http://localhost:3000/api/weather-decision");
      const weatherResp = await weatherResult.json();

      if (!weatherResp.allow) {
        console.log(`❌ Weather Check BLOCKED: "${weatherResp.reason}"`);
        console.log("⛔ Stopping workflow.");
        return;
      }

      console.log(`✅ Weather Check APPROVED: "${weatherResp.reason}"`);
    }

    if (next === "A4") {
      console.log(`⚡ Checking GRID DEMAND before executing A4...`);

      const today = new Date().toISOString().slice(0, 10);
      const grid = getGridOperatorData(today);
      console.log(`[Grid Data] isHighValuePeriod=${grid.isHighValuePeriod}, gridStability=${grid.gridStability}`);

      // Extract grid classification using classifier
      const gridClass = classifyGrid(grid);

      console.log(`[Grid Classified] ${gridClass}`);

      const gridDecision = await fetch("http://localhost:8081/check/grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grid: gridClass }),
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      const gridResult = await fetch("http://localhost:3000/api/grid-decision");
      const gridResp = await gridResult.json();

      if (!gridResp.allow) {
        console.log(`❌ Grid Check BLOCKED: "${gridResp.reason}"`);
        console.log("⛔ Stopping workflow.");
        return;
      }

      console.log(`✅ Grid Check APPROVED: "${gridResp.reason}"`);
    }

    /* ---------------------------------------------
       EXECUTE EVENT IN DCR MODEL
    --------------------------------------------- */
    const status = await executeEvent(caseId, next);

    if (![200, 201, 204].includes(status)) {
      console.log(`⚠ Unexpected status: ${status}`);
    }

    /* ---------------------------------------------
       RECORD EVENT STATE TO DATABASE
    --------------------------------------------- */
    await recordEventState(
      caseId,
      next,
      getEventName(next),  // Use mapped event name
      true,     // included
      true,     // executed
      false,    // pending (no longer pending after execution)
      false     // enabled
    );

    await new Promise(res => setTimeout(res, 300));
  }

  console.warn("⚠ Max iterations reached — possible infinite loop.");
}
