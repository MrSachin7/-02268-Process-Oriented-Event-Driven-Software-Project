import express from "express";
import "./db.js";
import "./init-db.js";
import "./workers/check-maintainance-status.js";
import { changeTurbineStatusRouter } from "./endpoints/change-turbine-status.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use("/api", changeTurbineStatusRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("Workers initialized and running...");
});
