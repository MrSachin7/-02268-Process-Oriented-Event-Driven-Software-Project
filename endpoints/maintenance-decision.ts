import express from "express";
import type { Request, Response } from "express";

const router = express.Router();

// Store the latest maintenance decision from Siddhi
let latestMaintenanceDecision: {
  allow: boolean;
  reason: string;
  timestamp: number;
} | null = null;

/**
 * POST /api/maintenance-decision
 * Receives maintenance decision from Siddhi CEP
 */
router.post("/maintenance-decision", (req: Request, res: Response) => {
  const { allow, reason } = req.body;

  if (allow === undefined || reason === undefined) {
    console.error("❌ Invalid maintenance decision: missing allow or reason");
    return res.status(400).json({ error: "Missing allow or reason" });
  }

  latestMaintenanceDecision = {
    allow,
    reason,
    timestamp: Date.now(),
  };

  console.log(`✅ Maintenance Decision from Siddhi:`);
  console.log(`   Allow: ${allow}`);
  console.log(`   Reason: ${reason}`);

  res.json({ received: true, decision: latestMaintenanceDecision });
});

/**
 * GET /api/maintenance-decision
 * Retrieves the latest maintenance decision
 */
router.get("/maintenance-decision", (req: Request, res: Response) => {
  if (!latestMaintenanceDecision) {
    return res.status(404).json({ error: "No maintenance decision available" });
  }

  res.json(latestMaintenanceDecision);
});

export default router;
