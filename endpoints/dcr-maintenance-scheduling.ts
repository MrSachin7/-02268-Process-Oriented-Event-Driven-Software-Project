import express from "express";
import type { Request, Response } from "express";
import {
    createDCRInstance,
    executeDCREvent,
    getEnabledEvents,
    getDCRState,
} from "../dcr/dcr-manager.js";

export const dcrMaintenanceSchedulingRouter = express.Router();

interface StartMaintenanceDCRRequest {
    turbineID: string;
    workOrderReason: string;
    timestamp: number;
}

interface ExecuteEventRequest {
    eventId: string;
    data?: any;
}

dcrMaintenanceSchedulingRouter.post(
    "/dcr/start-maintenance-scheduling",
    async (req: Request<{}, {}, StartMaintenanceDCRRequest>, res: Response) => {
        const { turbineID, workOrderReason, timestamp } = req.body;

        console.log("--------------------------");
        console.log(`[DCR] Starting Maintenance Scheduling DCR process`);
        console.log(`Turbine ID: ${turbineID}`);
        console.log(`Reason: ${workOrderReason}`);

        try {
            const instanceId = await createDCRInstance("maintenance-scheduling", turbineID, {
                workOrderReason,
                timestamp,
            });

            await executeDCREvent(instanceId, "E1", { workOrderReason, timestamp });

            const enabledEvents = getEnabledEvents(instanceId);

            console.log(`✓ DCR process started with instance ID: ${instanceId}`);
            console.log(`Enabled events: ${enabledEvents.map((e) => e.name).join(", ")}`);
            console.log("--------------------------");

            res.json({
                success: true,
                instanceId,
                enabledEvents: enabledEvents.map((e) => ({
                    id: e.id,
                    name: e.name,
                })),
            });
        } catch (error) {
            console.error("Error starting DCR process:", error);
            console.log("--------------------------");

            res.status(500).json({
                success: false,
                message: "Failed to start DCR process",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
);

dcrMaintenanceSchedulingRouter.post(
    "/dcr/execute-event/:instanceId",
    async (
        req: Request<{ instanceId: string }, {}, ExecuteEventRequest>,
        res: Response
    ) => {
        const { instanceId } = req.params;
        const { eventId, data } = req.body;

        console.log("--------------------------");
        console.log(`[DCR] Executing event ${eventId} in instance ${instanceId}`);

        try {
            const success = await executeDCREvent(instanceId, eventId, data);

            if (!success) {
                res.status(400).json({
                    success: false,
                    message: "Event cannot be executed (constraints not satisfied)",
                });
                return;
            }

            const enabledEvents = getEnabledEvents(instanceId);

            console.log(`✓ Event executed successfully`);
            console.log(`Enabled events: ${enabledEvents.map((e) => e.name).join(", ")}`);
            console.log("--------------------------");

            res.json({
                success: true,
                enabledEvents: enabledEvents.map((e) => ({
                    id: e.id,
                    name: e.name,
                })),
            });
        } catch (error) {
            console.error("Error executing DCR event:", error);
            console.log("--------------------------");

            res.status(500).json({
                success: false,
                message: "Failed to execute DCR event",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
);

dcrMaintenanceSchedulingRouter.get(
    "/dcr/enabled-events/:instanceId",
    async (req: Request<{ instanceId: string }>, res: Response) => {
        const { instanceId } = req.params;

        try {
            const enabledEvents = getEnabledEvents(instanceId);

            res.json({
                success: true,
                enabledEvents: enabledEvents.map((e) => ({
                    id: e.id,
                    name: e.name,
                    pending: e.pending,
                })),
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: "DCR instance not found",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
);

dcrMaintenanceSchedulingRouter.get(
    "/dcr/state/:instanceId",
    async (req: Request<{ instanceId: string }>, res: Response) => {
        const { instanceId } = req.params;

        try {
            const state = getDCRState(instanceId);

            if (!state) {
                res.status(404).json({
                    success: false,
                    message: "DCR instance not found",
                });
                return;
            }

            const events = Array.from(state.events.values());

            res.json({
                success: true,
                state: {
                    events: events.map((e) => ({
                        id: e.id,
                        name: e.name,
                        included: e.included,
                        executed: e.executed,
                        pending: e.pending,
                        enabled: e.enabled,
                    })),
                    relations: state.relations,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to get DCR state",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
);
