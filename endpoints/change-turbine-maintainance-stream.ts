import express from "express";
import type { Request, Response } from "express";
import { pool } from "../db.js";

export const changeTurbineMaintainanceStatusRouter = express.Router();

interface ChangeTurbineMaintainanceStatusRequest {
  turbineID: string;
  maintainanceStatus: string;
}

changeTurbineMaintainanceStatusRouter.post(
  "/change-turbine-maintainance-status",
  async (
    req: Request<{}, {}, ChangeTurbineMaintainanceStatusRequest>,
    res: Response
  ) => {
    const { turbineID, maintainanceStatus } = req.body;

    console.log("--------------------------");
    console.log(`[Endpoint] Change Turbine Maintainance Status`);
    console.log(`Turbine ID: ${turbineID}`);
    console.log(`Maintainance Status: ${maintainanceStatus}`);

    try {
      // Update the turbine maintainance status in the database
      const [result] = await pool.execute(
        `UPDATE TurbinesTable 
         SET maintainance_status = ?, last_updated = NOW() 
         WHERE turbine_id = ?`,
        [maintainanceStatus, turbineID]
      );

      const updateResult = result as any;

      if (updateResult.affectedRows === 0) {
        console.log(`⚠️  No turbine found with ID: ${turbineID}`);
        console.log("--------------------------");
        res.status(404).json({
          success: false,
          message: "Turbine not found",
          turbineID,
        });
        return;
      }

      console.log(
        `✓ Maintainance status updated successfully for turbine ${turbineID}`
      );
      console.log("--------------------------");

      res.json({
        success: true,
        message: "Turbine maintainance status updated successfully",
        turbineID,
        maintainanceStatus,
      });
    } catch (error) {
      console.error("Error updating turbine maintainance status:", error);
      console.log("--------------------------");

      res.status(500).json({
        success: false,
        message: "Failed to update turbine maintainance status",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
