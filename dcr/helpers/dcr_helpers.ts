import { Buffer } from "buffer";

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

// Create a new case (simulation/instance) of a DCR graph
export async function createCase(): Promise<string | null> {
  const url = `${DCR_API_BASE}/graphs/${DCR_GRAPH_ID}/sims`;

  console.log(`[Create Case] ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({}),
    });

    const text = await response.text();
    console.log(`Response: ${response.status}\n${text}`);

    if (response.status === 200 || response.status === 201) {
      return text;
    }
    return null;
  } catch (error) {
    console.error("Error creating case:", error);
    return null;
  }
}

// Trigger an event inside that case
export async function executeEvent(
  caseId: string,
  eventId: string
): Promise<number> {
  const url = `${DCR_API_BASE}/graphs/${DCR_GRAPH_ID}/sims/${caseId}/events/${eventId}`;

  console.log(`[Execute Event] ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({}),
    });

    console.log(`Execute ${eventId}: ${response.status}`);

    if (
      response.status === 200 ||
      response.status === 201 ||
      response.status === 204
    ) {
      console.log(
        `Executed event ${eventId} successfully (status ${response.status})`
      );
    } else if (response.status === 404) {
      console.log("404 Not Found - check graph ID, case ID and event ID.");
    } else {
      const text = await response.text();
      console.log(`Unexpected response: ${response.status}\n${text}`);
    }

    return response.status;
  } catch (error) {
    console.error("Error executing event:", error);
    return 500;
  }
}
