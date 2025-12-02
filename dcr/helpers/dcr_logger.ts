export function logSiddhi(eventData: any): void {
  console.log(`Received from Siddhi: ${JSON.stringify(eventData)}`);
}

export function logCaseCreation(status: number, caseId: string): void {
  console.log(`[Create Case] ${status}`);
  console.log(`New CASE ID = ${caseId}`);
  console.log(`Created case: ${caseId}`);
}

export function logEventExecution(eventId: string, status: number): void {
  console.log(`[Execute ${eventId}] => ${status}`);
}

export function logPendingEvents(events: string[]): void {
  console.log(`Detected pending events: ${JSON.stringify(events)}`);
}

export function logEnabledEvents(events: string[]): void {
  console.log(`Enabled: ${JSON.stringify(events)}`);
}

export function logExecuting(eventId: string): void {
  console.log(`Executing: ${eventId}`);
}

export function logProcessStart(): void {
  console.log("Processing graph automatically");
}

export function logProcessComplete(): void {
  console.log("No more events → END");
}
