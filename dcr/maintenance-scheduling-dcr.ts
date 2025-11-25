import type { DCRGraph, Relation } from "./engine.js";

export function createMaintenanceSchedulingDCR(): DCRGraph {
    const events = new Map([
        ['E1', { id: 'E1', name: 'Receive_Work_Order', included: true, executed: false, pending: false, enabled: true }],
        ['E2', { id: 'E2', name: 'Draft_Work_Order', included: true, executed: false, pending: false, enabled: false }],
        ['E3', { id: 'E3', name: 'Add_Required_Parts_Skills', included: true, executed: false, pending: false, enabled: false }],
        ['E4', { id: 'E4', name: 'Check_Parts_Inventory', included: true, executed: false, pending: false, enabled: false }],
        ['E5', { id: 'E5', name: 'Procure_Missing_Parts', included: false, executed: false, pending: false, enabled: false }],
        ['E6', { id: 'E6', name: 'Reserve_Technician', included: true, executed: false, pending: false, enabled: false }],
        ['E7', { id: 'E7', name: 'Reserve_Vessel', included: true, executed: false, pending: false, enabled: false }],
        ['E8', { id: 'E8', name: 'Schedule_Maintenance', included: false, executed: false, pending: false, enabled: false }],
        ['E9', { id: 'E9', name: 'Complete_Scheduling', included: true, executed: false, pending: false, enabled: false }],
    ]);

    const relations: Relation[] = [
        // Initial flow
        { from: 'E1', to: 'E2', type: 'response' },
        { from: 'E2', to: 'E3', type: 'response' },

        // After adding parts/skills, check inventory (parallel start)
        { from: 'E3', to: 'E4', type: 'response' },
        { from: 'E3', to: 'E6', type: 'response' },
        { from: 'E3', to: 'E7', type: 'response' },

        // If parts missing, include procurement
        { from: 'E4', to: 'E5', type: 'include' },

        // Procurement blocks scheduling until parts available
        { from: 'E5', to: 'E8', type: 'milestone' },

        // All resources must be ready to schedule
        { from: 'E6', to: 'E8', type: 'condition' },
        { from: 'E7', to: 'E8', type: 'condition' },
        { from: 'E4', to: 'E8', type: 'condition' },

        // After scheduling completes, include completion event
        { from: 'E8', to: 'E9', type: 'include' },
        { from: 'E8', to: 'E9', type: 'response' },
    ];

    return { events, relations };
}
