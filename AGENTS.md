# grAIn Ecosystem: Master Agent Context & Rules
> Last Updated: May 2026 | Developer: Joshua Santelices (Fullstack)
> Codex / Claude Code / Windsurf / Copilot — read this file FIRST before touching any repo.

---

## 0. CRITICAL: Read This Before Every Task

**Always cross-reference all three repos before writing code.**
A change in one repo almost always requires a change in another.
Checklist before executing any task:
- [ ] Which repo(s) are affected?
- [ ] Does the MongoDB schema need updating?
- [ ] Does the Firebase RTDB structure change?
- [ ] Does the Command enum need a new type?
- [ ] Does the ESP Arduino/ESP8266 command string need to match exactly?
- [ ] Does the mobile `grainApi` client need a new method?
- [ ] Does the TypeScript `SensorData` or `Command` type need a new field?

---

## 1. Project Architecture

| Repo | Stack | Role |
|------|-------|------|
| `grAIn-mobile-expo` | React Native (Expo 54), TypeScript | Farmer-facing UI — monitoring + control |
| `grAIn-web-admin` | Next.js 15 (App Router), TypeScript, Tailwind | Admin dashboard + the **sole** backend API |
| `grAIn-ml-service` | Python, Flask, RandomForest (scikit-learn) | AI/ML prediction microservice |
| **Hardware** | Arduino UNO (C++) + ESP8266 (C++) | Physical dryer controller + WiFi bridge |

### Hardware Component Map

| Component | Pin | Purpose |
|-----------|-----|---------|
| DHT22 | D2 | Temperature + Humidity |
| Soil Moisture Sensor | A0 | Grain moisture (0–100%) |
| HX711 Load Cell | D3 (DT), D8 (SCK) | Grain weight (kg) |
| Relay: Heater | D7 | Drying heater |
| Relay: Fan1 | D6 | Primary airflow fan |
| Relay: Fan2 | D5 | Secondary airflow fan |
| Relay: Spare | D4 | Spare relay |
| Relay: Single (Auger) | D11 | Grain auger / conveyor motor |
| Stepper Motor | D12, A1, D13, A2 | Grain stirring mechanism (2048 steps/rev) |
| ESP8266 Serial | RX=D10, TX=D9 (Arduino) / RX=GPIO4, TX=GPIO5 (ESP) | UART bridge |
| Buzzer | GPIO2 (ESP) | Audio alerts |

### Data Flow Summary

```
[DHT22 + Soil + HX711]
        ↓ every 3s
   [Arduino UNO]
        ↓ UART Serial (T:xx,H:xx,M:xx,F:xx,E:xx,S:xx,W:xx)
   [ESP8266 WiFi Bridge]
        ↓ POST /api/sensors/data (every 3s)
   [grAIn-web-admin Backend (Render)]
        ↓                    ↓                  ↓
  [MongoDB Atlas]    [Firebase RTDB]     [ML Service]
        ↓                    ↓
  [Web Admin]         [Mobile App]
        ↓ (SSE)              ↓ (Firebase listener)
   [Dashboard]         [Farmer UI]

[Mobile/Admin] → POST /dryer/:id/{action}
              → Command created in MongoDB
              → Pushed to Firebase RTDB
              → ESP8266 polls GET /commands/:deviceId every 3s
              → ESP8266 sends over UART to Arduino
              → Arduino executes (relay/stepper/etc.)
              → Arduino sends ACK: back over UART
              → ESP8266 sends POST /commands/:deviceId/ack
```

---

## 2. Hardware Command Contract (CRITICAL — Never Break This)

These are the **exact strings** the Arduino `executeCommand()` function understands.
Backend and mobile must produce commands that map to these strings precisely.

