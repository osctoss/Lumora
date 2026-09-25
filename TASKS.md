# IntelliSave — Implementation Task Manager

> **Mode:** Hackathon fast-pace. Backend-first, then UI. Working code over perfect code.
> **Stack:** Node.js + Fastify + Prisma + PostgreSQL (API) | React + Vite + Tailwind + shadcn/ui (Web)
> **Rule:** Every checkbox = a working, testable deliverable. No skipping steps.

---

## Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked / needs decision
- `[S]` Can be done in parallel / simultaneously

---

## PHASE 0 — Project Scaffold and Tooling
> Goal: Monorepo boots, TypeScript compiles, PostgreSQL connects.
> **Est. time: ~1-1.5 hrs**

- [x] **P0.1** Initialize pnpm monorepo (`pnpm-workspace.yaml`, root `package.json`, `.gitignore`, `.env.example`)
- [x] **P0.2** Create workspace layout: `apps/web`, `apps/api`, `packages/shared`
- [x] **P0.3** Configure `tsconfig.base.json` + per-package `tsconfig.json`
- [x] **P0.4** Configure ESLint + Prettier (root `eslint.config.js`, `prettier.config.js`)
- [x] **P0.5** Set up Docker Compose (`docker-compose.yml`) — PostgreSQL service only
- [x] **P0.6** Set up `apps/api` — Fastify + TypeScript (`package.json`, `src/server.ts`, `src/app.ts`)
- [x] **P0.7** Set up `apps/web` — Vite + React + TypeScript (`vite.config.ts`, `index.html`, `src/main.tsx`)
- [x] **P0.8** Install Tailwind CSS + shadcn/ui in `apps/web`
- [x] **P0.9** Verify: `pnpm dev` starts both API (port 3001) and Web (port 5173) without errors

**Exit gate:** Both processes start. Web shows blank Vite page. API responds to `GET /` with `{ status: "ok" }`. [COMPLETED]

---

## PHASE 1 — Database and Prisma Schema
> Goal: Full schema migrated, seed runs, data persists.
> **Est. time: ~1.5-2 hrs**

- [x] **P1.1** Install Prisma in `apps/api`. Configure datasource (PostgreSQL, `.env` `DATABASE_URL`)
- [x] **P1.2** Write full `prisma/schema.prisma` — all models and enums from spec Section 25:
  - `Building`, `Room`, `RoomSettings`
  - `Sensor`, `SensorReading`, `RoomTelemetry`
  - `DeviceCatalog`, `Device`, `DevicePolicy`, `DeviceStateEvent`, `DeviceOperatingPeriod`
  - `Person`, `OccupancyEvent`
  - `EnergyBaseline`
  - `Alert`, `Recommendation`, `ActionEvent`
  - `SavingsSession`, `SavingsEvent`
  - `CalibrationSession`
  - `SimulationRun`, `SimulationScenarioEvent`
  - `SystemSetting`, `EventLog`
  - All enums: `RoomStatus`, `SensorType`, `DeviceType`, `DeviceState`, `OccupancyState`, `AlertSeverity`, `AlertType`, `RecommendationStatus`, `EventSource`, `SavingsSessionStatus`, `CalibrationStatus`
