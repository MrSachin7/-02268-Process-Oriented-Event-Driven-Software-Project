import express from "express";
import type { Request, Response } from "express";
import { pool } from "../db.js";

export const changeTurbineStatusRouter = express.Router();

interface ChangeTurbineStatusRequest {
  turbineID: string;
  status: string;
}

changeTurbineStatusRouter.post(
  "/change-turbine-status",
  async (req: Request<{}, {}, ChangeTurbineStatusRequest>, res: Response) => {
    const { turbineID, status } = req.body;

    console.log("--------------------------");
    console.log(`[Endpoint] Change Turbine Status`);
    console.log(`Turbine ID: ${turbineID}`);
    console.log(`Status: ${status}`);

    try {
      const [result] = await pool.execute(
        `INSERT INTO TurbinesTable (turbine_id, status, last_updated) 
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE status = ?, last_updated = NOW()`,
        [turbineID, status, status]
      );

      const updateResult = result as any;

      if (updateResult.affectedRows === 1) {
        console.log(`✓ New turbine created with ID: ${turbineID}`);
      } else if (updateResult.affectedRows === 2) {
        console.log(`✓ Status updated successfully for turbine ${turbineID}`);
      }
      console.log("--------------------------");

      res.json({
        success: true,
        message:
          updateResult.affectedRows === 1
            ? "Turbine created successfully"
            : "Turbine status updated successfully",
        turbineID,
        status,
      });
    } catch (error) {
      console.error("Error updating turbine status:", error);
      console.log("--------------------------");

      res.status(500).json({
        success: false,
        message: "Failed to update turbine status",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