| Backend Command Type | Arduino String | Component |
|---|---|---|
| `START` with mode/temp/fan | `START:AUTO:45:80` or `START:MANUAL:58:75` | All relays + stepper ON |
| `STOP` | `STOP` | All relays + stepper OFF |
| `FAN_CONTROL` fanTarget=FAN1 action=ON | `FAN:FAN1:ON` | Relay D6 |
| `FAN_CONTROL` fanTarget=FAN1 action=OFF | `FAN:FAN1:OFF` | Relay D6 |
| `FAN_CONTROL` fanTarget=FAN2 action=ON | `FAN:FAN2:ON` | Relay D5 |
| `FAN_CONTROL` fanTarget=FAN2 action=OFF | `FAN:FAN2:OFF` | Relay D5 |
| `FAN_CONTROL` fanTarget=ALL action=ON | `FAN:ALL:ON` | Relay D5 + D6 |
| `FAN_CONTROL` fanTarget=ALL action=OFF | `FAN:ALL:OFF` | Relay D5 + D6 |
| `HEATER_CONTROL` action=ON | `H1:1` | Relay D7 |
| `HEATER_CONTROL` action=OFF | `H1:0` | Relay D7 |
| `RELAY_CONTROL` action=ON | `R1:1` | Relay D11 (Auger) |
| `RELAY_CONTROL` action=OFF | `R1:0` | Relay D11 (Auger) |
| `STEPPER_CONTROL` action=START | `STEP:START` | Stepper Motor |
| `STEPPER_CONTROL` action=STOP | `STEP:STOP` | Stepper Motor |
| `STEPPER_CONTROL` action=CW | `STEP:CW` | Stepper 1 rev CW |
| `STEPPER_CONTROL` action=CCW | `STEP:CCW` | Stepper 1 rev CCW |
| `STATUS` | `STATUS` | Arduino sends sensor data |

**ESP8266 pollCommands() routing logic:**
- `START` → builds `START:MODE:TEMP:FAN` and sends over UART
- `STOP` → sends `STOP` over UART
- `FAN_CONTROL` → builds `FAN:TARGET:ACTION` and sends over UART
- `RELAY_CONTROL` → sends `R1:1` or `R1:0` over UART *(to be added in ESP firmware)*
- `STEPPER_CONTROL` → sends `STEP:ACTION` over UART *(to be added in ESP firmware)*
- `HEATER_CONTROL` → sends `H1:1` or `H1:0` over UART *(to be added in ESP firmware)*

**Arduino ACK format:** `ACK:COMMANDSTRING` — sent back over UART to ESP8266.
**ESP8266 command dedup:** `lastProcessedCommandId` — skips already-executed command IDs.
**ESP8266 retry logic:** 3 retries with 500ms interval before giving up.

---

## 3. Backend: grAIn-web-admin (Next.js 15)

### Project Structure

```
grAIn-admin/
├── app/
│   ├── api/v1/
│   │   ├── auth/           login, register, me, logout, refresh
│   │   ├── devices/        CRUD + heartbeat + bulk
│   │   ├── sensors/        [deviceId] (GET) + data (POST, PUBLIC — ESP32)
│   │   ├── commands/       [deviceId] (GET/POST) + ack + history
│   │   ├── dryer/[deviceId]/
│   │   │   ├── start/      POST — START command
│   │   │   ├── stop/       POST — STOP command
│   │   │   ├── fan/        POST — FAN_CONTROL
│   │   │   ├── relay/      POST — RELAY_CONTROL       ← NEW (to be added)
│   │   │   ├── stepper/    POST — STEPPER_CONTROL     ← NEW (to be added)
│   │   │   └── heater/     POST — HEATER_CONTROL      ← NEW (to be added)
│   │   ├── sessions/       CRUD + active query
│   │   ├── notifications/  list + read + fcm-token
│   │   ├── alerts/         list + create + read + clear
│   │   ├── ai/predict/     POST — ML proxy with fallback
│   │   ├── analytics/      overview
│   │   ├── events/         SSE stream (admin dashboard)
│   │   ├── health/         PUBLIC
│   │   └── ping/           PUBLIC (keep-alive target)
│   └── dashboard/          Next.js SSR pages
├── lib/
│   ├── models/
│   │   ├── Command.ts      ← needs new command type enums
│   │   ├── SensorData.ts
│   │   ├── Device.ts
│   │   ├── DryingSession.ts
│   │   ├── Alert.ts
│   │   ├── Prediction.ts
│   │   ├── Notification.ts
│   │   └── User.ts
│   └── utils/
│       ├── dryer-command.ts  createDryerCommand() + pushCommandToFirebase()
│       ├── firebase-sync.ts  syncSensorToFirebase()
│       ├── auth.ts
│       ├── handler.ts        withAuth() HOF
│       ├── response.ts       standardized responses
│       ├── rateLimit.ts
│       └── event-stream.ts   SSE broadcaster
```

