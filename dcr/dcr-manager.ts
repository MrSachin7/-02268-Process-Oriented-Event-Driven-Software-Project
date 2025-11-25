import { v4 as uuidv4 } from "uuid";
import { pool } from "../db.js";
import { DCREngine } from "./engine.js";
import { createHighRiskAlertDCR } from "./high-risk-alert-dcr.js";
import { createMaintenanceSchedulingDCR } from "./maintenance-scheduling-dcr.js";
import type { DCRGraph, Event } from "./engine.js";

interface DCRInstance {
    instanceId: string;
    processType: string;
    turbineID: string;
    createdAt: Date;
    engine: DCREngine;
}

const instances = new Map<string, DCRInstance>();

export async function createDCRInstance(
    processType: string,
    turbineID: string,
    data: any
): Promise<string> {
    const instanceId = uuidv4();

    let graph: DCRGraph;
    if (processType === "high-risk-alert") {
        graph = createHighRiskAlertDCR();
    } else if (processType === "maintenance-scheduling") {
        graph = createMaintenanceSchedulingDCR();
    } else {
        throw new Error(`Unknown process type: ${processType}`);
    }

    const engine = new DCREngine(graph);
    const instance: DCRInstance = {
        instanceId,
        processType,
        turbineID,
        createdAt: new Date(),
        engine,
    };

    instances.set(instanceId, instance);

    await pool.execute(
        `INSERT INTO DCRInstances (instance_id, process_type, turbine_id, created_at) 
     VALUES (?, ?, ?, ?)`,
        [instanceId, processType, turbineID, instance.createdAt]
    );

    await saveDCRState(instanceId, engine.getState());

    console.log(`✓ DCR instance created: ${instanceId} for turbine ${turbineID}`);
    return instanceId;
}

export function getDCRInstance(instanceId: string): DCRInstance | undefined {
    return instances.get(instanceId);
}

export async function executeDCREvent(
    instanceId: string,
    eventId: string,
    data?: any
): Promise<boolean> {
    const instance = instances.get(instanceId);
    if (!instance) {
        throw new Error(`DCR instance not found: ${instanceId}`);
    }

    const success = instance.engine.execute(eventId);
    if (!success) {
        return false;
    }

    await saveDCRState(instanceId, instance.engine.getState());

    const event = instance.engine.getState().events.get(eventId);
    console.log(`✓ DCR event executed: ${event?.name} in instance ${instanceId}`);

    await handleEventSideEffects(instanceId, eventId, instance.turbineID, data);

    return true;
}

export function getEnabledEvents(instanceId: string): Event[] {
    const instance = instances.get(instanceId);
    if (!instance) {
        throw new Error(`DCR instance not found: ${instanceId}`);
    }

    return instance.engine.getEnabledEvents();
}

export function getDCRState(instanceId: string): DCRGraph | undefined {
    const instance = instances.get(instanceId);
    return instance?.engine.getState();
}

async function saveDCRState(instanceId: string, state: DCRGraph): Promise<void> {
    await pool.execute(
        `DELETE FROM DCREventStates WHERE instance_id = ?`,
        [instanceId]
    );

    for (const [eventId, event] of state.events) {
        await pool.execute(
            `INSERT INTO DCREventStates 
       (instance_id, event_id, event_name, included, executed, pending, enabled) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                instanceId,
                eventId,
                event.name,
                event.included ? 1 : 0,
                event.executed ? 1 : 0,
                event.pending ? 1 : 0,
                event.enabled ? 1 : 0,
            ]
        );
    }
}

async function handleEventSideEffects(
    instanceId: string,
    eventId: string,
    turbineID: string,
    data: any
): Promise<void> {
    switch (eventId) {
        // High Risk Alert process side effects
        case 'E7':
            await pool.execute(
                `INSERT INTO TurbinesTable (turbine_id, status, last_updated) 
         VALUES (?, 'Under maintainance', NOW())
         ON DUPLICATE KEY UPDATE status = 'Under maintainance', last_updated = NOW()`,
                [turbineID]
            );
            console.log(`  → Updated turbine ${turbineID} status to 'Under maintainance'`);
            break;

        case 'E8':
            await pool.execute(
                `INSERT INTO TurbinesTable (turbine_id, status, last_updated) 
         VALUES (?, 'Elevated', NOW())
         ON DUPLICATE KEY UPDATE status = 'Elevated', last_updated = NOW()`,
                [turbineID]
            );
            console.log(`  → Updated turbine ${turbineID} status to 'Elevated'`);
            break;

        // Maintenance Scheduling process side effects  
        case 'E2': // Draft_Work_Order
            await pool.execute(
                `INSERT INTO TurbinesTable (turbine_id, maintainance_status, last_updated) 
         VALUES (?, 'Draft created', NOW())
         ON DUPLICATE KEY UPDATE maintainance_status = 'Draft created', last_updated = NOW()`,
                [turbineID]
            );
            console.log(`  → Created work order draft for turbine ${turbineID}`);
            break;

        case 'E5': // Procure_Missing_Parts
            await pool.execute(
                `INSERT INTO TurbinesTable (turbine_id, maintainance_status, last_updated) 
         VALUES (?, 'Awaiting parts', NOW())
         ON DUPLICATE KEY UPDATE maintainance_status = 'Awaiting parts', last_updated = NOW()`,
                [turbineID]
            );
            console.log(`  → turbine ${turbineID} waiting for spare parts`);
            break;

        case 'E8': // Schedule_Maintenance
            await pool.execute(
                `INSERT INTO TurbinesTable (turbine_id, maintainance_status, last_updated) 
         VALUES (?, 'Scheduled', NOW())
         ON DUPLICATE KEY UPDATE maintainance_status = 'Scheduled', last_updated = NOW()`,
                [turbineID]
            );
            console.log(`  → Maintenance scheduled for turbine ${turbineID}`);
            break;

        case 'E9': // Complete_Scheduling
            await pool.execute(
                `INSERT INTO TurbinesTable (turbine_id, maintainance_status, last_updated) 
         VALUES (?, 'Ready for execution', NOW())
         ON DUPLICATE KEY UPDATE maintainance_status = 'Ready for execution', last_updated = NOW()`,
                [turbineID]
            );
            console.log(`  → Turbine ${turbineID} ready for maintenance execution`);
            break;
    }
}
