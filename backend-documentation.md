# grAIn Admin — Backend Documentation

> Next.js 15 App Router backend + React Query admin dashboard for IoT grain dryer management.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Models](#database-models)
5. [API Routes](#api-routes)
6. [Authentication & Authorization](#authentication--authorization)
7. [IoT / ESP32 Integration](#iot--esp32-integration)
8. [Firebase Realtime Database](#firebase-realtime-database)
9. [Auto Alert Generation](#auto-alert-generation)
10. [Frontend Hooks (React Query)](#frontend-hooks-react-query)
11. [Utility Libraries](#utility-libraries)
12. [Seed Script](#seed-script)
13. [Environment Variables](#environment-variables)
14. [NPM Scripts](#npm-scripts)

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  ESP32 Device │────▶│  Next.js API     │────▶│  MongoDB     │
│  (IoT Sensor) │◀────│  (App Router)    │     │  (Mongoose)  │
└──────────────┘     └────────┬─────────┘     └─────────────┘
       │                      │
       │              ┌───────▼────────┐
       │              │ Firebase RTDB  │
       │              │ (real-time sync)│
       │              └───────┬────────┘
       │                      │
┌──────▼──────┐     ┌────────▼─────────┐
│  Admin Dash  │◀────│  React Query     │
│  (Browser)   │     │  + Firebase SDK  │
└─────────────┘     └──────────────────┘
```

- **ESP32** pushes sensor data to `/api/sensors/data` and polls/reads commands from Firebase.
- **Next.js API routes** handle CRUD, auth, and business logic.
- **MongoDB** persists all data (users, devices, sensor readings, commands, alerts, predictions).
- **Firebase Realtime Database** provides sub-second sync for live sensor readings and command delivery.
- **Admin dashboard** uses React Query for REST polling + Firebase SDK `onValue` listeners for live data.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.4 |
| Database | MongoDB + Mongoose 9 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Real-time | Firebase Realtime Database (Admin SDK + Client SDK) |
| State | @tanstack/react-query 5 + Zustand |
| UI | React 19, TailwindCSS 3, Lucide Icons, Recharts |
| HTTP Client | Axios |
| Validation | Custom validators in `lib/utils/validation.ts` |
| Rate Limiting | In-memory rate limiter in `lib/utils/rateLimit.ts` |

---

## Project Structure

```
grAIn-admin/
├── app/
│   ├── api/                        # Backend API routes
│   │   ├── auth/
│   │   │   ├── login/route.ts      # POST /api/auth/login
│   │   │   ├── logout/route.ts     # POST /api/auth/logout
│   │   │   └── me/route.ts         # GET  /api/auth/me
│   │   ├── devices/
│   │   │   ├── route.ts            # GET/POST /api/devices
│   │   │   ├── [id]/route.ts       # GET /api/devices/:id
│   │   │   ├── [id]/heartbeat/route.ts  # POST /api/devices/:id/heartbeat
│   │   │   └── bulk/route.ts       # DELETE /api/devices/bulk
│   │   ├── dryer/
│   │   │   └── [deviceId]/
│   │   │       ├── start/route.ts  # POST /api/dryer/:deviceId/start
│   │   │       ├── stop/route.ts   # POST /api/dryer/:deviceId/stop
│   │   │       └── fan/route.ts    # POST /api/dryer/:deviceId/fan
│   │   ├── commands/
│   │   │   ├── [deviceId]/route.ts       # GET /api/commands/:deviceId
│   │   │   └── [deviceId]/ack/route.ts  # POST /api/commands/:deviceId/ack
│   │   ├── sensors/
│   │   │   ├── data/route.ts       # POST /api/sensors/data
│   │   │   └── [deviceId]/route.ts # GET /api/sensors/:deviceId
│   │   ├── alerts/
│   │   │   ├── route.ts            # GET /api/alerts
│   │   │   ├── [id]/read/route.ts  # PATCH /api/alerts/:id/read
│   │   │   └── clear/route.ts      # DELETE /api/alerts/clear
│   │   ├── predictions/
│   │   │   └── route.ts            # GET /api/predictions
│   │   ├── ai/
│   │   │   └── predict/route.ts    # POST /api/ai/predict
│   │   ├── analytics/
│   │   │   └── overview/route.ts   # GET /api/analytics/overview
│   │   └── users/
│   │       ├── route.ts            # GET/POST /api/users
│   │       ├── [id]/route.ts       # GET/PUT/DELETE /api/users/:id
│   │       ├── bulk/route.ts       # DELETE /api/users/bulk
│   │       ├── profile/route.ts    # GET /api/users/profile
│   │       ├── profile/avatar/route.ts  # POST /api/users/profile/avatar
│   │       └── change-password/route.ts # POST /api/users/change-password
│   ├── dashboard/                  # Frontend pages
│   │   ├── page.tsx                # Main dashboard
│   │   ├── devices/
│   │   │   ├── page.tsx            # Device list
│   │   │   └── [id]/page.tsx       # Device detail + controls
│   │   ├── alerts/page.tsx         # Alerts page
│   │   ├── users/page.tsx          # User management
│   │   ├── analytics/page.tsx      # Analytics page
│   │   └── settings/page.tsx       # Settings page
│   └── login/page.tsx              # Login page
├── components/                     # Reusable UI components
├── hooks/
│   ├── useApi.ts                   # React Query hooks for all API calls
│   └── useToast.ts                 # Toast notification hook
├── lib/
│   ├── db.ts                       # MongoDB connection singleton
│   ├── firebase.ts                 # Firebase client SDK init
│   ├── firebase-admin.ts           # Firebase Admin SDK init
│   ├── models/                     # Mongoose models
│   │   ├── User.ts
│   │   ├── Device.ts
│   │   ├── SensorData.ts
│   │   ├── Command.ts
│   │   ├── Alert.ts
│   │   └── Prediction.ts
│   └── utils/
│       ├── auth.ts                 # JWT helpers + revoked token check
│       ├── cors.ts                 # CORS headers + preflight
│       ├── firebase-sync.ts        # Firebase RTDB push/sync helpers
│       ├── rateLimit.ts            # In-memory rate limiter
│       ├── response.ts             # Standardized API response helpers
│       └── validation.ts           # Request body validators
├── scripts/
│   └── seed.ts                     # Database seeder (--reset flag)
└── package.json
```

---

## Database Models

### User (`lib/models/User.ts`)

| Field | Type | Description |
|-------|------|-------------|
| `name` | String (required) | Full name |
| `email` | String (required, unique) | Email address |
| `password` | String (required) | bcrypt hashed password |
| `role` | Enum: `admin`, `farmer` | Authorization level |
| `status` | Enum: `active`, `inactive` | Account status |
| `profileImage` | String (nullable) | Avatar URL |
| `bio` | String (max 200) | Short bio |
| `phoneNumber` | String | Contact number |
| `location` | String | Farm location |
| `revokedTokens` | Array of `{ token, revokedAt }` | JWT revocation list for logout |
| `createdAt` / `updatedAt` | Date | Auto timestamps |

### Device (`lib/models/Device.ts`)

| Field | Type | Description |
|-------|------|-------------|
| `deviceId` | String (required, unique) | Business ID (e.g., `GR-001`) |
| `status` | Enum: `online`, `offline` | Current device status |
| `location` | String | Physical location |
| `lastActive` | Date | Last heartbeat / sensor push |
| `lastMoisture` | Number | Most recent moisture reading |
| `assignedUser` | ObjectId → User | Assigned farmer |
| `createdAt` / `updatedAt` | Date | Auto timestamps |

### SensorData (`lib/models/SensorData.ts`)

| Field | Type | Description |
|-------|------|-------------|
| `deviceId` | String (required, indexed) | Source device |
| `temperature` | Number | °C (-50 to 150) |
| `humidity` | Number | % (0–100) |
| `moisture` | Number | % (0–1000) |
| `fanSpeed` | Number | % (0–100) |
| `energy` | Number | kWh |
| `status` | Enum: `running`, `idle`, `paused`, `error` | Dryer status |
| `solarVoltage` | Number | V |
| `weight` | Number | kg |
| `timestamp` | Date | Reading time |

TTL index: auto-deletes documents older than 90 days.

### Command (`lib/models/Command.ts`)

| Field | Type | Description |
|-------|------|-------------|
| `deviceId` | String (required) | Target device |
| `command` | Enum: `START`, `STOP`, `FAN_CONTROL` | Command type |
| `mode` | Enum: `AUTO`, `MANUAL` | Operation mode |
| `status` | Enum: `pending`, `executed`, `failed` | Execution status |
| `temperature` | Number (optional) | Target temp for START |
| `fanSpeed` | Number (optional) | Target fan speed for START |
| `fanTarget` | Enum: `FAN1`, `FAN2`, `ALL` (optional) | Fan selection |
| `fanAction` | Enum: `ON`, `OFF` (optional) | Fan action |
| `executedAt` | Date | When ESP32 acknowledged |
| `createdAt` / `updatedAt` | Date | Auto timestamps |

### Alert (`lib/models/Alert.ts`)

| Field | Type | Description |
|-------|------|-------------|
| `deviceId` | String (required) | Source device |
| `type` | Enum: `critical`, `warning`, `info` | Alert severity category |
| `message` | String (required) | Human-readable description |
| `severity` | Number (1–10) | Numeric severity |
| `isRead` | Boolean (default: false) | Read status |
| `createdAt` / `updatedAt` | Date | Auto timestamps |

TTL index: auto-deletes alerts older than 30 days.

### Prediction (`lib/models/Prediction.ts`)

| Field | Type | Description |
|-------|------|-------------|
| `deviceId` | String (required) | Source device |
| `input` | Object | Raw sensor input sent to AI |
| `output` | Object | AI prediction result |
| `output.recommendation` | String | Action recommendation |
| `output.confidence` | Number | 0–1 confidence score |
| `output.predictedMoisture30min` | Number | Forecasted moisture |
| `output.estimatedMinutesToTarget` | Number | Time to target moisture |
| `output.efficiencyScore` | Number | 0–1 efficiency rating |
| `isDryingComplete` | Boolean | Whether drying is predicted complete |
| `createdAt` / `updatedAt` | Date | Auto timestamps |

---

## API Routes

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Login, returns JWT (7d expiry) |
| POST | `/api/auth/logout` | JWT | Revokes token by adding to `revokedTokens` |
| GET | `/api/auth/me` | JWT | Returns current user profile |

### Devices

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/devices` | JWT | List devices (admin: all, farmer: own) |
| POST | `/api/devices` | Admin | Register new device |
| GET | `/api/devices/:id` | JWT | Get device by ObjectId or deviceId |
| POST | `/api/devices/:id/heartbeat` | ESP32 | Update status=online, return pending command count |
| DELETE | `/api/devices/bulk` | Admin | Bulk delete devices + related SensorData/Commands |

### Dryer Commands

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/dryer/:deviceId/start` | JWT | Create START command, push to Firebase |
| POST | `/api/dryer/:deviceId/stop` | JWT | Create STOP command, push to Firebase |
| POST | `/api/dryer/:deviceId/fan` | JWT | Create FAN_CONTROL command, push to Firebase |

### Commands

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/commands/:deviceId` | JWT | Fetch pending commands for device |
| GET | `/api/commands/history` | JWT | Command history with pagination |
| POST | `/api/commands/:deviceId/ack` | ESP32 | Acknowledge command execution |

### Sensor Data

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/sensors/data` | ESP32 (rate-limited) | Store sensor reading, auto-generate alerts |
| GET | `/api/sensors/:deviceId` | JWT | Fetch sensor history (hours filter) |

### Alerts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/alerts` | JWT | List alerts (type filter) |
| PATCH | `/api/alerts/:id/read` | JWT | Mark alert as read |
| DELETE | `/api/alerts/clear` | JWT | Clear all read alerts |

### Predictions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/predictions` | JWT | List prediction history (deviceId, limit filters) |
| POST | `/api/ai/predict` | JWT | Request AI prediction for current sensor state |

### Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics/overview` | JWT | Moisture trend, energy consumption, device stats |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Admin | List users (paginated) |
| POST | `/api/users` | Admin | Create user |
| GET | `/api/users/:id` | JWT | Get user by ID |
| PUT | `/api/users/:id` | Admin | Update user |
| DELETE | `/api/users/:id` | Admin | Delete user |
| DELETE | `/api/users/bulk` | Admin | Bulk delete users |
| GET | `/api/users/profile` | JWT | Current user profile |
| POST | `/api/users/profile/avatar` | JWT | Upload avatar |
| POST | `/api/users/change-password` | JWT | Change own password |

---

## Authentication & Authorization

### JWT Flow

1. **Login**: `POST /api/auth/login` → verify email/password → return JWT (7-day expiry)
2. **Request**: Client sends `Authorization: Bearer <token>` header
3. **Verification**: `getUserFromRequest()` in `lib/utils/auth.ts`:
   - Verifies JWT signature and expiry
   - Checks `User.revokedTokens` array — if token is revoked, returns null
   - Fails open if DB is unreachable (availability over strictness)
4. **Logout**: `POST /api/auth/logout` → pushes token to `revokedTokens` + cleans up tokens older than 7 days

### Role-Based Access

| Role | Capabilities |
|------|-------------|
| `admin` | All endpoints, user management, device registration, bulk operations |
| `farmer` | Own devices, sensor data, commands for assigned devices, profile, alerts |

### ESP32 Endpoints (No JWT)

- `POST /api/sensors/data` — rate-limited public endpoint
- `POST /api/devices/:id/heartbeat` — validates device exists by deviceId format
- `POST /api/commands/:deviceId/ack` — validates device exists

---

## IoT / ESP32 Integration

### Data Flow

```
ESP32 ──POST /api/sensors/data──▶ MongoDB + Firebase RTDB
ESP32 ──POST /api/devices/:id/heartbeat──▶ MongoDB (status=online) + Firebase
ESP32 ◀──Firebase onValue(/latest)── Admin command
ESP32 ──POST /api/commands/:deviceId/ack──▶ MongoDB (status=executed) + Firebase
```

### Command Delivery

1. Admin creates command via `/api/dryer/:deviceId/start|stop|fan`
2. Command saved to MongoDB with `status: pending`
3. `pushCommandToFirebase()` writes to two Firebase paths:
   - `grain/commands/{deviceId}/pending/{commandId}` — full command queue
   - `grain/commands/{deviceId}/latest` — single latest command for real-time listener
4. ESP32 listens on `/latest` via Firebase `onValue()` for sub-500ms delivery
5. ESP32 acknowledges via `POST /api/commands/:deviceId/ack`
6. Ack writes to `grain/commands/{deviceId}/executed` for mobile dashboard feedback

### Heartbeat

ESP32 should call `POST /api/devices/:id/heartbeat` every 30–60 seconds. The endpoint:
- Sets `status: online` and `lastActive: now` in MongoDB
- Syncs status to Firebase
- Returns `pendingCommands` count so ESP32 can fetch if > 0

### Sensor Data Validation

- Raw data logged when `DEBUG_SENSORS=true` or in non-production
- Validation returns detailed field-level errors with received values
- Auto alert generation runs after successful save (non-blocking)

---

## Firebase Realtime Database

### Paths

| Path | Written By | Read By | Description |
|------|-----------|---------|-------------|
| `grain/devices/{deviceId}/sensors` | Server (syncSensorToFirebase) | Dashboard (onValue) | Live sensor readings |
| `grain/devices/{deviceId}` | Server (heartbeat) | Dashboard | Device status + lastActive |
| `grain/commands/{deviceId}/pending/{cmdId}` | Server (pushCommandToFirebase) | ESP32 (poll) | Command queue |
| `grain/commands/{deviceId}/latest` | Server (pushCommandToFirebase) | ESP32 (onValue) | Latest command (instant) |
| `grain/commands/{deviceId}/executed` | Server (ack endpoint) | Dashboard (onValue) | Command acknowledgement |

---

## Auto Alert Generation

Triggered automatically after every `POST /api/sensors/data` save (non-blocking).

### Thresholds

| Condition | Alert Type | Severity | Dedup Key |
|-----------|-----------|----------|-----------|
| Temperature > 55°C | `critical` | 9 | `temperature` |
| Humidity > 85% | `warning` | 6 | `humidity` |
| Moisture < 10% | `warning` | 7 | `over-dried` |
| Temperature < 0°C | `critical` | 10 | `sensor` |

### Deduplication

Same alert type won't be created twice within 30 minutes for the same device. Checked by scanning recent alert messages for a keyword match.

---

## Frontend Hooks (React Query)

All hooks are in `hooks/useApi.ts`.

### Query Hooks (with polling intervals)

| Hook | refetchInterval | staleTime | Description |
|------|----------------|-----------|-------------|
| `useDevices()` | 30s | 30s | Device list |
| `useDevice(id)` | — | 5min | Single device |
| `useSensorData(deviceId, hours)` | 60s | 60s | Sensor history |
| `useAlerts(type?)` | 20s | 20s | Alert list |
| `useUsers(page, limit)` | — | 2min | User list |
| `useAnalyticsOverview()` | — | 5min | Dashboard analytics |
| `useCommandHistory(deviceId, limit)` | — | 2min | Command log |
| `usePredictions(deviceId?)` | 60s | 60s | AI prediction history |
| `useUserProfile()` | — | 5min | Current user profile |

All hooks also set `refetchOnWindowFocus: true` where polling is enabled.

### Mutation Hooks

| Hook | Method | Endpoint |
|------|--------|----------|
| `useLogin()` | POST | `/auth/login` |
| `useLogout()` | POST | `/auth/logout` |
| `useStartDryer()` | POST | `/dryer/:deviceId/start` |
| `useStopDryer()` | POST | `/dryer/:deviceId/stop` |
| `useFanControl()` | POST | `/dryer/:deviceId/fan` |
| `useRequestPrediction()` | POST | `/ai/predict` |
| `useMarkAlertRead()` | PATCH | `/alerts/:id/read` |
| `useClearReadAlerts()` | DELETE | `/alerts/clear` |
| `useCreateUser()` | POST | `/users` |
| `useUpdateUser()` | PUT | `/users/:id` |
| `useDeleteUser()` | DELETE | `/users/:id` |
| `useBulkDeleteUsers()` | DELETE | `/users/bulk` |
| `useBulkDeleteDevices()` | DELETE | `/devices/bulk` |
| `useChangePassword()` | POST | `/users/change-password` |
| `useUploadAvatar()` | POST | `/users/profile/avatar` |

---

## Utility Libraries

### `lib/utils/auth.ts`

- `getUserFromRequest(request)` — async; extracts JWT, verifies, checks revokedTokens
- `verifyToken(token)` — synchronous JWT verification
- `generateToken(payload)` — creates 7-day JWT

### `lib/utils/cors.ts`

- `addCorsHeaders(response, origin)` — attaches CORS headers
- `handleCorsPrelight(request)` — handles OPTIONS preflight

### `lib/utils/firebase-sync.ts`

- `pushCommandToFirebase(deviceId, commandId, command)` — writes to `/pending` + `/latest`
- `markCommandExecuted(deviceId, commandId)` — removes from `/pending`, updates MongoDB
- `syncSensorToFirebase(deviceId, data)` — writes sensor data to `/sensors` path

### `lib/utils/rateLimit.ts`

- `checkRateLimit(request, limit)` — in-memory sliding window rate limiter
- Predefined limits: `PUBLIC_API` (30/min), `AUTH` (5/min), `COMMAND` (10/min), `API` (60/min)

### `lib/utils/response.ts`

- `successResponse(data, status?)` — standardized success envelope `{ success, data }`
- `errorResponse(message, code, status?)` — standardized error envelope `{ success, error: { message, code } }`
- Error codes enum: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `DEVICE_NOT_FOUND`, `USER_NOT_FOUND`, `INVALID_INPUT`, `CONFLICT`, `RATE_LIMIT`, `INTERNAL_ERROR`

### `lib/utils/validation.ts`

- `validateLoginRequest(body)` — email + password
- `validateSensorDataRequest(body)` — all sensor fields with range checks
- `validateDeviceRequest(body)` — deviceId format + location
- `getQueryParams(request, defaults)` — pagination param parser
- Individual validators: `isValidEmail`, `isValidDeviceId`, `isValidTemperature`, `isValidHumidity`, `isValidMoisture`

### `lib/db.ts`

- `dbConnect()` — Mongoose connection singleton (cached across hot reloads)

### `lib/firebase-admin.ts`

- `getRealtimeDb()` — returns Firebase Admin `Database` instance (or null if unconfigured)

### `lib/firebase.ts`

- `getFirebaseApp()` — returns Firebase Client SDK `App` instance for browser

---

## Seed Script

```bash
# Normal seed (clears User, Device, SensorData only)
npm run seed

# Full reset (clears ALL collections including Commands, Alerts, Predictions)
npm run seed:reset
```

### Seed Data

- **4 users**: admin@grain.com (admin), joshua@grain.com, kenneth@grain.com, prince@grain.com (farmers)
- **5 devices**: GR-001 through GR-005, assigned to farmers
- **600 sensor readings**: 120 per device with realistic drying curve

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase client API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Yes | Firebase RTDB URL |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `FIREBASE_ADMIN_PROJECT_ID` | Yes | Firebase Admin project ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Yes | Firebase Admin client email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Yes | Firebase Admin private key |
| `DEBUG_SENSORS` | No | Set `true` to log raw ESP32 data in production |

---

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Run ESLint |
| `lint:fix` | `next lint --fix` | Auto-fix lint issues |
| `type-check` | `tsc --noEmit` | TypeScript type checking |
| `seed` | `tsx scripts/seed.ts` | Seed database |
| `seed:dev` | `tsx scripts/seed.ts` | Seed database (dev) |
| `seed:reset` | `tsx scripts/seed.ts --reset` | Full DB reset + seed |
