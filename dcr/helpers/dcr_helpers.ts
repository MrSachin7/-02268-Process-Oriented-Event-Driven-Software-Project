import { Buffer } from "buffer";
import {
  logCaseCreation,
  logEventExecution,
  logPendingEvents,
  logEnabledEvents,
  logExecuting,
  logProcessStart,
  logProcessComplete,
} from "./dcr_logger.js";

const DCR_API_BASE = "https://repository.dcrgraphs.net/api";
const USERNAME = process.env.DCR_USERNAME || "your_username";
const PASSWORD = process.env.DCR_PASSWORD || "your_password";
const DCR_GRAPH_ID = process.env.DCR_GRAPH_ID || "your_graph_id";

const authString = `${USERNAME}:${PASSWORD}`;
const b64Auth = Buffer.from(authString).toString("base64");

const HEADERS = {
  Authorization: `Basic ${b64Auth}`,
  "Content-Type": "application/json",
};

// ---------------------------------------------------------------------------
// CREATE DCR CASE
// ---------------------------------------------------------------------------

export async function createCase(): Promise<string | null> {
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

      if (!caseId) {
        const location = response.headers.get("Location") || response.headers.get("location");
        if (location) {
          const parts = location.split("/");
          const extractedId = parts[parts.length - 1];
          if (extractedId) {
            caseId = extractedId;
          }
        }
      }

      if (!caseId) {
        caseId = `case_${Date.now()}`;
        console.warn("⚠ WARNING: Could not extract Case ID automatically.");
      }

      logCaseCreation(response.status, caseId);
      return caseId;
    }

    console.error(`❌ Failed to create case: ${response.status}`);
    return null;
  } catch (err) {
    console.error("❌ Error creating DCR case:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET PENDING EVENTS  (with required XML unescaping FIX)
// ---------------------------------------------------------------------------

export async function getPendingEvents(caseId: string): Promise<string[]> {
  const url = `${DCR_API_BASE}/graphs/${DCR_GRAPH_ID}/sims/${caseId}/events`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: HEADERS
    });

    if (response.status !== 200) {
      console.log(`❌ Unexpected status ${response.status}`);
      return [];
    }

    // --- FIX 1: Clean escaped XML returned by DCR API ---
    let xml = await response.text();
    xml = xml.trim();

    // Remove outer " "
    if (xml.startsWith('"') && xml.endsWith('"')) {
      xml = xml.slice(1, -1);
    }

    // Convert escaped quotes and remove escaped newlines
    xml = xml.replace(/\\"/g, '"').replace(/\\n/g, "");

    // Extract all <event ...> tags
    const eventTags = xml.match(/<event\b[^>]*>/g) || [];

    const pendingEvents: string[] = [];
    const enabledEvents: string[] = [];
    const allEvents: { id: string; tag: string; pending: boolean; enabled: boolean; included: boolean }[] = [];

    for (const tag of eventTags) {
      const id = tag.match(/id=["']([^"']+)["']/)?.[1];
      if (!id) continue;

      const pending  = /pending=["']?true["']?/i.test(tag);
      const enabled  = /enabled=["']?true["']?/i.test(tag);
      const included = /included=["']?true["']?/i.test(tag);

      allEvents.push({ id, tag, pending, enabled, included });

      if (pending) {
        pendingEvents.push(id);
      } else if (enabled && included) {
        enabledEvents.push(id);
      }
    }

    if (pendingEvents.length > 0) {
      logPendingEvents(pendingEvents);
      return pendingEvents;
    }

    // Return empty array instead of fallback - let caller decide
    return [];
  } catch (err) {
    console.error("❌ Error parsing DCR marking:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// EXECUTE EVENT
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// AUTO PROCESS CASE (Python-equivalent)
// ---------------------------------------------------------------------------

export async function finishCase(caseId: string): Promise<void> {
  logProcessStart();

  let iteration = 0;
  const maxIterations = 50;
  const executedEvents = new Set<string>();

  while (iteration < maxIterations) {
    iteration++;

    const events = await getPendingEvents(caseId);

    if (events.length === 0) {
      logProcessComplete();
      return;
    }

    // Filter out already executed events from fallback results
    const unexecuted = events.filter((e) => !executedEvents.has(e));

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
    executedEvents.add(next);

    const status = await executeEvent(caseId, next);

    if (![200, 201, 204].includes(status)) {
      console.log(`⚠ Unexpected status: ${status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  console.warn("⚠ Max iterations reached — possible loop");
}
