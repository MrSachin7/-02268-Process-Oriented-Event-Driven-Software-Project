import type { DCRGraph, Relation } from "./engine.js";

// DCR Graph for On-Site Maintenance Scheduling & Execution (T1-T11)
export function createMaintenanceSchedulingDCR(): DCRGraph {
    const events = new Map([
        // T1: Entry point - triggered by BPMN
        ['T1', { id: 'T1', name: 'Receive_Work_Order', included: true, executed: false, pending: false, enabled: true }],

        // T2-T4: Initial safety and resource checks (parallel after T1)
        ['T2', { id: 'T2', name: 'Review_PreDeployment_Safety', included: true, executed: false, pending: false, enabled: false }],
        ['T3', { id: 'T3', name: 'Check_Resource_Availability', included: true, executed: false, pending: false, enabled: false }],
        ['T4', { id: 'T4', name: 'Review_Weather_Grid_Risk', included: true, executed: false, pending: false, enabled: false }],

        // T5: Critical decision point
        ['T5', { id: 'T5', name: 'Secure_Final_GoNoGo', included: true, executed: false, pending: false, enabled: false }],

        // T6-T7: Dispatch and signal (T6 can be excluded by T5 No-Go)
        ['T6', { id: 'T6', name: 'Dispatch_Crew_Vessel', included: true, executed: false, pending: false, enabled: false }],
        ['T7', { id: 'T7', name: 'Send_Offline_Signal_CEP', included: true, executed: false, pending: false, enabled: false }],

        // T8-T9: On-site execution
        ['T8', { id: 'T8', name: 'Execute_Safety_Lockout', included: true, executed: false, pending: false, enabled: false }],
        ['T9', { id: 'T9', name: 'Execute_OnSite_Repair', included: true, executed: false, pending: false, enabled: false }],

        // T10-T11: Completion
        ['T10', { id: 'T10', name: 'Turbine_Test_Run', included: true, executed: false, pending: false, enabled: false }],
        ['T11', { id: 'T11', name: 'Close_Work_Order', included: true, executed: false, pending: false, enabled: false }],
    ]);

    const relations: Relation[] = [
        // T1 enables and makes pending the initial checks
        { from: 'T1', to: 'T2', type: 'response' },
        { from: 'T1', to: 'T3', type: 'response' },
        { from: 'T1', to: 'T4', type: 'response' },

        // CONDITION: T4 (data review) must complete before Go/No-Go decision
        { from: 'T4', to: 'T5', type: 'condition' },

        // RESPONSE: T5 decision leads to dispatch (if Go)
        { from: 'T5', to: 'T6', type: 'response' },

        // MILESTONE: T6 (dispatch) obligates T7 (offline signal)
        { from: 'T6', to: 'T7', type: 'milestone' },

        // RESPONSE: After dispatch, crew goes to site
        { from: 'T6', to: 'T8', type: 'response' },

        // CONDITION: T8 (lockout) must complete before repair
        { from: 'T8', to: 'T9', type: 'condition' },

        // RESPONSE: T9 (repair) requires test run next
        { from: 'T9', to: 'T10', type: 'response' },

        // RESPONSE: T10 (test) requires work order closure
        { from: 'T10', to: 'T11', type: 'response' },

        // EXCLUSION: If T5 No-Go, T6 dispatch is excluded (handled via side effect)
        // EXCLUSION: T7 offline signal excludes T10 until signal reverted (simplified for demo)
        { from: 'T7', to: 'T10', type: 'exclude' },
    ];

    return { events, relations };
}