### MongoDB Schemas

**SensorData** (all fields the ESP sends):
```typescript
{ deviceId, temperature, humidity, moisture, fanSpeed,
  energy, status, solarVoltage, weight, timestamp }
```

**Command** (current + new types needed):
```typescript
command: enum ['START', 'STOP', 'FAN_CONTROL',
               'RELAY_CONTROL',    // ← ADD
               'STEPPER_CONTROL',  // ← ADD
               'HEATER_CONTROL']   // ← ADD
// New fields needed:
relayAction:   enum ['ON', 'OFF']
stepperAction: enum ['START', 'STOP', 'CW', 'CCW']
heaterAction:  enum ['ON', 'OFF']
// Existing:
mode, temperature, fanSpeed, fanTarget, fanAction, status, executedAt
```

**DryingSession** (has `startWeight` + `finalWeight` — already in schema):
```typescript
startWeight?: number   // from HX711 at session start
finalWeight?: number   // from HX711 at session end
```

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/login` | None | Login |
| POST | `/api/v1/auth/register` | None | Register |
| GET | `/api/v1/auth/me` | Bearer | Current user |
| POST | `/api/v1/auth/logout` | Bearer | Revoke token |
| POST | `/api/v1/auth/refresh` | None | Refresh token |
| GET | `/api/v1/devices` | Bearer | List devices |
| POST | `/api/v1/devices` | Admin | Register device |
| GET | `/api/v1/devices/:id` | Bearer | Device detail |
| PATCH | `/api/v1/devices/:id` | Bearer | Update device |
| DELETE | `/api/v1/devices/:id` | Admin | Delete device |
| POST | `/api/v1/devices/:id/heartbeat` | Bearer | Heartbeat |
| GET | `/api/v1/sensors/:deviceId` | Bearer | Historical readings |
| POST | `/api/v1/sensors/data` | **PUBLIC** | ESP32 data ingest |
| POST | `/api/v1/dryer/:id/start` | Bearer | Start dryer |
| POST | `/api/v1/dryer/:id/stop` | Bearer | Stop dryer |
| POST | `/api/v1/dryer/:id/fan` | Bearer | Fan control (FAN1/FAN2/ALL) |
| POST | `/api/v1/dryer/:id/relay` | Bearer | **NEW** Single relay (auger) |
| POST | `/api/v1/dryer/:id/stepper` | Bearer | **NEW** Stepper motor control |
| POST | `/api/v1/dryer/:id/heater` | Bearer | **NEW** Direct heater control |
| GET | `/api/v1/commands/:deviceId` | Public* | ESP32 polls pending commands |
| POST | `/api/v1/commands/:deviceId/ack` | Public* | ESP32 confirms execution |
| GET | `/api/v1/sessions` | Bearer | List sessions |
| POST | `/api/v1/sessions` | Bearer | Start session |
| PATCH | `/api/v1/sessions/:id` | Bearer | Complete/abort |
| GET | `/api/v1/notifications` | Bearer | List notifications |
| PATCH | `/api/v1/notifications` | Bearer | Mark read |
| POST | `/api/v1/notifications/fcm-token` | Bearer | Register FCM token |
| GET | `/api/v1/alerts` | Bearer | List alerts |
| PATCH | `/api/v1/alerts/:id/read` | Bearer | Mark read |
| POST | `/api/v1/alerts/clear` | Bearer | Clear all |
| POST | `/api/v1/ai/predict` | Bearer | AI prediction |
| GET | `/api/v1/analytics/overview` | Bearer | Analytics |
| GET | `/api/v1/events` | None | SSE stream |
| GET | `/api/v1/health` | **PUBLIC** | Health check |
| GET | `/api/v1/ping` | **PUBLIC** | Ping (keep-alive) |

### Standard Response Envelope
```typescript
// Success
{ success: true, data: {...}, timestamp: string }
// Success with warning (207)
{ success: true, data: {...}, warning: string, timestamp: string }
// Error
{ success: false, error: string, errorCode: string, timestamp: string }
// Paginated
{ success: true, data: [...], pagination: { total, count, page, limit, totalPages }, timestamp: string }
```

### Rate Limits
| Tier | Window | Max | Applied To |
|------|--------|-----|------------|
| PUBLIC_API | 60s | 100 | Sensor data, health |
| SENSOR_DATA | 10s | 5 | Per IP on sensor POST |
| COMMAND | 60s | 20 | Dryer commands |
| AUTH | 15min | 20 | Login, register |

### Real-Time: Firebase RTDB Structure
```
grain/
├── devices/{deviceId}/
│   ├── sensors/    ← syncSensorToFirebase() writes here after every ESP POST
│   ├── status      ← "online" / "offline"
│   └── lastActive  ← timestamp
└── commands/{deviceId}/
    ├── pending/{cmdId}   ← createDryerCommand() writes here
    ├── latest            ← latest command object (ESP Firebase listener)
    └── executed          ← ← ← markCommandExecuted() MUST write here (current bug)
