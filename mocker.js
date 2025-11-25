const vibrationUrl = "http://localhost:8081/streams/vibrations";
const temperatureUrl = "http://localhost:8081/streams/temperatures";

const turbineID = "T-1001";
const duration = 10000; // 10 seconds

// Helper to post JSON using native fetch
async function postJson(url, data) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    console.log(
      `POST to ${url} => ${JSON.stringify(data)} | status: ${res.status}`
    );
  } catch (err) {
    console.error(err);
  }
}

async function sendMockData() {
  let start = Date.now();
  // Set constant high values to guarantee immediate alert triggers
  // Alert condition: avgVibration > 8.0
  const guaranteedVibration = 9.5;
  // Alert condition: tempMetric > 85.0
  const guaranteedTemp = 95.1;

  while (Date.now() - start < duration) {
    // High Vibration Event
    await postJson(vibrationUrl, {
      turbineID,
      vibrationLevel: guaranteedVibration,
      timestamp: Date.now(),
    });

    // High Temperature Event
    await postJson(temperatureUrl, {
      turbineID,
      currentTemp: guaranteedTemp,
      timestamp: Date.now(),
    });

    await new Promise((r) => setTimeout(r, 300)); // 0.3 sec interval
  }
}

sendMockData().then(() => console.log("Finished sending mock events."));
