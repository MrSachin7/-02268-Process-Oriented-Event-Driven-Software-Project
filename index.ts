import express from "express";
import "./db.js";
import "./init-db.js";

// TEMPORARILY DISABLED Camunda workers (not needed for DCR demo)
// Uncomment these when Camunda is running
import "./workers/check-maintainance-status.js";
import "./workers/create-draft-work-order.js";
import "./workers/order-maintainance-work.js";
import "./workers/check-parts-in-inventory.js";
import "./workers/spare-parts-procurement.js";
import "./workers/generate-purchase-order.js";
import "./workers/spare-parts-acquired.js";
import "./workers/data-quality-check.js";
import "./workers/calculate-ttf.js";
import "./workers/save-report-result.js";
import "./workers/fetch-current-windspeed.js";
import "./workers/send-high-priority-alarm.js";
import "./workers/controlled-emergency-decceleration.js";
import "./workers/immediate-hard-shutdown.js";
import "./workers/trigger-scheduling.js";

import { changeTurbineStatusRouter } from "./endpoints/change-turbine-status.js";
import { changeTurbineMaintainanceStatusRouter } from "./endpoints/change-turbine-maintainance-stream.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use("/api", changeTurbineStatusRouter);
app.use("/api", changeTurbineMaintainanceStatusRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("Workers initialized and running...");
});