```

### Known Issues (Do Not Regress)
1. **Cold Start** — Render free tier sleeps after 15min. `/ping` must be hit every 14min by UptimeRobot.
2. **timeElapsed hardcoded to 60** — `useDryerControl.ts` must calculate from `activeSession.startedAt`.
3. **Command marked executed on fetch** — not on actual ESP ACK. `/ack` endpoint exists but ESP must call it.
4. **Firebase dual-write** — Mobile writes to `pending/latest`, backend writes to `pending/{cmdId}` and `latest`. Remove mobile's direct Firebase write.
5. **ACK path mismatch** — Mobile listens at `commands/{id}/executed` but backend never writes there.

---

## 4. Mobile App: grAIn-mobile-expo (React Native / Expo 54)

### Project Structure
```
grAIn-mobile-expo/
├── app/
│   ├── _layout.tsx           ErrorBoundary → AuthProvider → AppProvider
│   ├── (auth)/               login, signup
│   └── (app)/
│       ├── dashboard.tsx     Sensor overview, active session
│       ├── control.tsx       Start/Stop + fan + NEW: stepper/relay/heater controls
│       ├── sessions.tsx      Drying session tracking
│       ├── ai-prediction.tsx ML predictions
│       ├── analytics.tsx     Charts
│       ├── alerts.tsx        Alert center
│       ├── settings.tsx
│       ├── profile.tsx
│       ├── add-device.tsx
│       └── device/[id].tsx
├── src/
│   ├── api/grain-api-client.ts    ← All REST calls live here
│   ├── context/
│   │   ├── AuthContext.tsx        JWT, user state
│   │   ├── AppContext.tsx         Provider aggregator
│   │   ├── DeviceContext.tsx      Device list
│   │   ├── AlertContext.tsx
│   │   ├── ToastContext.tsx
│   │   └── ServerStatusContext.tsx  Server health + offline queue
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useDevices.ts
│   │   ├── useDevice.ts
│   │   ├── useSensorData.ts          REST polling
│   │   ├── useRealtimeSensor.ts      Firebase RTDB listener
│   │   ├── useDryerControl.ts        Start/Stop state machine
│   │   ├── useFanControl.ts          Fan1 toggle ← extend for Fan2 + ALL
│   │   ├── useStepperControl.ts      ← NEW (to be created)
│   │   ├── useRelayControl.ts        ← NEW (to be created)
│   │   ├── useHeaterControl.ts       ← NEW (to be created)
│   │   ├── useAIPrediction.ts        ML prediction polling
│   │   ├── useDryingSessions.ts      Session CRUD
│   │   ├── useNotifications.ts
│   │   ├── usePushNotifications.ts
│   │   └── useLogout.ts
│   ├── components/
│   │   ├── SensorCard.tsx            ← add Weight card
│   │   ├── FanControlPanel.tsx       ← extend for Fan2 + ALL
│   │   ├── StepperControlPanel.tsx   ← NEW
│   │   ├── RelayControlPanel.tsx     ← NEW
│   │   ├── HeaterControlPanel.tsx    ← NEW
│   │   └── [all existing components]
│   ├── utils/
│   │   ├── enums.ts
│   │   ├── constants.ts
│   │   ├── commandQueue.ts     offline queue
│   │   └── [others]
│   └── types/
```

### TypeScript Types (Source of Truth)
```typescript
interface SensorData {
  _id: string; deviceId: string;
  temperature: number; humidity: number;
  moisture: number; fanSpeed: number;
  energy: number; status: string;
  solarVoltage?: number;  // from INA219/solar panel
  weight?: number;        // from HX711 load cell — ADD if missing
  timestamp: string;
}

