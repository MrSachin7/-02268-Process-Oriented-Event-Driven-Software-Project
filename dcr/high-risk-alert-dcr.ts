import type { DCRGraph, Relation } from "./engine.js";

export function createHighRiskAlertDCR(): DCRGraph {
    const events = new Map([
        ['E1', { id: 'E1', name: 'Receive_HighRisk_Alert', included: true, executed: false, pending: false, enabled: true }],
        ['E2', { id: 'E2', name: 'Check_Maintenance_Status', included: true, executed: false, pending: false, enabled: false }],
        ['E3', { id: 'E3', name: 'Accept_Case_Engineer', included: false, executed: false, pending: false, enabled: false }],
        ['E4', { id: 'E4', name: 'Escalate_To_Supervisor', included: false, executed: false, pending: false, enabled: false }],
        ['E5', { id: 'E5', name: 'Accept_Case_Supervisor', included: false, executed: false, pending: false, enabled: false }],
        ['E6', { id: 'E6', name: 'Analyze_Threat_Level', included: false, executed: false, pending: false, enabled: false }],
        ['E7', { id: 'E7', name: 'Mark_Under_Maintenance', included: false, executed: false, pending: false, enabled: false }],
        ['E8', { id: 'E8', name: 'Mark_Elevated', included: false, executed: false, pending: false, enabled: false }],
        ['E9', { id: 'E9', name: 'Complete_Process', included: true, executed: false, pending: false, enabled: false }],
    ]);

    const relations: Relation[] = [
        { from: 'E1', to: 'E2', type: 'response' },
        { from: 'E2', to: 'E3', type: 'include' },
        { from: 'E3', to: 'E6', type: 'response' },
        { from: 'E3', to: 'E4', type: 'milestone' },
        { from: 'E4', to: 'E5', type: 'response' },
        { from: 'E5', to: 'E6', type: 'response' },
        { from: 'E6', to: 'E7', type: 'include' },
        { from: 'E6', to: 'E8', type: 'include' },
        { from: 'E7', to: 'E8', type: 'exclude' },
        { from: 'E8', to: 'E7', type: 'exclude' },
        { from: 'E7', to: 'E9', type: 'response' },
        { from: 'E8', to: 'E9', type: 'response' },
    ];

    return { events, relations };
}
