import express from "express";
import "./db.js";
import "./init-db.js";
import "./workers/check-maintainance-status.js";
import "./workers/create-draft-work-order.js";
import "./workers/order-maintainance-work.js";
import "./workers/check-parts-in-inventory.js";
import "./workers/spare-parts-procurement.js";
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