interface AIPrediction {
  predictedMoisture30min: number;
  estimatedMinutesToTarget: number;
  recommendation: string;
  recommendationType: 'optimal' | 'warning' | 'critical';
  efficiencyScore: number; confidence: number;
  isDryingComplete: boolean;
  projectedCurve: { time: number; moisture: number }[];
  targetMoisture: number; algorithm: string;
}
```

### grainApi Client Methods
```typescript
// existing
grainApi.dryer.start(deviceId, mode, temperature?, fanSpeed?)
grainApi.dryer.stop(deviceId)
grainApi.dryer.controlFan(deviceId, fan, action)  // fan: 'FAN1' | 'FAN2' | 'ALL'

// to be added
grainApi.dryer.controlRelay(deviceId, action: 'ON' | 'OFF')
grainApi.dryer.controlStepper(deviceId, action: 'START' | 'STOP' | 'CW' | 'CCW')
grainApi.dryer.controlHeater(deviceId, action: 'ON' | 'OFF')
```

### Firebase RTDB Paths (Mobile)
| Path | Direction | Purpose |
|------|-----------|---------|
| `grain/devices/{id}/sensors` | Read (subscribe) | Live sensor display |
| `grain/devices/{id}/status` | Read (subscribe) | Online/offline badge |
| `grain/commands/{id}/executed` | Read (subscribe) | Command ACK detection |
| ~~`grain/commands/{id}/pending/latest`~~ | ~~Write~~ | **REMOVE** — causes dual-write bug |

### Enums & Constants
```typescript
enum SensorThreshold {
  TempWarning = 45, TempDanger = 55, HighTempRisk = 65,
  HumidityWarning = 75, HumidityDanger = 85,
  MoistureTarget = 14, MoistureWarning = 20, MoistureMin = 10,
}
enum ApiTimeout { Default = 30000, Startup = 30000, HealthCheck = 5000 }
```

---

## 5. ML Service: grAIn-ml-service (Python / Flask)

### Architecture
- **Model**: RandomForest trained on **synthetic data only** (Page's thin-layer drying model + Henderson-Thompson EMC)
- **Endpoint**: `POST /predict`
- **Deployment**: Render free tier (sleeps after 15min inactivity — same cold start problem)
- **Timeout from backend**: 15 seconds (`AbortSignal.timeout(15000)`)
- **Cooldown after failure**: 60 seconds before retry

### Prediction Input/Output
```python
# Input (Pydantic model)
class SensorInput(BaseModel):
    temperature: float
    humidity: float
    moisture: float
    fanSpeed: float
    timeElapsed: int    # ← ALWAYS 60 in mobile (bug — must fix)
    solarVoltage: float

# Output
class PredictionOutput(BaseModel):
    predictedMoisture30min: float
    estimatedMinutesToTarget: int
    recommendation: str
    recommendationType: str   # 'optimal' | 'warning' | 'critical'
    efficiencyScore: float
    confidence: float
    isDryingComplete: bool
    projectedCurve: List[dict]
    targetMoisture: float
    algorithm: str
```

### Fallback Chain
```
1. ML Service (RandomForest) — if online + responds < 15s
2. Backend Rule-Based — if ML service down (60s cooldown)
3. Mobile Page's Equation — if backend API fails entirely
```

### Known Gap
- No real drying cycle data collected yet — model runs on synthetic data only.
- `timeElapsed` hardcoded to 60 in `useDryerControl.ts` — must calculate from `activeSession.startedAt`.

---

## 6. Global Design Tokens (Anti-Vibe Coding — Mandatory)

All UI — mobile AND web admin — must follow these exactly.

```
Spacing:       Base-8px grid → 8, 16, 24, 32, 40, 48px
Border Radius: Large containers = 16px | Buttons/Inputs = 8px
Typography:
  Primary:     Inter (sans-serif)
  Sensor Data: JetBrains Mono (monospace) — all numeric sensor values
