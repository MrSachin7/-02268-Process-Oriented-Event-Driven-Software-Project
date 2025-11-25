import { v4 as uuidv4 } from "uuid";
import { pool } from "../db.js";
import { DCREngine } from "./engine.js";
import { createHighRiskAlertDCR } from "./high-risk-alert-dcr.js";
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
    }
}
