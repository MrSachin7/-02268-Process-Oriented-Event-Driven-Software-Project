# Wind Turbine Monitoring - Process-Oriented Event-Driven System

Process automation system for wind turbine monitoring using BPMN (Camunda), DCR graphs, and Siddhi CEP.

## Architecture

```
Sensor Data → Siddhi CEP → BPMN Processes (Camunda) + DCR Process
                    ↓
              Backend (TypeScript/Express)
                    ↓
              MySQL Database
```

## Business Processes

### BPMN Processes (Camunda - 5 processes)
1. **Emergency Shutdown** - Catastrophic event handling
2. **Maintenance Work Order** - Work order management with spare parts
3. **Routine Data Analysis** - Daily automated sensor analysis
4. **Spare Part Procurement** - Vendor interaction for part ordering
5. **Maintenance Inspection** - Quality inspection workflow

### DCR Process (Custom Engine - 1 process)
6. **High Risk Alert (DCR)** - Declarative workflow for alert handling
   - Events: Receive Alert → Check Status → Accept Case → Analyze Threat → Mark Status
   - Relations: Conditions, Responses, Include/Exclude, Milestones
   - State persisted in MySQL

## External Event Sources

1. **Vibration Sensors** - HTTP stream to Siddhi
2. **Temperature Sensors** - HTTP stream to Siddhi

## CEP Processing (Siddhi)

- Daily aggregations (min, max, avg, count)
- Real-time alerts (vibration > 8.0, temperature > 85.0)
- Routes to both BPMN and DCR processes

## Bi-directional Communication

**CEP → PAIS:**
- High risk alerts trigger Camunda BPMN process
- High vibration alerts trigger DCR process
- Daily reports correlation to RoutineDataAnalysis

**PAIS → CEP:**
- Status updates from processes to backend
- Maintenance status changes to database

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start MySQL
```bash
docker-compose up -d
```

### 3. Start Camunda 8
- Cloud: https://camunda.com/get-started/
- Self-hosted: Docker Compose

Deploy BPMN files from `/bpmn` directory.

### 4. Start Siddhi CEP
```bash
# Using Siddhi Runner
siddhi-runner -Dapps=siddhi/POESS_project.siddhi
```

### 5. Run Application
```bash
npm run dev
```

## Testing

**Send vibration data:**
```bash
curl -X POST http://localhost:8081/streams/vibrations \
  -H 'Content-Type: application/json' \
  -d '{"turbineID":"T-1001","vibrationLevel":9.5,"timestamp":1706000000000}'
```

**Check DCR instance state:**
```bash
curl http://localhost:3000/api/dcr/state/{instanceId}
```

## Database Schema

- `TurbinesTable` - Turbine status
- `MaintainanceWorks` - Work orders
- `Inventory` - Spare parts
- `DCRInstances` - DCR process instances
- `DCREventStates` - DCR event states

## API Endpoints

- `POST /api/change-turbine-status` - Update turbine status
- `POST /api/change-turbine-maintainance-status` - Update maintenance status
- `POST /api/dcr/start-high-risk-alert` - Start DCR process
- `POST /api/dcr/execute-event/:instanceId` - Execute DCR event
- `GET /api/dcr/state/:instanceId` - Get DCR state

## Project Requirements Met

✅ 6 business processes (5 BPMN + 1 DCR)  
✅ Camunda PAIS implementation  
✅ DCR PAIS implementation (custom engine)  
✅ 2 external event sources  
✅ Siddhi CEP with aggregations and alerts  
✅ Bi-directional PAIS ↔ CEP communication