Colors:
  Primary:            #2D5A27  (Forest Green)
  Status Running:     #10B981  (Emerald)
  Status Stopped/Err: #EF4444  (Red)
  Status Idle:        #6B7280  (Gray)
  Warning:            #F59E0B  (Amber)
  Background:         #F9FAFB
  Card:               #FFFFFF
  Border:             #E5E7EB  (1px solid — no heavy shadows)
  Text Primary:       #111827
  Text Secondary:     #6B7280
```

---

## 7. Communication Protocols

- **Mobile ↔ Backend**: REST (Axios + JWT Bearer token). No direct Firebase writes from mobile except reading sensor data.
- **Web Admin ↔ Backend**: REST (Axios + JWT) + SSE (`/api/v1/events`) for live dashboard.
- **Backend ↔ Firebase**: Firebase Admin SDK (server-side write only).
- **Mobile ↔ Firebase**: Firebase JS SDK (read/subscribe only — sensors + device status + command ACK).
- **Backend ↔ ML Service**: Internal HTTP with 15s timeout + rule-based fallback.
- **ESP8266 ↔ Backend**: Plain HTTP POST (no auth) to `/api/sensors/data` + GET polling `/api/commands/:deviceId`.
- **ESP8266 ↔ Arduino**: UART SoftwareSerial at 9600 baud (newline-terminated command strings).

### The "Check-Before-Write" Rule
> Before modifying any endpoint or schema, check what the consuming side expects.
> - Mobile endpoint change → verify `grain-api-client.ts` method signature
> - Command type change → verify Arduino `executeCommand()` string matching
> - Sensor field added → verify ESP8266 JSON payload + Mongoose schema + TypeScript type

---

## 8. What Needs to Be Implemented NOW

### Priority 1 — New Hardware Components (Blocking)

These new components from the IoT engineer are **not yet supported** in backend or mobile:

#### A. Backend: 3 New Dryer Routes

**File pattern**: Follow `app/api/v1/dryer/[deviceId]/fan/route.ts` exactly.
Use `createDryerCommand()` from `lib/utils/dryer-command.ts` and `pushCommandToFirebase()`.

```
POST /api/v1/dryer/:deviceId/relay
  Body: { relayAction: 'ON' | 'OFF' }
  Creates Command: { command: 'RELAY_CONTROL', relayAction }
  ESP maps to: 'R1:1' or 'R1:0'

POST /api/v1/dryer/:deviceId/stepper
  Body: { stepperAction: 'START' | 'STOP' | 'CW' | 'CCW' }
  Creates Command: { command: 'STEPPER_CONTROL', stepperAction }
  ESP maps to: 'STEP:START', 'STEP:STOP', 'STEP:CW', 'STEP:CCW'

POST /api/v1/dryer/:deviceId/heater
  Body: { heaterAction: 'ON' | 'OFF' }
  Creates Command: { command: 'HEATER_CONTROL', heaterAction }
  ESP maps to: 'H1:1' or 'H1:0'
```

Also: Extend `Command.ts` model enum + extend `fan/route.ts` to accept `fanTarget: 'FAN2' | 'ALL'`.

#### B. ESP8266 Firmware: pollCommands() Routing (IoT Engineer Task)

Tell your IoT partner to add these cases in `pollCommands()`:
```cpp
else if (commandStr == "RELAY_CONTROL") {
  String action = cmd["relayAction"] | "OFF";
  String fwd = (action == "ON") ? "R1:1" : "R1:0";
  arduinoSerial.println(fwd);
  // set pendingCommand, pendingCommandId, retryCount
}
else if (commandStr == "STEPPER_CONTROL") {
  String action = cmd["stepperAction"] | "STOP";
  String fwd = "STEP:" + action;
  arduinoSerial.println(fwd);
}
else if (commandStr == "HEATER_CONTROL") {
  String action = cmd["heaterAction"] | "OFF";
  String fwd = (action == "ON") ? "H1:1" : "H1:0";
  arduinoSerial.println(fwd);
}
```

#### C. Mobile: New Hooks + UI

```
New hooks to create:
  src/hooks/useStepperControl.ts   → POST /dryer/:id/stepper
  src/hooks/useRelayControl.ts     → POST /dryer/:id/relay
  src/hooks/useHeaterControl.ts    → POST /dryer/:id/heater (optional — auto mode covers this)

