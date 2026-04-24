# grAIn Admin — Backend Architecture

> **grAIn** (Grain Resource Automation & Intelligence) is an AI-assisted IoT Solar-Powered Rice Grain Dryer management system. This document covers the full backend architecture of the admin dashboard.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Database Layer](#database-layer)
4. [API Routes](#api-routes)
5. [Authentication & Authorization](#authentication--authorization)
6. [Middleware & Cross-Cutting Concerns](#middleware--cross-cutting-concerns)
7. [Frontend-Backend Integration](#frontend-backend-integration)
8. [Environment Configuration](#environment-configuration)
9. [Docker & Deployment](#docker--deployment)
10. [Scripts & Tooling](#scripts--tooling)
11. [Data Flow Diagrams](#data-flow-diagrams)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Runtime** | Node.js 20 (Alpine) |
| **Language** | TypeScript 5.4 |
| **Database** | MongoDB Atlas (Mongoose 9 ODM) |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **HTTP Client** | Axios |
| **State Management** | Zustand 5 (client-side auth store) |
| **Data Fetching** | TanStack React Query 5 |
| **UI** | TailwindCSS 3, shadcn/ui, Lucide React, Recharts |
| **Realtime (optional)** | Firebase Analytics |
| **Containerization** | Docker + Docker Compose |
| **DB Admin** | Mongo Express |

---

## Project Structure

```
grAIn-admin/
├── app/                          # Next.js App Router
│   ├── api/                      # REST API routes (backend)
│   │   ├── alerts/
│   │   │   ├── route.ts
│   │   │   ├── clear/route.ts
│   │   │   └── [id]/read/route.ts
│   │   ├── analytics/
│   │   │   └── overview/route.ts
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── me/route.ts
│   │   │   └── register/route.ts
│   │   ├── commands/
│   │   │   ├── [deviceId]/route.ts
│   │   │   └── history/route.ts
│   │   ├── devices/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── dryer/
│   │   │   └── [deviceId]/
│   │   │       ├── start/route.ts
│   │   │       └── stop/route.ts
│   │   ├── health/
│   │   │   └── route.ts
│   │   ├── ping/
│   │   │   └── route.ts
│   │   ├── sensors/
│   │   │   ├── data/route.ts
│   │   │   └── [deviceId]/route.ts
│   │   └── users/
│   │       ├── route.ts
│   │       ├── bulk/route.ts          # Bulk delete users (admin-only)
│   │       └── [id]/route.ts
│   ├── auth/
│   │   └── login/                # Login page
│   ├── dashboard/                # Protected dashboard pages
│   │   ├── layout.tsx            # Auth guard + sidebar/topbar
│   │   ├── page.tsx              # Main dashboard
│   │   ├── alerts/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── devices/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── profile/page.tsx       # Admin profile edit + avatar upload
│   │   ├── reports/page.tsx
│   │   ├── settings/page.tsx
│   │   └── users/page.tsx
│   ├── globals.css
│   ├── layout.tsx                # Root layout with Providers
│   └── page.tsx                  # Redirects to /auth/login
├── components/                   # Reusable UI components
│   ├── Card.tsx
│   ├── ChartCard.tsx
│   ├── ConfirmModal.tsx         # Confirmation dialog with loading/variants
│   ├── DataTable.tsx
│   ├── ErrorState.tsx
│   ├── MetricCard.tsx
│   ├── Navbar.tsx                # Topbar with notification bell Popover + user dropdown
│   ├── Providers.tsx             # QueryClient + Auth hydration + Firebase
│   ├── Sidebar.tsx               # Navigation sidebar with grain-logo.jpg
│   ├── StatCard.tsx
│   ├── Table.tsx
│   └── ui/                       # shadcn/ui primitives
│       ├── data-table.tsx
│       ├── dropdown-menu.tsx     # Radix DropdownMenu with collision padding
│       ├── popover.tsx           # Radix Popover for notification bell
│       └── toaster.tsx
├── hooks/                        # Custom React hooks
│   ├── useApi.ts                 # React Query hooks for all API endpoints
│   ├── useAuth.ts                # Auth mutation/query hooks
│   └── useToast.ts              # Toast notification system
├── lib/                          # Core libraries
│   ├── api.ts                    # Axios instance with interceptors (reads token from Zustand)
│   ├── auth-store.ts             # Zustand auth store (isHydrated, updateUser, profileImage)
│   ├── data.ts                   # Mock data for UI prototyping
│   ├── db.ts                     # MongoDB connection (cached)
│   ├── design-system.ts          # Design tokens (colors, spacing, etc.)
│   ├── firebase.ts               # Firebase Analytics init (client-side)
│   ├── firebase-admin.ts         # Firebase Admin SDK (server-side, optional)
│   ├── models/                   # Mongoose models
│   │   ├── Alert.ts
│   │   ├── Command.ts
│   │   ├── Device.ts
│   │   ├── SensorData.ts
│   │   └── User.ts
│   └── utils/                    # Server-side utilities
│       ├── auth.ts               # JWT token generation & verification
│       ├── cors.ts               # CORS header management
│       ├── firebase-sync.ts     # Firebase Realtime DB sync (sensor + command)
│       ├── grain-api-client.ts   # Mobile app API client (Expo-compatible)
│       ├── rateLimit.ts          # In-memory rate limiter
│       ├── response.ts           # Standardized API response helpers
│       └── validation.ts        # Request validation functions
├── middleware.ts                 # Next.js middleware (CORS for /api/*)
├── scripts/
│   ├── seed.ts                   # Database seeder
│   └── check-users.ts           # DB user inspector
├── Dockerfile
├── docker-compose.yml
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Database Layer

### Connection (`lib/db.ts`)

- Uses a **cached connection pattern** with typed `MongooseCache` interface to prevent connection leaks during hot reloads
- Stores the Mongoose connection promise on `global.mongoose`
- Reads `MONGO_URI` from `.env.local` (Next.js auto-loads `.env.local`)
- Atlas-optimized options: `maxPoolSize: 10`, `serverSelectionTimeoutMS: 5000`, `socketTimeoutMS: 45000`, `family: 4`, `dbName: 'grain'`
- **8-second timeout guard** via `Promise.race()` — if connection times out, resets `global.mongoose.promise = null` so the next request retries fresh
- Connection event listeners: `connected`, `error`, `disconnected` — each logged clearly
- On failed/timeout connection: throws `"MongoDB connection timeout — retrying on next request"`
- Failed connections reset the cached promise to allow retries

### Mongoose Models

#### User (`lib/models/User.ts`)

| Field | Type | Constraints |
|---|---|---|
| `name` | String | required, trimmed |
| `email` | String | required, unique, lowercase, trimmed |
| `password` | String | required (bcrypt hashed) |
| `role` | String | enum: `admin`, `farmer` (default: `farmer`) |
| `status` | String | enum: `active`, `inactive` (default: `active`) |
| `profileImage` | String | default: `null` (base64 data URI) |
| `bio` | String | maxlength: 200, default: `''` |
| `phoneNumber` | String | default: `''` |
| `location` | String | default: `''` |
| `createdAt` | Date | auto (timestamps) |
| `updatedAt` | Date | auto (timestamps) |

**Indexes:** `email` (unique)

#### Device (`lib/models/Device.ts`)

| Field | Type | Constraints |
|---|---|---|
| `deviceId` | String | required, unique, trimmed (e.g. `GR-001`) |
| `assignedUser` | ObjectId | ref: `User`, required |
| `status` | String | enum: `online`, `offline` (default: `offline`) |
| `location` | String | optional, trimmed |
| `lastActive` | Date | default: `Date.now` |
| `createdAt` | Date | auto |
| `updatedAt` | Date | auto |

**Indexes:** `deviceId` (unique), `assignedUser`

#### SensorData (`lib/models/SensorData.ts`)

| Field | Type | Constraints |
|---|---|---|
| `deviceId` | String | required, trimmed |
| `temperature` | Number | required |
| `humidity` | Number | required |
| `moisture` | Number | required |
| `fanSpeed` | Number | default: `0`, min: 0, max: 100 (0–100%) |
| `energy` | Number | default: `0`, min: 0 (kWh) |
| `status` | String | enum: `running`, `idle`, `paused`, `error` (default: `idle`) |
| `timestamp` | Date | default: `Date.now` |
| `createdAt` | Date | auto |
| `updatedAt` | Date | auto |

**Indexes:** `{ deviceId: 1, timestamp: -1 }`, `{ timestamp: -1 }`

#### Command (`lib/models/Command.ts`)

| Field | Type | Constraints |
|---|---|---|
| `deviceId` | String | required, trimmed |
| `command` | String | enum: `START`, `STOP` (required) |
| `mode` | String | enum: `AUTO`, `MANUAL` (default: `MANUAL`) |
| `temperature` | Number | optional (target temperature in °C) |
| `fanSpeed` | Number | optional, min: 0, max: 100 (target fan speed %) |
| `status` | String | enum: `pending`, `executed`, `failed`, `error` (default: `pending`) |
| `executedAt` | Date | optional |
| `createdAt` | Date | auto |
| `updatedAt` | Date | auto |

**Indexes:** `{ deviceId: 1, status: 1 }`, `{ createdAt: -1 }`

#### Alert (`lib/models/Alert.ts`)

| Field | Type | Constraints |
|---|---|---|
| `deviceId` | String | required, trimmed |
| `type` | String | enum: `critical`, `warning`, `info` (required) |
| `message` | String | required, trimmed |
| `severity` | Number | default: `0`, min: 0, max: 10 |
| `isRead` | Boolean | default: `false` |
| `createdAt` | Date | auto |
| `updatedAt` | Date | auto |

**Indexes:** `{ deviceId: 1, createdAt: -1 }`, `{ isRead: 1 }`, `{ type: 1 }`

#### Prediction (`lib/models/Prediction.ts`)

| Field | Type | Constraints |
|---|---|---|
| `deviceId` | String | required, trimmed |
| `input.temperature` | Number | required |
| `input.humidity` | Number | required |
| `input.moisture` | Number | required |
| `input.fanSpeed` | Number | required |
| `input.timeElapsed` | Number | required |
| `input.solarVoltage` | Number | optional |
| `output.predictedMoisture30min` | Number | required |
| `output.estimatedMinutesToTarget` | Number | required |
| `output.recommendation` | String | required |
| `output.recommendationType` | String | required (`optimal`, `warning`, `critical`) |
| `output.efficiencyScore` | Number | required (0–100) |
| `output.confidence` | Number | required (0–100) |
| `output.isDryingComplete` | Boolean | required |
| `output.projectedCurve` | Array[{ time, moisture }] | required |
| `output.targetMoisture` | Number | default: 14 |
| `output.algorithm` | String | default: `rule-based-v1` |
| `isDryingComplete` | Boolean | default: `false` |
| `createdAt` | Date | auto |
| `updatedAt` | Date | auto |

**Indexes:** `{ deviceId: 1, createdAt: -1 }`

### Entity Relationships

```
User  1───N  Device        (User._id ← Device.assignedUser)
Device 1───N  SensorData   (Device.deviceId ← SensorData.deviceId)
Device 1───N  Command      (Device.deviceId ← Command.deviceId)
Device 1───N  Alert        (Device.deviceId ← Alert.deviceId)
```

---

## API Routes

All routes are under `/api/`. Every route handles `OPTIONS` for CORS preflight and applies CORS headers to all responses.

### Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Returns `{ status, db, timestamp, version }`. Responds **instantly** (within 500ms) regardless of DB state. DB check uses 1s `Promise.race()` timeout. Always returns HTTP 200 — DB state reported in body (`connected`, `connecting`, `slow`, `disconnected`). Never returns 500/503. CORS headers added directly as fallback. |

### Keep-Alive (Ping)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/ping` | None | Returns `{ pong: true, timestamp }` instantly. No auth, no DB query. Permissive CORS (`*`). **Purpose:** Hit every 10 minutes via cron job or UptimeRobot to prevent Render free tier cold starts (service spins down after 15 min of inactivity). URL: `https://grain-web-admin.onrender.com/api/ping` |

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | None | Validates email/password, checks user status, returns JWT token + user data. Rate limited (AUTH). |
| `POST` | `/api/auth/register` | None | Registers new user. Validates name, email, password. Hashes password with bcryptjs. Default role: `farmer`. Returns JWT token + user data (same format as login). Rate limited (AUTH). |
| `GET` | `/api/auth/me` | JWT | Returns current authenticated user profile from DB. |

**Login/Register Response:**
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": { "id", "name", "email", "role" },
    "expiresIn": 604800
  },
  "timestamp": "..."
}
```

### Devices

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/devices` | JWT | admin/farmer | List devices. Admin sees all; farmer sees only assigned devices. Populates `assignedUser`. |
| `POST` | `/api/devices` | JWT | admin | Register new device. Validates deviceId, checks duplicates, verifies assigned user exists. |
| `GET` | `/api/devices/[id]` | JWT | admin/farmer | Get single device by MongoDB `_id`. Farmers can only access their own devices. |

### Users

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/users` | JWT | admin | List users (paginated). Supports `?page=N&limit=N` (default: page=1, limit=10). Returns `{ data: [...], pagination: { total, page, limit, totalPages } }`. |
| `POST` | `/api/users` | JWT | admin | Create user. Hashes password with bcrypt (salt rounds: 12). Checks email uniqueness. |
| `PATCH` | `/api/users/[id]` | JWT | admin/self | Update user fields (name, email, role, status). Supports password change with `currentPassword` verification (non-admin). Admin can change password without current password. |
| `DELETE` | `/api/users/[id]` | JWT | admin | Delete user permanently. Unassigns all devices first (`Device.updateMany`). Prevents self-deletion. Returns deleted user name/email. |

### Sensor Data

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/sensors/data` | None (public) | **ESP32 endpoint.** Posts temperature, humidity, moisture, fanSpeed, energy, status. Validates ranges. Updates device status to `online`. Rate limited (PUBLIC_API). |
| `GET` | `/api/sensors/[deviceId]` | JWT | Get paginated sensor data for a device. Supports `?hours=N` (1–720) and `?page=&limit=`. Rate limited (SENSOR_DATA). |

**Sensor Data POST body:**
```json
{
  "deviceId": "GR-001",
  "temperature": 35.2,
  "humidity": 72.1,
  "moisture": 38.5,
  "fanSpeed": 75,
  "energy": 2.8,
  "status": "running"
}
```

> `fanSpeed`, `energy`, and `status` are optional. Defaults: `fanSpeed: 0`, `energy: 0`, `status: 'idle'`.

### Commands (IoT Device Polling)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/commands/[deviceId]` | None (public) | **ESP32 polling endpoint.** Returns pending commands for a device. Automatically marks fetched commands as `executed`. |
| `GET` | `/api/commands/history` | JWT | Get command history. Supports `?deviceId=` and `?limit=` query params. Returns sorted by newest first. |

This is the mechanism by which IoT devices (ESP32) receive instructions — they poll this endpoint, retrieve `pending` commands, and the server marks them `executed`.

### Dryer Control

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/dryer/[deviceId]/start` | JWT | Creates a `START` command for the device. Accepts optional body: `{ mode, temperature, fanSpeed }`. Rate limited (COMMAND). |
| `POST` | `/api/dryer/[deviceId]/stop` | JWT | Creates a `STOP` command (mode: MANUAL) for the device. Rate limited (COMMAND). |

Both endpoints verify device ownership (admin can control any device; farmer can only control their own).

**Start Dryer POST body (optional):**
```json
{
  "mode": "AUTO",
  "temperature": 45,
  "fanSpeed": 80
}
```

### Alerts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/alerts` | JWT | Returns paginated alerts. Merges Alert collection with failed/error Commands. Supports `?deviceId=`, `?type=`, `?isRead=`, `?page=&limit=`. |
| `POST` | `/api/alerts` | JWT | Create a new alert. Body: `{ deviceId, type, message, severity }`. Type must be `critical`, `warning`, or `info`. Severity defaults based on type if not provided. |
| `PATCH` | `/api/alerts/[id]/read` | JWT | Mark a single alert as read by ID. |
| `POST` | `/api/alerts/clear` | JWT | Mark all unread alerts as read. |

**Alerts POST body:**
```json
{
  "deviceId": "GR-001",
  "type": "warning",
  "message": "Temperature exceeding threshold",
  "severity": 6
}
```

### Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/analytics/overview` | JWT | Aggregated analytics. Supports `?period=daily|weekly|monthly` and `?deviceId=<deviceId>|all` query params. Returns `moistureTrend`, `dryingCycles`, `energyConsumption`, `avgTemperature`, `avgHumidity`, `totalCycles`, `activeDryers`, `deviceStatusDistribution`. Uses MongoDB aggregation pipeline. |

---

## Authentication & Authorization

### JWT Flow

1. **Login/Register:** `POST /api/auth/login` or `POST /api/auth/register` → bcrypt password comparison/hashing → JWT signed with `JWT_SECRET` (7-day expiry)
2. **Authenticated Requests:** Client sends `Authorization: Bearer <token>` header
3. **Verification:** `getUserFromRequest()` extracts and verifies the JWT on every protected route
4. **Client Storage:** Token stored in `localStorage` (keys: `auth_token`, `auth_user`); Zustand store hydrates from localStorage on app load with JWT expiry validation

### Role-Based Access Control

| Role | Capabilities |
|---|---|
| **admin** | Full access: manage all devices, users, analytics, dryer control |
| **farmer** | Limited: view own devices only, view own sensor data, control own devices |

### Auth Utilities (`lib/utils/auth.ts`)

- `generateToken(payload, expiresIn)` — Signs JWT
- `verifyToken(token)` — Verifies and decodes JWT
- `getTokenFromRequest(request)` — Extracts Bearer token from `Authorization` header
- `getUserFromRequest(request)` — Combines extraction + verification

### Client-Side Auth

**Zustand Store** (`lib/auth-store.ts`) — Single auth system:

- Manages `token`, `user`, `isAuthenticated`, `isLoading`, `isHydrated`
- `user` includes `profileImage` (base64 data URI or null)
- `isHydrated` flag — set to `true` after `hydrate()` completes; pages wait for this before making API calls to avoid requests without a token
- `updateUser(updates)` — partial update user data in store + localStorage (used after profile edits)
- Persists to `localStorage` (`auth_token`, `auth_user`)
- `hydrate()` decodes JWT payload and checks `exp` field — expired tokens are automatically cleared, preventing flash of authenticated UI
- `login()` writes both `auth_token` and `auth_user` to localStorage and updates Zustand state
- `logout()` clears both localStorage keys and resets Zustand state

**Axios Interceptor** (`lib/api.ts`):

- Request interceptor: attaches `Authorization: Bearer <token>` from Zustand `useAuthStore.getState().token` (not localStorage directly)
- Response interceptor: on 401, calls `useAuthStore.getState().logout()` and hard-redirects to `/auth/login`

**Auth Hooks** (`hooks/useAuth.ts`):

- `useLogin()` — calls API, stores token via store's `login()` (single write point)
- `useLogout()` — clears localStorage + Zustand + React Query cache, hard-redirects via `window.location.href`
- `useGetCurrentUser()` — fetches `/auth/me` with 5-min stale time

**Sidebar** uses `useLogout()` hook for proper cleanup (clears React Query cache + hard redirect) instead of direct store manipulation.

### Key UI Components

**Navbar** (`components/Navbar.tsx`):
- Page title from current pathname
- **Notification bell** — Radix Popover with 380px dropdown panel showing alerts from `GET /api/alerts`
  - Unread badge count (9+ for >9)
  - "Mark all as read" button calls `POST /api/alerts/clear`
  - Individual alert click: marks as read + navigates to device page if `deviceId` present
  - Alert icons by type: critical (red XCircle), warning (amber AlertTriangle), info (blue Info)
  - Empty state: BellOff icon + "No notifications yet"
- **User dropdown** — Radix DropdownMenu with View Profile, Settings, Logout
  - Shows `profileImage` avatar (base64) or initials fallback
  - Profile/Settings navigate to `/dashboard/profile` and `/dashboard/settings`

**Sidebar** (`components/Sidebar.tsx`):
- Logo: `next/image` with `/logo/grain-logo.jpg` (36x36, rounded-lg, quality 95)
- Navigation items with active state highlighting and badges (Alerts: unread count, Devices: online count)
- User area: shows `profileImage` avatar or initials, name, email
- Logout button with red styling

**Profile Page** (`app/dashboard/profile/page.tsx`):
- Two-column layout: avatar card (left) + editable fields (right)
- Avatar: 120x120px, "Change Photo" opens file picker (JPEG/PNG/WebP, max 2MB), converts to base64 via FileReader
- "Remove Photo" calls `PATCH /api/users/profile` with `profileImage: null`
- Fields: Full Name (editable), Email (read-only), Bio (textarea, 200 char counter), Phone, Location
- "Save Changes" only enabled when dirty; calls `PATCH /api/users/profile`
- Updates Zustand auth store immediately on save/avatar change
- Link to "Change your password in Settings →"

---

## Middleware & Cross-Cutting Concerns

### Next.js Middleware (`middleware.ts`)

- Matches all `/api/:path*` routes
- Handles CORS preflight (`OPTIONS`) and adds CORS headers to all API responses
- **Public endpoints** (`/api/health`, `/api/sensors/data`, `/api/commands/[deviceId]`): allow wildcard `*` origin (no credentials)
- **All other `/api/*` routes**: allow only allowed origins + credentials
- **Native mobile support**: requests with null/absent `Origin` header are allowed (React Native / Expo don't send Origin)
- **Expo Go support**: `exp://` scheme origins are always allowed
- Development: allows localhost variants + LAN IPs (192.168.x.x, 10.0.x.x, 172.16-31.x.x)
- Production: allows `https://grain-web-admin.onrender.com`, `NEXT_PUBLIC_ADMIN_URL`, `NEXT_PUBLIC_APP_URL`, `.onrender.com` subdomains, and LAN IPs for local testing

### CORS Utility (`lib/utils/cors.ts`)

- `getAllowedOrigins()` — Returns allowed origins array based on `NODE_ENV` (dev: localhost variants; prod: Render URL + env vars)
- `addCorsHeaders(response, origin)` — Adds standard CORS headers; checks origin against allowed list including null/absent origin and `exp://` scheme
- `handleCorsPrelight(request)` — Returns 200 for OPTIONS requests
- `withCors(handler)` — Higher-order function to wrap route handlers with CORS

### Rate Limiting (`lib/utils/rateLimit.ts`)

In-memory rate limiter using a `Map<string, { count, resetTime }>`.

| Preset | Window | Max Requests | Used By |
|---|---|---|---|
| `PUBLIC_API` | 1 min | 100 | `POST /api/sensors/data` (ESP32) |
| `SENSOR_DATA` | 10 sec | 5 | `GET /api/sensors/[deviceId]` |
| `COMMAND` | 1 min | 20 | `POST /api/dryer/*/start`, `POST /api/dryer/*/stop` |
| `AUTH` | 15 min | 20 | `POST /api/auth/login`, `POST /api/auth/register` |

Key generator uses `x-forwarded-for` or `x-real-ip` header. Cleanup runs every hour.

> **Note:** In-memory rate limiting resets on server restart. For production, use Redis.

### Validation (`lib/utils/validation.ts`)

| Function | Validates |
|---|---|
| `isValidEmail(email)` | Email regex |
| `isValidDeviceId(deviceId)` | Alphanumeric + hyphens/underscores, 6–50 chars |
| `isValidTemperature(temp)` | -50°C to 150°C |
| `isValidHumidity(humidity)` | 0–100% |
| `isValidMoisture(moisture)` | 0–1000 |
| `validateLoginRequest(body)` | Email + password (min 6 chars) |
| `validateSensorDataRequest(body)` | deviceId + temperature + humidity + moisture |
| `validateDeviceRequest(body)` | deviceId + optional location |
| `getQueryParams(request, defaults)` | Pagination: page, limit, skip |

### Response Helpers (`lib/utils/response.ts`)

All API responses follow a standardized format:

**Success:**
```json
{
  "success": true,
  "data": <T>,
  "timestamp": "ISO-8601"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Human-readable message",
  "errorCode": "ERROR_CODE",
  "timestamp": "ISO-8601"
}
```

**Paginated:**
```json
{
  "success": true,
  "data": [<T>],
  "pagination": { "total", "count", "page", "limit", "totalPages" },
  "timestamp": "ISO-8601"
}
```

**Error Codes:** `INVALID_INPUT`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMIT`, `INTERNAL_ERROR`, `INVALID_CREDENTIALS`, `ACCOUNT_INACTIVE`, `DEVICE_NOT_FOUND`, `USER_NOT_FOUND`

---

## Frontend-Backend Integration

### Axios Client (`lib/api.ts`)

- Base URL from `NEXT_PUBLIC_API_URL`
- Request interceptor: attaches `Authorization: Bearer <token>` from `localStorage`
- Response interceptor: on 401, clears token and redirects to `/auth/login`

### React Query Hooks (`hooks/useApi.ts`)

| Hook | Type | Endpoint |
|---|---|---|
| `useLogin()` | mutation | `POST /auth/login` |
| `useRegister()` | mutation | `POST /auth/register` |
| `useMe()` | query | `GET /auth/me` |
| `useDevices()` | query | `GET /devices` |
| `useDevice(id)` | query | `GET /devices/[id]` |
| `useRegisterDevice()` | mutation | `POST /devices` |
| `useUpdateDevice()` | mutation | `PATCH /devices/[id]` |
| `useUsers(page, limit)` | query | `GET /users?page=N&limit=N` |
| `useCreateUser()` | mutation | `POST /users` |
| `useUpdateUser()` | mutation | `PATCH /users/[id]` |
| `useDeleteUser()` | mutation | `DELETE /users/[id]` |
| `useBulkDeleteUsers()` | mutation | `DELETE /users/bulk` |
| `useBulkDeleteDevices()` | mutation | `DELETE /devices/bulk` |
| `useSensorData(deviceId, hours)` | query | `GET /sensors/[deviceId]?hours=N` |
| `useStartDryer()` | mutation | `POST /dryer/[deviceId]/start` (accepts mode, temperature, fanSpeed) |
| `useStopDryer()` | mutation | `POST /dryer/[deviceId]/stop` |
| `useCommandHistory(deviceId?, limit)` | query | `GET /commands/history` |
| `useAnalyticsOverview(period, deviceId)` | query | `GET /analytics/overview?period=&deviceId=` |
| `useAlerts(type?)` | query | `GET /alerts?type=` |
| `useMarkAlertRead()` | mutation | `PATCH /alerts/[id]/read` |
| `useClearAllAlerts()` | mutation | `POST /alerts/clear` |

All hooks unwrap the `{ success, data }` envelope via `unwrapResponse()`.

### Auth Hooks (`hooks/useAuth.ts`)

| Hook | Description |
|---|---|
| `useLogin()` | Calls API, stores token in localStorage + Zustand store |
| `useLogout()` | Clears localStorage + Zustand, redirects to `/auth/login` |
| `useGetCurrentUser()` | Fetches `/auth/me` |

### Mobile App Client (`lib/utils/grain-api-client.ts`)

A standalone API client class (`GrainApiClient`) designed for the **React Expo mobile app**:

- Uses a `SecureStore` stub (localStorage-based) for token storage in the Next.js project; replace with `expo-secure-store` when copying to the Expo mobile app
- Provides typed methods: `auth.login()`, `auth.getCurrentUser()`, `sensors.getData()`, `sensors.postData()`, `device.startDryer()`, `device.stopDryer()`, `device.getCommands()`, `device.list()`, `device.getDetails()`, `health.check()`
- Exported as singleton `grainApi` using `EXPO_PUBLIC_API_URL`
- Error handling via `handleError()` which normalizes Axios errors into `ApiError` objects

### Firebase Realtime Database Integration

**Server-side Admin SDK** (`lib/firebase-admin.ts`):

- Initializes Firebase Admin SDK with service account credentials from env vars
- Returns `Database | null` — gracefully returns `null` if env vars are missing (Firebase is optional)
- Used by `firebase-sync.ts` for real-time data sync

**Firebase Sync** (`lib/utils/firebase-sync.ts`):

- `syncSensorToFirebase(deviceId, sensorData)` — Pushes live sensor readings to `grain/devices/{deviceId}/sensors` and updates device status/lastActive
- `pushCommandToFirebase(deviceId, commandId, command)` — Pushes pending commands to `grain/commands/{deviceId}/pending/{commandId}` for ESP32 to poll
- `markCommandExecuted(deviceId, commandId)` — Removes command from Firebase pending + updates MongoDB Command status to `executed`
- All functions gracefully skip Firebase operations if `getRealtimeDb()` returns `null`

**Client-side Analytics** (`lib/firebase.ts`):

- Initializes Firebase client SDK for Analytics tracking
- `initFirebaseAnalytics()` called in `Providers.tsx` on mount
- Supports SSR guard (skips on server-side)

### Next.js Configuration (`next.config.js`)

- `images.unoptimized: true` — disables Next.js image optimization (for static export or custom CDN)
- `allowedDevOrigins: ['http://192.168.1.2']` — allows LAN device access during development (suppresses cross-origin warning)

---

## Environment Configuration

See `.env.example` for all variables:

| Variable | Description | Default |
|---|---|---|
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://...` or standard `mongodb://...` |
| `JWT_SECRET` | JWT signing key (min 32 chars) | — (must change) |
| `NEXT_PUBLIC_API_URL` | API base URL for frontend | `http://localhost:3000/api` |
| `NEXT_PUBLIC_ADMIN_URL` | Admin dashboard URL (CORS) | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Mobile/frontend URL (CORS) | `http://localhost:3001` |
| `EXPO_PUBLIC_API_URL` | API URL for Expo mobile app | `http://localhost:3000/api` |
| `NODE_ENV` | Environment | `development` |
| `ENABLE_FIREBASE_REALTIME` | Feature flag | `false` |
| `ENABLE_EMAIL_NOTIFICATIONS` | Feature flag | `false` |
| `ENABLE_SMS_ALERTS` | Feature flag | `false` |

Firebase config (optional — all optional, system works without Firebase):

| Variable | Description |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase project ID (Admin SDK) |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key (with `\n` escapes) |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Firebase Realtime DB URL (`https://<project>.firebaseio.com`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID (client) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase Analytics measurement ID |

---

## Docker & Deployment

### Dockerfile

- **Base:** `node:20-alpine`
- **Build:** `npm ci --only=production` → `npm run build`
- **Health check:** HTTP GET to `/api/health` every 30s
- **Port:** 3000

### Docker Compose Services

| Service | Image | Port | Description |
|---|---|---|---|
| `app` | Built from Dockerfile | 3000 | Next.js application |
| `mongo` | `mongo:7` | 27017 | MongoDB with root auth + init script (local dev only) |
| `mongo-express` | `mongo-express:latest` | 8081 | Web-based MongoDB admin UI (local dev only) |

All services share the `grain-network` bridge network. MongoDB data persists in the `mongo_data` named volume.

> **Note:** In production, MongoDB Atlas is used instead of the local `mongo` container. The Docker Compose setup is for local development only.

---

## Scripts & Tooling

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Start development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Run ESLint |
| `seed` | `tsx scripts/seed.ts` | Seed database with test data |
| `seed:dev` | `tsx scripts/seed.ts` | Same as seed |

### Seed Data (`scripts/seed.ts`)

Loads `.env.local` via `dotenv.config({ path: resolve(process.cwd(), '.env.local') })` for Atlas compatibility. Calls `connectDB()` before any model operations. Exits with `process.exit(0)` on success, `process.exit(1)` on failure.

Creates:
- **4 Users:** 1 admin (`admin@grain.com` / `admin123`), 3 farmers (`joshua@grain.com`, `kenneth@grain.com`, `prince@grain.com` / `farmer123`)
- **5 Devices:** GR-001 through GR-005, assigned to farmers
- **120 Sensor Data points:** 24 hourly readings per device (randomized temp 28–48°C, humidity 50–90%, moisture 20–50%, fanSpeed 60–90% when running, energy 1.5–4.5 kWh when running, status `running`/`idle`)

### Check Users (`scripts/check-users.ts`)

Utility to list all users in the database with their email, role, and password hash. Uses `connectDB()` and loads `.env.local` via `dotenv.config({ path: resolve(process.cwd(), '.env.local') })` for Atlas compatibility.

---

## Data Flow Diagrams

### IoT Device → Backend → Dashboard

```
┌─────────┐   POST /api/sensors/data    ┌──────────────┐
│  ESP32   │ ──────────────────────────→ │  Next.js API  │
│  Sensor  │   {deviceId, temp, hum, m,  │  Route Handler│
└─────────┘    fanSpeed, energy, status}  └──────┬───────┘
                                                │
                                    ┌───────────┼───────────┐
                                    ▼           ▼           ▼
                              ┌──────────┐ ┌──────────┐ ┌──────────┐
                              │SensorData│ │  Device  │ │ Command  │
                              │  Model   │ │  Model   │ │  Model   │
                              │ (create) │ │(update   │ │ (poll)   │
                              └──────────┘ │ status→  │ └──────────┘
                                           │ online)  │      ▲
                                           └──────────┘      │
                                                             │
┌─────────┐  GET /api/commands/[deviceId]  ┌──────────────┐  │
│  ESP32   │ ←──────────────────────────── │  Next.js API  │  │
│  Device  │   {commands: [...]}           │  (pending →   │  │
└─────────┘                                │   executed)   │──┘
                                           └──────────────┘
```

### User Authentication Flow

```
┌────────┐  POST /api/auth/login    ┌──────────────┐   ┌─────────┐
│ Client  │ ───────────────────────→ │  Next.js API  │ → │  User   │
│ (React) │  {email, password}      │  (bcrypt cmp) │   │  Model  │
└───┬────┘                          └──────┬───────┘   └─────────┘
    │                                      │
    │  {token, user, expiresIn}            │ JWT signed
    │ ←────────────────────────────────────┘
    │
┌───┴────┐  POST /api/auth/register  ┌──────────────┐   ┌─────────┐
│ Client  │ ────────────────────────→ │  Next.js API  │ → │  User   │
│ (React) │  {name, email, password} │  (bcrypt hash)│   │  Model  │
└────────┘                           └──────┬───────┘   └─────────┘
                                            │
                                            │ JWT signed
                                            └──→ {token, user, expiresIn}
    │
    │  Stores token in localStorage
    │  + Zustand auth store
    │
    │  Subsequent requests:
    │  Authorization: Bearer <token>
    ▼
┌────────┐  GET /api/devices     ┌──────────────┐
│ Client  │ ───────────────────→ │  Next.js API  │ → verify JWT → query DB
└────────┘                      └──────────────┘
```

### Dryer Control Flow

```
┌────────┐  POST /api/dryer/[deviceId]/start  ┌──────────────┐
│ Admin / │ ──────────────────────────────────→│  Next.js API  │
│ Farmer  │  {mode, temperature, fanSpeed}     │  (verify JWT  │
└────────┘  Authorization: Bearer <token>     │   + ownership) │
                                              └──────┬───────┘
                                                     │
                                              ┌──────▼───────┐
                                              │  Command     │
                                              │  Model       │
                                              │  (create:    │
                                              │   START,     │
                                              │   mode/temp/ │
                                              │   fanSpeed,  │
                                              │   pending)   │
                                              └──────┬───────┘
                                                     │
┌────────┐  GET /api/commands/[deviceId]  ┌──────────▼─────┐
│  ESP32  │ ←─────────────────────────────│  Command Model  │
│  Dryer  │  {commands: [{START...}]}      │  (pending →     │
└────────┘                                │   executed)     │
      │                                   └────────────────┘
      ▼
  Starts drying cycle
```

---

## API Endpoint Summary

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/health` | — | — | Health check (always 200, DB state in body, 1s DB timeout) |
| `GET` | `/api/ping` | — | — | Keep-alive endpoint (no auth, no DB, instant 200). Hit every 10 min via UptimeRobot to prevent Render cold starts |
| `POST` | `/api/auth/login` | — | AUTH | Login, returns JWT |
| `POST` | `/api/auth/register` | — | AUTH | Register new user, returns JWT |
| `GET` | `/api/auth/me` | JWT | — | Get current user |
| `GET` | `/api/devices` | JWT | — | List devices (role-filtered) |
| `POST` | `/api/devices` | JWT/admin | — | Register new device |
| `GET` | `/api/devices/[id]` | JWT | — | Get device by ID |
| `PATCH` | `/api/devices/[id]` | JWT | admin | Update device fields (location, assignedUser) |
| `GET` | `/api/users` | JWT/admin | — | List users (paginated: `?page=&limit=`) |
| `POST` | `/api/users` | JWT/admin | — | Create new user |
| `PATCH` | `/api/users/[id]` | JWT/admin | — | Update user |
| `DELETE` | `/api/users/[id]` | JWT/admin | — | Delete user (unassigns devices first) |
| `DELETE` | `/api/users/bulk` | JWT/admin | — | Bulk delete users (body: `{ ids: [...] }`). Unassigns devices first. Prevents self-deletion. Returns `{ deletedCount }` |
| `GET` | `/api/users/profile` | JWT | — | Get current user profile (with bio, phone, location, avatar) |
| `PATCH` | `/api/users/profile` | JWT | — | Update profile (name, bio, phoneNumber, location) |
| `POST` | `/api/users/profile/avatar` | JWT | — | Upload avatar (base64, max 2MB) |
| `POST` | `/api/users/change-password` | JWT | — | Change password (current + new + confirm) |
| `POST` | `/api/ai/predict` | JWT | — | AI drying prediction (rule-based, confidence, projected curve) |
| `POST` | `/api/sensors/data` | — | PUBLIC_API | ESP32 posts sensor data |
| `GET` | `/api/sensors/[deviceId]` | JWT | SENSOR_DATA | Get paginated sensor data |
| `GET` | `/api/commands/[deviceId]` | — | — | ESP32 polls for commands |
| `POST` | `/api/dryer/[deviceId]/start` | JWT | COMMAND | Start dryer (with mode/temp/fanSpeed) |
| `POST` | `/api/dryer/[deviceId]/stop` | JWT | COMMAND | Stop dryer |
| `GET` | `/api/alerts` | JWT | — | List alerts (merged with failed commands) |
| `POST` | `/api/alerts` | JWT | — | Create alert |
| `PATCH` | `/api/alerts/[id]/read` | JWT | — | Mark alert as read |
| `POST` | `/api/alerts/clear` | JWT | — | Mark all alerts as read |
| `GET` | `/api/analytics/overview` | JWT | — | Aggregated analytics (period + deviceId filters) |
| `GET` | `/api/commands/history` | JWT | — | Command history (deviceId + limit filters) |