- [~] **P1.3** Run `prisma migrate dev --name init` / `prisma db push` — (Deferred: awaiting user's PostgreSQL/Docker installation)
- [x] **P1.4** Write `prisma/seed.ts`:
  - Seed Building "IntelliSave Demo Building"
  - Seed DeviceCatalog — all 9 types (AC, Fan, LED, Freezer, Laptop Port, Tube Light, Desktop, Projector, Generic)
  - Seed SystemSettings — tariff Rs8/kWh, CO2 factor 0.82 kgCO2/kWh, default comfort thresholds
  - Seed Room 101 — Classroom, Floor 1, Capacity 30
  - Auto-create 7 sensors for Room 101 (PIR, mmWave, Temp, Humidity, CO2, Light, Meter)
  - Auto-create `RoomSettings` for Room 101 with all defaults
  - Auto-create demo devices: 1xAC, 2xLED, 1xFan, 1xFreezer, 1xLaptopPort with correct policies
- [~] **P1.5** Run seed: `pnpm prisma db seed` — (Deferred: awaiting user's PostgreSQL/Docker installation)

**Exit gate:** Prisma schema, types, generated client, and seed script are fully created and compiling. Ready for immediate db push once PostgreSQL is started. [COMPLETED]

---

## PHASE 2 — Shared Types Package
> Goal: Both `apps/api` and `apps/web` import from `@intellisave/shared` without error.
> **Est. time: ~45 mins**

- [x] **P2.1** Set up `packages/shared/package.json` + `tsconfig.json`
- [x] **P2.2** Create `packages/shared/src/domain/` — TypeScript interfaces:
  - `room.ts` — `RoomSimulationState`, `RoomDto`, `OccupancyState`
  - `device.ts` — `DeviceDto`, `DevicePolicy`, `DeviceState`, `DeviceType`
  - `sensor.ts` — `SensorDto`, `SensorType`
  - `person.ts` — `PersonDto`
  - `savings.ts` — `SavingsSessionDto`, `SavingsEventDto`
  - `alerts.ts` — `AlertDto`, `RecommendationDto`
- [x] **P2.3** Create `packages/shared/src/events/event-types.ts` — all WebSocket event type strings
- [x] **P2.4** Create `packages/shared/src/events/event-schema.ts` — base `IntelliSaveEvent<T>` type
- [x] **P2.5** Create `packages/shared/src/api/` — request/response interfaces for each API group
- [x] **P2.6** Create `packages/shared/src/constants/` — device defaults, thresholds, sensor types
- [x] **P2.7** Export everything from `packages/shared/src/index.ts`
- [x] **P2.8** Add `@intellisave/shared` as a workspace dep in both `apps/api` and `apps/web`

**Exit gate:** Both apps compile with shared types imported. No `any` in shared package. [COMPLETED]

---

## PHASE 3 — Backend Core Infrastructure
> Goal: Fastify app with DB connection, WebSocket server, error handling, and logging.
> **Est. time: ~1 hr**

- [x] **P3.1** Create `apps/api/src/db/prisma.ts` — singleton PrismaClient
- [x] **P3.2** Create `apps/api/src/config/env.ts` — validated env vars (PORT, DATABASE_URL, etc.)
- [x] **P3.3** Create `apps/api/src/config/defaults.ts` — simulation defaults, comfort thresholds
- [x] **P3.4** Set up Fastify app: CORS, JSON schema validation, Zod integration, error handler
- [x] **P3.5** Install and configure Socket.IO on the Fastify server
- [x] **P3.6** Create `apps/api/src/websocket/socket-server.ts` — Socket.IO server init
- [x] **P3.7** Create `apps/api/src/websocket/event-publisher.ts` — `publish(eventType, roomId, payload)` helper
- [x] **P3.8** Create `apps/api/src/utils/` — `logger.ts` (pino), `math.ts`, `time.ts`, `errors.ts`
- [x] **P3.9** Create `apps/api/src/modules/events/event-bus.ts` — internal pub/sub for decoupling modules
- [x] **P3.10** Create `apps/api/src/modules/events/event-log.service.ts` — persists to `EventLog` table

**Exit gate:** API starts. `GET /api/health` returns DB status + WS status. WS connection works from browser console. [COMPLETED]

---

## PHASE 4 — Simulation Engine (Heart of the Backend)
> Goal: The simulation clock ticks. Room state evolves. Sensors produce readings. Most critical phase.
> **Est. time: ~3-4 hrs**

### 4A — Simulation Clock and State
- [x] **P4A.1** Create `simulation-clock.ts` — manages `currentTime`, `speed`, `status` (RUNNING/PAUSED)
- [x] **P4A.2** Create `simulation-state.ts` — in-memory `Map<roomId, RoomSimulationState>` store
- [x] **P4A.3** Create `simulation-engine.ts` — central orchestrator, one `setInterval` scheduler
- [x] **P4A.4** On startup: load all active rooms from DB into in-memory state
- [x] **P4A.5** Implement simulation speed to real-time interval mapping (1x=60s, 5x=12s, 10x=6s, 30x=2s)

### 4B — Environmental Models (per tick)
- [x] **P4B.1** Create `occupancy-model.ts` — state machine: OCCUPIED -> VACANCY_PENDING -> VACANT
- [x] **P4B.2** Create `environment-model.ts` — per-tick update for all environmental vars:
  - `temperature-model` — thermal equation: T_next = T_current + ((T_outside - T_current) / tau) * dt + heat_gain - hvac_effect + noise
  - `co2-model` — CO2 equation: CO2_next = CO2_current + (occupancy * generation_rate - ventilation * (CO2 - outdoor)) * dt
  - `humidity-model` — gradual change based on outside, occupancy, HVAC
  - `ambient-light-model` — time-of-day daylight curve

### 4C — Sensor Models
- [x] **P4C.1** Create `sensor-models/occupancy-pir.ts` — movement detection from people state
- [x] **P4C.2** Create `sensor-models/occupancy-mmwave.ts` — presence detection from people state
- [x] **P4C.3** Create `sensor-models/temperature.ts` — reads from room state + bounded noise
- [x] **P4C.4** Create `sensor-models/humidity.ts` — reads from room state + bounded noise
- [x] **P4C.5** Create `sensor-models/co2.ts` — reads from room state + bounded noise
- [x] **P4C.6** Create `sensor-models/ambient-light.ts` — reads from room state
- [x] **P4C.7** Create `sensor-models/energy-meter.ts` — sums all device power + unregistered loads

### 4D — Device Models
- [x] **P4D.1** Create `device-models/base-device-model.ts` — state + power calculation interface
- [x] **P4D.2** Create `device-models/led-model.ts` — OFF=0W, ON=rated*qty
- [x] **P4D.3** Create `device-models/fan-model.ts` — OFF/LOW/MEDIUM/HIGH speed states
- [x] **P4D.4** Create `device-models/ac-model.ts` — OFF/STARTING/COOLING/IDLE state machine, power varies with temp delta
- [x] **P4D.5** Create `device-models/freezer-model.ts` — protected, IDLE/COMPRESSOR_ON/COMPRESSOR_OFF cycling
- [x] **P4D.6** Create `device-models/laptop-port-model.ts` — protected, variable charging states
- [x] **P4D.7** Create `device-models/generic-device-model.ts` — ON=rated, OFF=0

### 4E — Simulation Tick Loop (19 steps from spec 7.1)
- [x] **P4E.1** Step 1-2: Advance simulation timestamp, process queued user events
- [x] **P4E.2** Step 3-4: Update people/presence, update occupancy state machine
- [x] **P4E.3** Step 5-6: Update environmental room state, update sensor models, write `SensorReading` rows
- [x] **P4E.4** Step 7-9: Update device state machines, calculate device power, calculate room meter (actual power)
- [x] **P4E.5** Step 10-12: Calculate expected registered power, calculate unaccounted power, calculate comfort score
- [x] **P4E.6** Step 13-15: Run anomaly/waste detection, run automation policy engine, generate action events
- [x] **P4E.7** Step 16-17: Calculate savings, store `RoomTelemetry` row
- [x] **P4E.8** Step 19: Publish WebSocket events (compact, not full state dump)

**Exit gate:** Start API. Every 2-60 seconds a tick fires. Room temperature changes. `GET /api/rooms/:id/state` returns evolved values. [COMPLETED]

---

## PHASE 5 — Automation, Comfort and Savings Engines
> Goal: Devices respond to occupancy automatically. Savings are calculated.
> **Est. time: ~2-3 hrs**

### 5A — Comfort Engine
- [x] **P5A.1** Create `comfort/comfort-engine.ts` — weighted score from temp, humidity, CO2
- [x] **P5A.2** Implement `temperatureScore`, `humidityScore`, `airQualityScore` (0-100 each)
- [x] **P5A.3** Implement `comfortScore = 0.5*temp + 0.2*humidity + 0.3*co2`
- [x] **P5A.4** Implement comfort protection: block aggressive HVAC reduction if `comfortScore < threshold && occupied`

### 5B — Automation Engine
- [x] **P5B.1** Create `automation/policy-engine.ts` — reads `DevicePolicy` records from DB/cache
- [x] **P5B.2** Create `automation/occupancy-rules.ts` — ON when occupied, OFF when vacant logic
- [x] **P5B.3** Create `automation/action-engine.ts` — executes TURN_ON, TURN_OFF, SET_SPEED, SET_TEMPERATURE
- [x] **P5B.4** Create `automation/manual-override.ts` — respects override, skip automation if active
- [x] **P5B.5** Implement vacancy timer: start when last person leaves, cancel if someone returns
- [x] **P5B.6** Implement priority chain: Safety -> Manual Override -> Occupancy -> Comfort -> Policy -> Energy

### 5C — Analytics and Anomaly Engine
- [x] **P5C.1** Create `analytics/baseline-engine.ts` — EMA update `B_t = alpha*P_t + (1-alpha)*B_(t-1)`
- [x] **P5C.2** Create `analytics/deviation.ts` — `deviationPct = (actual - expected) / max(expected, epsilon) * 100`
- [x] **P5C.3** Create `analytics/waste-detector.ts` — vacancy waste detection with 0-100 scoring
- [x] **P5C.4** Create `analytics/anomaly-engine.ts` — occupied-room anomaly detection
- [x] **P5C.5** Create `analytics/confidence.ts` — LOW/MEDIUM/HIGH based on sample count + freshness

### 5D — Savings Engine
- [x] **P5D.1** Create `savings/counterfactual-engine.ts` — shadow power model: what would power be without action?
- [x] **P5D.2** Create `savings/session-manager.ts` — open/close/interrupt `SavingsSession` records
- [x] **P5D.3** Create `savings/savings-engine.ts` — per-tick: `savedKwh = max(0, counterfactual - actual) * dt`
- [x] **P5D.4** Accumulate `sessionSavedKwh`, `savedCostInr` (* tariff), `avoidedCo2Kg` (* emission factor)

**Exit gate:** Add person -> LED/Fan/AC turn ON (events logged). Remove person -> LED/Fan OFF, AC vacancy timer starts. Fast-forward -> AC OFF. Savings session shows non-zero kWh saved. [COMPLETED]

---

## PHASE 6 — REST API Routes
> Goal: All API endpoints from spec Section 22 implemented and returning correct data.
> **Est. time: ~2-3 hrs**

### 6A — Core Room and Building APIs
- [x] **P6A.1** `GET /api/health` — DB + WS status
- [x] **P6A.2** `GET /api/dashboard/overview` — building KPIs (sum of all rooms)
- [x] **P6A.3** `GET /api/dashboard/rooms` — all room cards with live state
- [x] **P6A.4** `GET /api/dashboard/energy-series` — time-series for building chart
- [x] **P6A.5** `GET /api/dashboard/events` — recent events
- [x] **P6A.6** `GET /api/rooms` — list all active rooms
- [x] **P6A.7** `POST /api/rooms` — create room + auto-create 7 sensors + RoomSettings + default state
- [x] **P6A.8** `GET /api/rooms/:roomId` — room details
- [x] **P6A.9** `PATCH /api/rooms/:roomId` — update room metadata
- [x] **P6A.10** `DELETE /api/rooms/:roomId` — soft archive
- [x] **P6A.11** `GET /api/rooms/:roomId/state` — full simulation state snapshot

### 6B — Telemetry and Sensors
- [x] **P6B.1** `GET /api/rooms/:roomId/sensors` — all sensor metadata
- [x] **P6B.2** `GET /api/rooms/:roomId/telemetry` — time-series telemetry
- [x] **P6B.3** `GET /api/rooms/:roomId/energy` — energy summary
- [x] **P6B.4** `GET /api/energy/accounting/:roomId` — power accounting for room chart

### 6C — Devices
- [x] **P6C.1** `GET /api/devices/room/:roomId` — list devices with current state
- [x] **P6C.2** `POST /api/devices` — add device
- [x] **P6C.3** `GET /api/devices/:deviceId` — device details + policy
- [x] **P6C.4** `PATCH /api/devices/:deviceId/policy` — update device settings + policy
- [x] **P6C.5** `DELETE /api/devices/:deviceId` — remove device
- [x] **P6C.6** `PATCH /api/devices/:deviceId/layout` — persist wall position (x, y)
- [x] **P6C.7** `PATCH /api/devices/:deviceId/state` — TURN_ON/TURN_OFF (check protection -> create override -> log event)

### 6D — People
- [x] **P6D.1** `GET /api/rooms/:roomId/people` — list active people
- [x] **P6D.2** `POST /api/rooms/:roomId/occupancy` — update people & presence
- [x] **P6D.3** `DELETE /api/rooms/:roomId/people/:personId` — remove person

### 6E — Energy Accounting and Savings
- [x] **P6E.1** `GET /api/energy/accounting/:roomId` — actual vs expected vs unaccounted
- [x] **P6E.2** `GET /api/savings` — savings KPIs
- [x] **P6E.3** `GET /api/savings/sessions` — list sessions
- [x] **P6E.4** `GET /api/savings/sessions/:sessionId` — session details

### 6F — Alerts and Recommendations
- [x] **P6F.1** `GET /api/rooms/:roomId/alerts` — active alerts with structured facts
- [x] **P6F.2** `POST /api/rooms/:roomId/alerts/:alertId/acknowledge`
- [x] **P6F.3** `POST /api/rooms/:roomId/what-if` — what-if projection (backend calculation only)
- [x] **P6F.4** `POST /api/rooms/:roomId/actions` — apply recommendation

### 6G — Simulation Controls
- [x] **P6G.1** `GET /api/simulation/state`
- [x] **P6G.2** `POST /api/simulation/pause`
- [x] **P6G.3** `POST /api/simulation/resume`
- [x] **P6G.4** `POST /api/simulation/step` — advance by N minutes
- [x] **P6G.5** `POST /api/simulation/reset` — reset room states to seed defaults
- [x] **P6G.6** `POST /api/simulation/speed` — change speed multiplier

### 6H — Scenarios, Calibration, Settings, AI
- [x] **P6H.1** `POST /api/simulation/scenario` — apply scenario (ROOM_EMPTY, HIGH_TEMPERATURE, HIGH_CO2, etc.)
- [x] **P6H.2** `POST /api/calibration/start`
- [x] **P6H.3** `POST /api/calibration/stop`
- [x] **P6H.4** `GET /api/calibration/:roomId`
- [x] **P6H.5** `GET /api/rooms/:roomId/events` — event audit log
- [x] **P6H.6** `GET /api/settings` and `PATCH /api/settings`
- [x] **P6H.7** `POST /api/ai/explain` — deterministic fallback (optional LLM)

**Exit gate:** All routes return correctly shaped JSON. Full demo sequence exercisable via curl/Postman. [COMPLETED]

---

## PHASE 7 — WebSocket Event Publishing
> Goal: Every meaningful backend state change is broadcast to connected clients in real time.
> **Est. time: ~1 hr**

- [x] **P7.1** Wire up `event-publisher.ts` to Socket.IO: `io.to(roomId).emit(eventType, payload)`
- [x] **P7.2** Publish `SIMULATION_TICK` — compact tick summary per room (not full state dump)
- [x] **P7.3** Publish `ROOM_TELEMETRY_UPDATED` — sensor values after each tick
- [x] **P7.4** Publish `DEVICE_STATE_CHANGED` — when automation or user changes a device
- [x] **P7.5** Publish `OCCUPANCY_CHANGED` — on person enter/exit
- [x] **P7.6** Publish `AUTOMATION_ACTION` — every automation decision
- [x] **P7.7** Publish `ALERT_CREATED` and `ALERT_UPDATED` — from waste detector
- [x] **P7.8** Publish `SAVINGS_UPDATED` — after each tick during open session
- [x] **P7.9** Publish `SAVINGS_SESSION_STARTED` and `SAVINGS_SESSION_CLOSED`
- [x] **P7.10** Publish `CALIBRATION_PROGRESS` and `CALIBRATION_COMPLETED`
- [x] **P7.11** Publish `SCENARIO_APPLIED`
- [x] **P7.12** Publish building-scope events: `building.telemetry`, `building.savings.updated`

**Exit gate:** Browser console receives WS events when adding a person via API. [COMPLETED]

---

## PHASE 8 — Frontend Foundation
> Goal: App shell, routing, API client, WebSocket connection, design system in place.
> **Est. time: ~1.5-2 hrs**

- [x] **P8.1** Install all frontend deps: `react-router-dom`, `@tanstack/react-query`, `zustand`, `recharts`, `socket.io-client`, `lucide-react`, shadcn/ui components
- [x] **P8.2** Install Google Font (Inter or Outfit) in `index.html`
- [x] **P8.3** Set up Tailwind config — design tokens matching spec Section 32: deep charcoal shell, electric green accents, cyan telemetry, amber warnings
- [x] **P8.4** Create `src/styles/globals.css` + `src/styles/tokens.css` — CSS variables for full color palette
- [x] **P8.5** Create `src/lib/api/client.ts` — base fetch client pointing to `http://localhost:3001/api`
- [x] **P8.6** Create `src/lib/websocket/socket.ts` — Socket.IO client singleton
- [x] **P8.7** Create `src/lib/websocket/event-handlers.ts` — subscribe helpers that invalidate TanStack Query caches
- [x] **P8.8** Set up `src/app/providers.tsx` — QueryClientProvider + RouterProvider + SocketProvider
- [x] **P8.9** Create `src/app/layout.tsx` — AppShell with Sidebar + TopBar + SimulationToolbar
- [x] **P8.10** Create `src/app/router.tsx` — routes: `/`, `/dashboard`, `/rooms`, `/rooms/:id/analytics`, `/rooms/:id/wall`, `/settings`
- [x] **P8.11** Create Zustand stores: `appStore.ts` (selected room, open drawers, WS state), `simulationStore.ts` (clock, speed, status)
- [x] **P8.12** Create `src/components/layout/`:
  - `AppShell.tsx` — dark sidebar + main content area
  - `Sidebar.tsx` — nav links with icons (Dashboard, Rooms, Settings)
  - `TopBar.tsx` — page title + connection status badge
  - `SimulationToolbar.tsx` — speed buttons (1x/5x/10x/30x), pause/resume, +1min, +10min, reset
  - `ConnectionStatus.tsx` — Live / Reconnecting / Offline badge
- [x] **P8.13** Create `src/components/common/`:
  - `MetricCard.tsx` — value, unit, label, trend, optional icon
  - `StatusBadge.tsx` — colored badge with icon
  - `LoadingSkeleton.tsx` — shimmer placeholder
  - `EmptyState.tsx` — icon + message
  - `ErrorState.tsx` — icon + message + retry button
  - `ConfirmDialog.tsx` — shadcn/ui dialog wrapper

**Exit gate:** App shell loads at localhost:5173. Navigation works. SimulationToolbar calls backend. Connection badge shows Live. [COMPLETED]

---

## PHASE 9 — Dashboard Page
> Goal: Building-level KPIs, energy chart, room cards grid — all live from backend.
> **Est. time: ~2-3 hrs**

- [x] **P9.1** Create API layer: `src/lib/api/dashboard.ts` — `getDashboardSummary`, `getDashboardRooms`, `getEnergySeriesDashboard`
- [x] **P9.2** Create `useDashboard.ts` hook — TanStack Query + WS cache invalidation
- [x] **P9.3** Build `BuildingKpiGrid.tsx` — 6 KPI cards:
  - Current Consumption (kW)
  - Energy Today (kWh)
  - Energy Saved (kWh)
  - Cost Saved (Rs)
  - CO2 Avoided (kg)
  - Unaccounted Consumption (kWh / %)
- [x] **P9.4** Build `BuildingEnergyChart.tsx` (Recharts / Realtime SVG Sparkline):
  - 3 series: Actual Power, Expected Power, Counterfactual Power
  - Action event markers on timeline
  - Full tooltip / live legend
  - Realtime 1Hz stream
- [x] **P9.5** Build `RoomCard.tsx` — room name, type, floor, occupancy, kW, saved kWh, comfort score, status badge, alert indicator
- [x] **P9.6** Build `DashboardAlerts.tsx` — recent alerts feed
- [x] **P9.7** Assemble `DashboardPage/index.tsx` — KPI grid + chart + room cards grid
- [x] **P9.8** Wire up Create Room button -> opens `CreateRoomDialog.tsx` (fields: name, type, floor, capacity -> POST /api/rooms)
- [x] **P9.9** Subscribe to WS events: `building.telemetry`, `building.room.updated`, `building.savings.updated` -> invalidate queries
- [x] **P9.10** Add loading skeletons and empty/error states to every section

**Exit gate:** Dashboard shows real data. KPI numbers change as simulation ticks. Room card reflects live occupancy and power. [COMPLETED]

---

## PHASE 10 — Rooms Page
> Goal: Room management — list, create, search, navigate.
> **Est. time: ~1 hr**

- [x] **P10.1** Create API layer: `src/lib/api/rooms.ts`
- [x] **P10.2** Build `RoomsPage/index.tsx` — header + Create Room button + search input + room grid
- [x] **P10.3** Build `RoomGrid.tsx` — grid of room cards (re-use `RoomCard.tsx` from dashboard)
- [x] **P10.4** Implement client-side room search/filter on loaded data
- [x] **P10.5** `CreateRoomDialog.tsx` — form: Room Name, Room Type, Floor, Capacity + submit -> `POST /api/rooms` -> navigate to new room analytics

**Exit gate:** Can create a new room. It appears in the grid immediately. Clicking navigates to analytics. [COMPLETED]

---

## PHASE 11 — Room Analytics Page
> Goal: The main intelligence page — all 8 panels, live data, all interactions.
> **Est. time: ~4-5 hrs (biggest UI chunk)**

- [x] **P11.1** Create hooks: `useRoom.ts`, `useRoomTelemetry.ts`, `usePeople.ts`, `useRoomAlerts.ts`, `useSavings.ts`

- [x] **P11.2** Build `RoomHeader.tsx` — room name, type, floor, occupancy state badge, current kW, action buttons (Device Wall, Add Person, Add Device, Run Calibration, Scenarios, Room Settings)
- [x] **P11.3** Build `RoomTabs.tsx` — tabs: "Analytics and Sensors" | "Device Wall"

**Panel: Occupancy**
- [x] **P11.4** Build `OccupancyPanel.tsx`:
  - State badge: OCCUPIED / VACANCY PENDING / VACANT
  - Occupant count, occupied/vacant duration, vacancy timer countdown if pending
  - `PersonList.tsx` — list of people currently present
  - `AddPersonDialog.tsx` — name input -> POST `/api/rooms/:id/people`
  - Remove person button -> DELETE `/api/rooms/:id/people/:personId`

**Panel: Environmental Sensors**
- [x] **P11.5** Build `SensorGrid.tsx` — 6 sensor cards (Temp, Humidity, CO2, Light, Occupancy, Power):
  - Value, unit, status color, mini sparkline (last 20 readings), last updated timestamp

**Panel: Comfort**
- [x] **P11.6** Build `ComfortPanel.tsx`:
  - Prototype Comfort Index score (large prominent number)
  - Sub-scores: temperature, humidity, air quality
  - Status: GOOD / MODERATE / NEEDS ATTENTION
  - Empty room message: "No occupants — comfort impact not currently applicable"

**Panel: Live Power/Energy Chart**
- [x] **P11.7** Build `EnergyChart.tsx` (Recharts / SVG) — actual/expected/counterfactual lines, action markers, range selector

**Panel: Energy Accounting**
- [x] **P11.8** Build `EnergyAccountingCard.tsx`:
  - Actual consumption (from virtual meter)
  - Expected registered consumption (from device models)
  - Unaccounted consumption (positive only, labeled "Possible non-registered load / model deviation")
  - Energy saved (counterfactual basis)

**Panel: Savings**
- [x] **P11.9** Build `SavingsKpis.tsx` — saved kWh today, current session kWh, Rs saved, CO2 avoided, session count
- [x] **P11.10** Build `SavingsSessionDrawer.tsx` — session start/end, trigger, devices, kWh, Rs, CO2, comfort before/after

**Panel: Alerts and Recommendations**
- [x] **P11.11** Build `AlertCard.tsx` — reason, duration, power deviation, comfort state, affected devices, recommended action
- [x] **P11.12** Build `WhatIfDialog.tsx` — shows projected savings (from backend) before committing
- [x] **P11.13** Wire buttons: Explain -> `POST /api/ai/explain-alert` | Simulate What-If -> `POST /api/rooms/:id/what-if` | Apply -> `POST /api/rooms/:id/actions`

**Panel: Event Timeline**
- [x] **P11.14** Build `EventTimeline.tsx` — scrollable list of events with timestamp, type, reason, device affected
- [x] **P11.15** "View all events" expands to full-height drawer

**Calibration**
- [x] **P11.16** Build `CalibrationDialog.tsx` — explains process, shows progress bar, shows result (expected/measured/factor/confidence)

**Scenario Controls**
- [x] **P11.17** Build `RoomScenarioPanel.tsx` — buttons: Normal State, Room Becomes Empty, Add Person, Remove All People, High Temperature, High CO2, Energy Anomaly, Unregistered Load, Run Calibration, Reset Room

- [x] **P11.18** Subscribe to all room WS events and invalidate/patch relevant queries live

**Exit gate:** All 8 panels visible with real data. Add person -> occupancy updates live. Alerts appear when waste condition is met. [COMPLETED]

---

## PHASE 12 — Room Device Wall Page
> Goal: Visual device wall with drag, device state animations, add/control devices.
> **Est. time: ~2-3 hrs**

- [x] **P12.1** Create API hooks: `useDevices.ts` — list, commands, layout
- [x] **P12.2** Build `DeviceWall.tsx` — canvas with absolute-positioned device cards
- [x] **P12.3** Build `DeviceCard.tsx` — icon, name, state, power badge, protection status, with animations:
  - LED: glows green when ON
  - Fan: CSS rotation animation when ON
  - AC: status text STARTING / COOLING / IDLE / OFF
  - Freezer: compressor cycling indicator
- [x] **P12.4** Implement drag-to-reposition -> `PATCH /api/devices/:deviceId/layout` on drop
- [x] **P12.5** Build `AddDeviceDialog.tsx`:
  - Catalog picker (all 9 types, auto-fills defaults from catalog)
  - Fields: name, quantity, rated voltage, rated power, controllable, protected
  - Automation policy section (ON when occupied, OFF when vacant, vacancy delay)
  - Submit -> `POST /api/rooms/:roomId/devices`
- [x] **P12.6** Click device -> opens `DeviceSettingsDrawer.tsx`:
  - All device fields + all policy fields from spec Section 4.5
  - Manual control buttons: TURN ON / TURN OFF
  - Manual Override Active badge + Clear Override button
  - Protected badge if applicable
  - Edit policy fields -> `PATCH /api/devices/:deviceId`
- [x] **P12.7** Subscribe to `device.state` WS events -> update device cards live
- [x] **P12.8** Room header: room name, status, current power, Add Device + Analytics buttons

**Exit gate:** Add AC to wall. Turn it on via drawer. Fan rotates. LED glows. Freezer shows DEVICE_PROTECTED error on control attempt. [COMPLETED]

---

## PHASE 13 — Settings Page
> Goal: All configurable settings from spec Section 4.8.
> **Est. time: ~1 hr**

- [x] **P13.1** Build `SettingsPage/index.tsx` with 5 tabs: Building | Comfort | Automation | Simulation | System
- [x] **P13.2** Building tab: building name, location, tariff (Rs/kWh), CO2 factor (kgCO2/kWh)
- [x] **P13.3** Comfort tab: preferred temp min/max, humidity min/max, CO2 threshold, scoring weights
- [x] **P13.4** Automation tab: default vacancy delay, anomaly duration, excess power threshold, override behavior
- [x] **P13.5** Simulation tab: speed, sensor tick interval, outside temperature profile, base noise
- [x] **P13.6** System tab: DB connection status, WS state, AI provider toggle, simulation mode badge
- [x] **P13.7** Save button -> `PATCH /api/settings` + toast confirmation

**Exit gate:** Change tariff -> savings cost calculations update in next session. [COMPLETED]

---

## PHASE 14 — Polish, UX and UI Hardening
> Goal: App looks premium and consistent. No broken states anywhere.
> **Est. time: ~1.5-2 hrs**

- [x] **P14.1** Audit all pages: consistent spacing, card radius, shadow, border weight
- [x] **P14.2** Add loading skeletons to every data-fetching panel
- [x] **P14.3** Add empty states to room grid, device wall, event timeline, alerts panel
- [x] **P14.4** Add error states with retry buttons
- [x] **P14.5** Add toast notifications for all user actions (add person, add device, apply action, calibration complete)
- [x] **P14.6** Verify all numbers show correct units: kW, kWh, Rs, degC, %, ppm, lux, kgCO2
- [x] **P14.7** Add "Simulated / Estimated" labels wherever spec requires
- [x] **P14.8** Add "Simulation Mode" badge to header (always visible)
- [x] **P14.9** Verify responsive behavior: collapses gracefully to 1024px
- [x] **P14.10** Add micro-animations: card hover lift, badge pulse for alerts, fan rotation, LED glow
- [x] **P14.11** Verify deep links work: `/rooms/abc123/analytics` loads correctly without going through dashboard first
- [x] **P14.12** Add page `<title>` tags and meta descriptions for each route

---

## PHASE 15 — Demo Scenarios and Seed Hardening
> Goal: 3-5 minute hackathon demo sequence works flawlessly end-to-end.
> **Est. time: ~1 hr**

- [x] **P15.1** Verify demo seed creates Room 101 with 5 devices on first `pnpm seed`
- [x] **P15.2** Implement all 10 scenarios in `apps/api/src/modules/simulation/scenarios/`:
  - `NORMAL_STATE` — restore Room 101 to default occupied state
  - `ROOM_BECOMES_EMPTY` — remove all people instantly
  - `ADD_PERSON` — add one generic person
  - `REMOVE_ALL_PEOPLE` — remove all people
  - `HIGH_TEMPERATURE` — set room temp to 35C
  - `HIGH_CO2` — set CO2 to 1500 ppm
  - `ENERGY_ANOMALY` — spike power above expected baseline
  - `UNREGISTERED_LOAD` — add hidden load to room meter
  - `RUN_CALIBRATION` — start calibration session
  - `RESET_ROOM` — full reset to seed defaults
- [x] **P15.3** Walk through all 6 demo scenes manually (spec Section 48) — all work end-to-end
- [x] **P15.4** Set simulation to 30x speed -> AC shuts off within ~20 real seconds -> savings appear on dashboard

---

## PHASE 16 — AI Explanation Layer
> Goal: Deterministic fallback works always. Optional LLM adds value when key is present.
> **Est. time: ~45 mins**

- [x] **P16.1** Create `apps/api/src/modules/ai/deterministic-explainer.ts` — template-based explanations per AlertType
- [x] **P16.2** Create `apps/api/src/modules/ai/prompt-builder.ts` — builds structured fact JSON for LLM
- [x] **P16.3** Create `apps/api/src/modules/ai/ai.service.ts` — calls LLM if API key set, else falls back to deterministic
- [x] **P16.4** `POST /api/ai/explain-alert` — always returns a non-empty explanation string
- [x] **P16.5** Frontend `AlertCard.tsx` Explain button -> shows explanation in popover/drawer

---

## PHASE 17 — Testing and Verification
> Goal: Core logic is proven correct. No silent failures in critical paths.
> **Est. time: ~1-1.5 hrs**

- [x] **P17.1** Unit test — energy math: `5 kW * 2 h = 10 kWh`, unaccounted = actual - expected
- [x] **P17.2** Unit test — occupancy state machine: all transitions from spec Section 10
- [x] **P17.3** Unit test — device automation: LED/Fan/AC respond correctly to OCCUPIED/VACANT
- [x] **P17.4** Unit test — manual override: automation skips device with active override; clear override -> automation resumes
- [x] **P17.5** Unit test — comfort: weighted score calculation is correct
- [x] **P17.6** Unit test — savings: counterfactual > actual -> saved > 0; actual >= counterfactual -> saved = 0
- [x] **P17.7** Unit test — protected device command -> returns DEVICE_PROTECTED error, no state change
- [x] **P17.8** Integration test — POST `/api/rooms/:id/people` -> room state transitions to OCCUPIED -> WS event published
- [x] **P17.9** Run `tsc --noEmit` on all packages — zero type errors
- [x] **P17.10** Run full acceptance checklist from spec Section 55

---

## PHASE 18 — Documentation
> Goal: README and key docs complete. Project is presentable.
> **Est. time: ~30-45 mins**

- [x] **P18.1** Write `README.md` — overview, setup steps, seed, dev commands, demo instructions
- [x] **P18.2** Write `docs/ASSUMPTIONS.md` — all prototype defaults and implementation choices
- [x] **P18.3** Write `docs/ARCHITECTURE.md` — data flow diagram, module responsibilities
- [x] **P18.4** Write `docs/DEMO_SCRIPT.md` — step-by-step 3-5 minute judge demo
- [x] **P18.5** Write `docs/ENERGY_MATH.md` — all equations from spec Section 13
- [x] **P18.6** Ensure `.env.example` documents all required env vars

---

## PHASE 19 — Final Acceptance Run
> Goal: Judge sequence (spec Section 66) works without touching code.
> **Est. time: ~30 mins**

- [x] Open Dashboard -> data loads
- [x] Open Room 101 -> analytics loads with all panels populated
- [x] Open Device Wall -> 5 devices visible (AC, LED x2, Fan, Freezer, LaptopPort)
- [x] Go back to Analytics -> Add Person -> occupancy = 1 -> LED/Fan/AC respond
- [x] Sensor values evolve each tick
- [x] Remove Person -> LED/Fan OFF immediately, AC vacancy timer starts, event timeline shows it
- [x] Set speed to 30x -> AC shuts down after configured delay -> savings session closes
- [x] Dashboard updates: saved kWh, Rs, CO2 all non-zero
- [x] Trigger Unregistered Load scenario -> unaccounted consumption appears in energy accounting panel
- [x] Run Calibration -> result shows expected vs measured vs adjustment factor vs confidence
- [x] Trigger High CO2 with occupants -> comfort score drops -> recommendation is softened
- [x] Open event timeline -> every important action visible with timestamp and reason

---

## Quick Reference — Phase Summary

| Phase | Name | Priority | Time Est. |
|-------|------|----------|-----------|
| 0 | Scaffold and Tooling | Critical | 1-1.5h |
| 1 | Database and Prisma | Critical | 1.5-2h |
| 2 | Shared Types | Critical | 45m |
| 3 | Backend Infrastructure | Critical | 1h |
| 4 | Simulation Engine | Critical | 3-4h |
| 5 | Automation, Comfort, Savings | Critical | 2-3h |
| 6 | REST API Routes | Critical | 2-3h |
| 7 | WebSocket Publishing | Critical | 1h |
| 8 | Frontend Foundation | Critical | 1.5-2h |
| 9 | Dashboard Page | High | 2-3h |
| 10 | Rooms Page | High | 1h |
| 11 | Room Analytics Page | High | 4-5h |
| 12 | Device Wall Page | High | 2-3h |
| 13 | Settings Page | Medium | 1h |
| 14 | UI Polish and Hardening | Medium | 1.5-2h |
| 15 | Demo Scenarios | High | 1h |
| 16 | AI Explanation | Medium | 45m |
| 17 | Testing | High | 1-1.5h |
| 18 | Documentation | Medium | 30-45m |
| 19 | Final Acceptance Run | Critical | 30m |
| **Total** | | | **~30-38h** |

---

## Non-Negotiable Implementation Rules
> These apply to every phase. Violating them means rebuilding.

1. **Backend is source of truth.** Energy, savings, comfort, device states — computed by backend only.
2. **No hardcoded metrics in frontend.** Every number comes from an API call or WebSocket event.
3. **One simulation scheduler.** Not one `setInterval` per room — one central scheduler.
4. **Sensors evolve from room state.** Not random numbers regenerated from scratch each tick.
5. **Protected devices cannot be turned off.** `DEVICE_PROTECTED` error returned to UI.
6. **Manual overrides are respected.** Automation skips devices with active overrides.
7. **Unaccounted = actual - expected.** Never falsely label as a specific device.
8. **Savings = counterfactual - actual.** Never hardcode savings values in the UI.
9. **All state changes create auditable events.** Check EventLog table after every automation action.
10. **System works without LLM.** Deterministic fallback always available.

---

## Module Lookup Table

| Need to find... | Look in... |
|---|---|
| Room simulation tick loop | `apps/api/src/modules/simulation/simulation-engine.ts` |
| Temp / CO2 / Humidity equations | `apps/api/src/modules/simulation/environment-model.ts` |
| Device power models | `apps/api/src/modules/simulation/device-models/` |
| Automation policy evaluation | `apps/api/src/modules/automation/policy-engine.ts` |
| Vacancy timer logic | `apps/api/src/modules/automation/occupancy-rules.ts` |
| Savings math and sessions | `apps/api/src/modules/savings/savings-engine.ts` |
| Counterfactual power model | `apps/api/src/modules/savings/counterfactual-engine.ts` |
| Comfort score calculation | `apps/api/src/modules/comfort/comfort-engine.ts` |
| Waste and anomaly detection | `apps/api/src/modules/analytics/waste-detector.ts` |
| WebSocket event publishing | `apps/api/src/websocket/event-publisher.ts` |
| All API route handlers | `apps/api/src/routes/` |
| Shared TypeScript types | `packages/shared/src/domain/` |
| WebSocket event type strings | `packages/shared/src/events/event-types.ts` |
| React pages | `apps/web/src/pages/` |
| React components | `apps/web/src/components/` |
| Design tokens and CSS variables | `apps/web/src/styles/tokens.css` |
| TanStack Query hooks | `apps/web/src/hooks/` |
