import express from "express";
import type { Request, Response } from "express";

const router = express.Router();

// Storage for latest decisions
let latestWeatherDecision: { allow: boolean; reason: string; timestamp: number } | null = null;
let latestGridDecision: { allow: boolean; reason: string; timestamp: number } | null = null;

/*
=========================================
WEATHER DECISION ENDPOINTS
=========================================
*/

// POST: Receive weather decision from Siddhi
router.post("/weather-decision", (req: Request, res: Response) => {
  const { allow, reason } = req.body;

  latestWeatherDecision = {
    allow: allow === true,
    reason: reason || "No reason provided",
    timestamp: Date.now(),
  };

  console.log(`[Weather Decision Stored] allow=${latestWeatherDecision.allow}, reason=${latestWeatherDecision.reason}`);

  res.status(200).json({ status: "stored" });
});

// GET: Retrieve latest weather decision
router.get("/weather-decision", (req: Request, res: Response) => {
  if (!latestWeatherDecision) {
    return res.status(404).json({ error: "No weather decision available" });
  }

  res.status(200).json(latestWeatherDecision);
});

/*
=========================================
GRID DECISION ENDPOINTS
=========================================
*/

// POST: Receive grid decision from Siddhi
router.post("/grid-decision", (req: Request, res: Response) => {
  const { allow, reason } = req.body;

  latestGridDecision = {
    allow: allow === true,
    reason: reason || "No reason provided",
    timestamp: Date.now(),
  };

  console.log(`[Grid Decision Stored] allow=${latestGridDecision.allow}, reason=${latestGridDecision.reason}`);

  res.status(200).json({ status: "stored" });
});

// GET: Retrieve latest grid decision
router.get("/grid-decision", (req: Request, res: Response) => {
  if (!latestGridDecision) {
    return res.status(404).json({ error: "No grid decision available" });
  }

  res.status(200).json(latestGridDecision);
});

export default router;