Extend:
  src/hooks/useFanControl.ts       → add controlFan2() + controlAllFans()
  src/api/grain-api-client.ts      → add relay, stepper, heater methods

New UI in app/(app)/control.tsx — "Advanced Controls" section:
  - Fan2 toggle
  - All Fans toggle
  - Stepper: START/STOP + CW/CCW manual buttons
  - Relay toggle (label: "Auger Motor")
  - Weight display card (from sensorData.weight)
```

---

### Priority 2 — Bug Fixes (Audit Report Issues)

| Fix | File | Change |
|-----|------|--------|
| Fix `timeElapsed` hardcoding | `src/hooks/useDryerControl.ts` line ~180 | `Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 60000)` |
| Remove mobile Firebase dual-write | `src/hooks/useDryerControl.ts` | Remove `set(ref(db, 'grain/commands/.../pending/latest'), ...)` |
| Fix command ACK path | `lib/utils/dryer-command.ts` | `markCommandExecuted()` must write to `grain/commands/{id}/executed` |
| Add keep-alive ping | External (UptimeRobot) | Ping `/api/v1/ping` every 14 minutes on both Render services |

---

### Priority 3 — Enhancements

| Enhancement | Location | Notes |
|-------------|----------|-------|
| Add weight to SensorData TypeScript type | `src/api/grain-api-client.ts` | `weight?: number` |
| Weight sensor card on Dashboard | `app/(app)/dashboard.tsx` | Icon: `scale-outline`, unit: `kg`, show `—` if 0 |
| Weight sensor card on Device Detail | `app/(app)/device/[id].tsx` | Same as above |
| Device offline detection | Backend scheduled job | Mark offline if no sensor data for 5min |
| MongoDB TTL index on SensorData | `lib/models/SensorData.ts` | `expireAfterSeconds: 90 * 24 * 60 * 60` |
| Reduce ML cooldown | `app/api/v1/ai/predict/route.ts` | `COOLDOWN_MS = 10000` (from 60000) |

---

## 9. Execution Workflow (For Every Task)

```
1. ANALYZE
   - Read the relevant files in ALL affected repos
   - Check Command enum, ESP command strings, TypeScript types

2. PLAN
   - State cross-repo impact explicitly
   - Example: "Adding RELAY_CONTROL requires:
       (a) Command schema enum update,
       (b) new /dryer/:id/relay route,
       (c) ESP8266 pollCommands() case,
       (d) useRelayControl hook,
       (e) relay UI in control.tsx"

3. EXECUTE
   - Follow existing file patterns (don't invent new patterns)
   - Use withAuth() for all protected routes
   - Use createDryerCommand() + pushCommandToFirebase() for all dryer commands
   - TypeScript strict — no `any`
   - Follow Design Tokens for all UI

4. VERIFY
   Provide curl commands to validate:
   curl -X POST https://grain-web-admin.onrender.com/api/v1/dryer/GR-001/relay \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"relayAction":"ON"}'
   Expected: { "success": true, "data": { "command": "RELAY_CONTROL", ... } }
```

---

## 10. Environment Variables Reference

### grAIn-web-admin (.env.local)
```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-32-char-secret
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://...firebaseio.com
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
ML_SERVICE_URL=https://grain-ml-service.onrender.com
ANTHROPIC_API_KEY=...
```

### grAIn-mobile-expo (.env)
```env
EXPO_PUBLIC_API_URL=https://grain-web-admin.onrender.com/api
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://...firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
```

---

## 11. Device IDs in Use
| Device ID | Location |
|-----------|----------|
| `GR-001` | Primary test unit (hardcoded in ESP firmware) |

---

*This file is the single source of truth for all AI agents working on the grAIn codebase.*
*Always read this before writing a single line of code.*