# IntelliSave — Complete AI Coding Agent Build Specification

> **Purpose:** Single implementation specification for building the complete **IntelliSave — AI-Powered Smart Building Energy & Comfort Optimization** software prototype.
>
> **Prototype mode:** Software-only simulated smart-building digital twin. No physical IoT hardware is required.
>
> **Core loop:** **Sense → Understand → Decide → Act → Measure → Show Savings → Learn**

---

# 0. BUILD INSTRUCTIONS TO THE AI CODING AGENT

You are not building a static dashboard mockup. Build a **working software simulation of a smart building**.

The application must behave like a small digital twin:

- Rooms have state.
- People affect occupancy.
- Occupancy affects environmental conditions.
- Sensors observe room state.
- Devices have real operating states and power models.
- Devices consume energy.
- A room-level virtual meter measures the total electrical consumption of the room.
- The meter includes all room consumption, including loads not registered by the user.
- Analytics compares measured actual energy against modeled/expected registered energy.
- Automation reacts to occupancy, comfort and configured policies.
- Every meaningful change is recorded as an event with timestamp and reason.
- Savings are measured against a counterfactual "what would have happened without the IntelliSave action" state.
- The dashboard receives current state from the backend and updates in real time.
- The simulation must be deterministic/reproducible enough for a hackathon demo.
- The frontend must never become the source of truth for simulation or energy calculations.

## 0.1 Non-negotiable implementation rules

1. **Backend is the source of truth.** Do not implement the actual simulation loop in React.
2. **No hardcoded live metrics in the frontend.** Energy, occupancy, temperature, humidity, CO₂, savings, device states and event data must come from the backend.
3. **Do not use random-number-only simulation.** Sensor readings must evolve from modeled room state and device/person behavior. Small bounded noise is allowed only as a finishing layer.
4. **Do not falsely attribute unaccounted consumption to an unknown device.** Report it as unaccounted consumption / possible non-registered load or model deviation.
5. **Protected devices cannot be turned off by IntelliSave automation.** Examples: Freezer, Laptop Charging Port.
6. **Manual overrides must be respected.** Automation must not immediately undo a user's intentional manual action unless the override is cleared or a configured safety rule explicitly overrides it.
7. **AI/LLM is not the energy calculator.** Numerical metrics come from deterministic backend analytics. AI receives structured facts and explains them.
8. **Simulated/estimated numbers must be visibly labeled.** Never imply this prototype has measured real-world building savings.
9. **All configurable rules must live in backend configuration/data, not scattered across frontend event handlers.**
10. **Every meaningful automated action must create an auditable event.**
11. **Room energy is measured at room level.** Device registration is a modeling/accounting layer, not individual device metering.
12. **Use append-only historical events for important state changes.**
13. **The system must work without an external AI API.** Provide a deterministic explanation fallback.
14. **Do not ask unnecessary implementation questions.** Use defaults in this document and record extra assumptions in `docs/ASSUMPTIONS.md`.

---

# 1. PRODUCT DEFINITION

## 1.1 Product

**IntelliSave** is a smart-building energy and comfort optimization platform.

It acts as a software decision layer that:

- monitors rooms,
- models people and environmental conditions,
- monitors virtual devices,
- measures room-level consumption,
- identifies potentially unnecessary energy consumption,
- checks comfort before recommending actions,
- automatically applies safe configurable actions in simulation mode,
- measures counterfactual energy savings,
- explains the reason for each action,
- and learns room-specific baseline behavior over time.

## 1.2 Primary prototype use case

A room has people → devices operate → people leave → occupancy becomes zero → lighting/fan turn off immediately → AC follows a configured vacancy delay → AC shuts down → a savings session records counterfactual energy → dashboard shows energy saved, money saved, CO₂ avoided and comfort status.

## 1.3 Secondary use cases

The system must also demonstrate:

- creation of additional rooms,
- addition of electrical devices,
- adding/removing simulated people,
- realistic sensor changes,
- high temperature / high CO₂ comfort protection,
- unaccounted consumption detection,
- calibration,
- device-specific automation settings,
- manual override,
- what-if simulation,
- anomaly detection,
- event audit timeline,
- building-wide aggregation.

## 1.4 Prototype vs future deployment

### Current prototype

- simulated rooms,
- simulated people,
- simulated sensors,
- simulated devices,
- simulated meter,
- simulated automation,
- PostgreSQL persistence,
- real-time backend events.

### Future deployment

```text
Real IoT Sensors / Smart Meters / BMS
              ↓
        Data Ingestion
              ↓
      IntelliSave Analytics
              ↓
     Recommendation / Rules
              ↓
 Authorized BMS Control Layer
```

Keep sensor ingestion, simulation and control interfaces modular so the simulation provider can later be replaced.

---

# 2. CORE DOMAIN PRINCIPLES

## 2.1 Central Room State

Every room must have a central backend `RoomSimulationState`.

```ts
 type RoomSimulationState = {
  roomId: string;
  occupancyCount: number;
  peoplePresent: string[];
  temperatureC: number;
  humidityPct: number;
  co2Ppm: number;
  ambientLightLux: number;
  outsideTemperatureC: number;
  hvacDemand: number;
  comfortScore: number | null;
  occupancyState: "OCCUPIED" | "VACANCY_PENDING" | "VACANT";
  vacancyStartedAt: string | null;
  vacancyDelaySeconds: number;
  totalPowerKw: number;
  expectedRegisteredPowerKw: number;
  unaccountedPowerKw: number;
  simulationTimestamp: string;
};
```

Sensors observe this state. Devices consume energy and modify the physical state. Analytics evaluates it. Automation acts on it. The frontend only visualizes backend state.

---

# 3. APPLICATION INFORMATION ARCHITECTURE

## 3.1 Global navigation

Primary navigation:

- **Dashboard**
- **Rooms**
- **Settings**

Global simulation/status bar:

- Simulation Mode badge
- simulation clock time
- speed: 1× / 5× / 10× / 30×
- pause/resume
- step +1 minute
- step +10 minutes
- scenario controls
- connection state
- optional current building power / automation count

## 3.2 Routes

```text
/
└── redirects to /dashboard

/dashboard
/rooms
/rooms/:roomId/analytics
/rooms/:roomId/wall
/settings
```

No unnecessary auth/login flow is required for the hackathon prototype.

---

# 4. FRONTEND PAGE-BY-PAGE SPECIFICATION

This section is the source of truth for frontend routes, interactions, backend data, API calls and navigation.

---

# 4.1 PAGE: Dashboard

## Route

```text
/dashboard
```

## Purpose

Building-level overview. It must answer:

1. How much energy is the building using?
2. How much has IntelliSave saved?
3. How much consumption is unaccounted?
4. Which rooms are active?
5. Which rooms need attention?
6. What automations are running?

## Layout

### Header

- `Building Dashboard`
- `Live smart-building overview`
- Simulation mode badge
- backend connection indicator

### KPI row

Cards:

1. Current Consumption — kW
2. Energy Today — kWh
3. Energy Saved — kWh
4. Cost Saved — ₹
5. CO₂ Avoided — kg
6. Unaccounted Consumption — kWh / %

All values are backend-derived.

### Building energy chart

Plot:

- Actual power
- Expected registered/model power
- counterfactual no-automation power when available
- IntelliSave action markers

Range selector:

```text
30 min | 1 hr | 24 hr
```

Tooltip:

```text
Time
Actual
Expected
Counterfactual
Savings
```

### Room cards grid

One card per room. Show:

- room name,
- room type,
- occupancy,
- current kW,
- today's kWh,
- today's saved kWh,
- comfort score,
- status,
- active automation count,
- unaccounted consumption indicator.

## Dashboard navigation / interactions

### Click room card

```text
navigate → /rooms/:roomId/analytics
```

### Click Add Room

Open Create Room modal. On success, POST to `/api/rooms`, then navigate to the new room analytics page.

### Click Rooms

Navigate to `/rooms`.

### Click alert indicator

Open an alert drawer or navigate to the relevant room analytics page if detailed context is needed.

## Backend mapping

Initial REST requests:

```text
GET /api/dashboard/summary?range=today
GET /api/dashboard/rooms
GET /api/dashboard/energy-series?range=1h
GET /api/dashboard/events?limit=20
```

WebSocket subscriptions:

```text
building.telemetry
building.room.updated
building.device.updated
building.automation.action
building.savings.updated
building.alert.created
building.event.created
```

Building totals must be derived from room-level values.

---

# 4.2 PAGE: Rooms

## Route

```text
/rooms
```

## Purpose

Room management and navigation.

## Layout

Header:

```text
Rooms
Manage your virtual smart-building rooms
```

Primary action:

```text
+ Create Room
```

Each room card/list row shows:

- name,
- floor,
- type,
- capacity,
- occupancy,
- current power,
- today's consumption,
- today's savings,
- comfort,
- sensor health,
- automation count.

## Interactions

### Create Room

Modal fields:

- Room Name
- Room Type
- Floor
- Capacity
- optional notes

Examples:

- Room 101 — Classroom
- Hall — Common Area
- Kitchen — Utility
- Lab — Laboratory

Submit:

```text
POST /api/rooms
```

Backend must automatically:

1. create room,
2. create virtual occupancy PIR sensor,
3. create virtual occupancy mmWave sensor,
4. create temperature sensor,
5. create humidity sensor,
6. create CO₂ sensor,
7. create ambient-light sensor,
8. create virtual room energy meter,
9. create default simulation state,
10. create room settings and default automation policies where applicable,
11. create baseline configuration,
12. create `ROOM_CREATED` event.

Do not automatically add electrical devices unless the user selected a future room template that explicitly requests optional device presets.

After success:

```text
navigate → /rooms/:newRoomId/analytics
```

### Click room

```text
navigate → /rooms/:roomId/analytics
```

### Delete/Archive

Use confirmation. Prefer soft archive so historical telemetry/savings are preserved.

```text
DELETE /api/rooms/:roomId
```

### Search

Client-side filtering of loaded room metadata is sufficient.

---

# 4.3 PAGE: Room Analytics & Sensors

## Route

```text
/rooms/:roomId/analytics
```

This is the primary room intelligence page.

## Header

Show:

- room name,
- room type,
- floor,
- occupancy state,
- connection,
- current power,
- buttons:
  - `Device Wall`
  - `Add Person`
  - `Add Device`
  - `Run Calibration`
  - `Scenarios`
  - `Room Settings`

Room tabs:

```text
Analytics & Sensors | Device Wall
```

Tab routing:

```text
Analytics & Sensors → /rooms/:roomId/analytics
Device Wall → /rooms/:roomId/wall
```

## 4.3.1 Occupancy panel

Display:

- current occupants,
- occupancy state,
- occupied duration,
- vacant duration,
- vacancy timer if pending,
- people currently present.

States:

```text
OCCUPIED
VACANCY PENDING
VACANT
```

### Add Person

Modal fields:

- display name,
- optional movement behavior.

POST:

```text
POST /api/rooms/:roomId/people
```

Backend must:

1. create simulated person,
2. create presence event,
3. add person to room state,
4. change state to OCCUPIED,
5. cancel vacancy timers,
6. trigger sensor/environment updates,
7. evaluate automation,
8. apply configured device actions,
9. record events,
10. update savings session as required,
11. publish WebSocket updates.

Frontend stays on the same page.

### Remove Person

```text
DELETE /api/rooms/:roomId/people/:personId
```

Only the last person's exit moves the room from OCCUPIED to VACANCY_PENDING.

---

## 4.3.2 Environmental sensor cards

Cards:

- Temperature
- Humidity
- CO₂
- Ambient Light
- Occupancy
- Room Power

Each shows:

- value,
- unit,
- status,
- mini sparkline,
- last update timestamp.

Data sources:

```text
GET /api/rooms/:roomId/state
GET /api/rooms/:roomId/telemetry?range=1h
```

Realtime events:

```text
room.telemetry
sensor.reading
```

---

## 4.3.3 Comfort panel

Show:

```text
Prototype Comfort Index
91 / 100
```

Breakdown:

- temperature score,
- humidity score,
- CO₂/air-quality score,
- occupancy context.

Statuses:

```text
GOOD
MODERATE
NEEDS ATTENTION
```

This is a configurable prototype index, not a certified physiological comfort standard.

---

## 4.3.4 Live Power / Energy chart

Plot:

- actual room power,
- expected registered/model power,
- counterfactual power,
- critical action markers.

Ranges:

```text
30 min | 1 hr | 24 hr
```

Click a marker → open event details.

---

## 4.3.5 Energy accounting panel

Explicitly separate:

### Actual consumption

Measured by room virtual meter.

### Expected registered consumption

Modeled from registered devices and their configured/model operating behavior.

### Unaccounted consumption

```text
Actual Room Energy - Expected Registered Energy
```

Display:

```text
Possible non-registered load / model deviation
```

### Energy saved

```text
Counterfactual no-action energy - actual post-action energy
```

Never conflate unaccounted consumption and saved energy.

---

## 4.3.6 Savings panel

Show:

- saved kWh today,
- current session saved kWh,
- saved ₹,
- CO₂ avoided,
- automation session count.

`View savings details` opens a drawer showing:

- session start/end,
- trigger,
- affected devices,
- actions,
- counterfactual energy,
- actual energy,
- savings,
- cost,
- CO₂,
- comfort state.

---

## 4.3.7 Alerts / recommendations

Show cards with:

- reason,
- duration,
- actual power,
- expected power,
- deviation,
- affected devices,
- comfort state,
- recommended action.

Buttons:

### Explain

```text
POST /api/ai/explain-alert
```

Use structured facts produced by analytics.

### Simulate What-If

```text
POST /api/rooms/:roomId/what-if
```

### Apply Recommendation

```text
POST /api/rooms/:roomId/actions
```

The backend changes device state.

---

## 4.3.8 Event timeline

Example:

```text
14:30:00 Person entered
14:30:00 Occupancy became 1
14:30:00 LED ON — reason: ROOM_OCCUPIED
14:30:00 Fan ON — reason: ROOM_OCCUPIED
14:30:00 AC STARTING — reason: ROOM_OCCUPIED
14:42:00 Person exited
14:42:00 LED OFF — reason: ROOM_VACANCY
14:42:00 Fan OFF — reason: ROOM_VACANCY
14:42:00 AC vacancy timer started — 10 min
14:52:00 AC compressor stopped
14:53:00 AC fully OFF
```

`View all events` may open a full-height drawer; a separate event route is not required.

---

## 4.3.9 Calibration

`Run Calibration` opens calibration modal. See Section 19.

---

## Backend mapping for Room Analytics

```text
GET  /api/rooms/:roomId
GET  /api/rooms/:roomId/state
GET  /api/rooms/:roomId/sensors
GET  /api/rooms/:roomId/telemetry
GET  /api/rooms/:roomId/energy
GET  /api/rooms/:roomId/savings
GET  /api/rooms/:roomId/alerts
GET  /api/rooms/:roomId/events
GET  /api/rooms/:roomId/people
POST /api/rooms/:roomId/people
DELETE /api/rooms/:roomId/people/:personId
POST /api/rooms/:roomId/calibration/start
POST /api/rooms/:roomId/what-if
POST /api/rooms/:roomId/actions
```

WebSocket events:

```text
room.state
room.telemetry
sensor.reading
device.state
automation.action
alert.created
alert.updated
savings.updated
event.created
calibration.updated
```

---

# 4.4 PAGE: Room Device Wall

## Route

```text
/rooms/:roomId/wall
```

## Purpose

Visual "plain wall" / physical-device representation of the room. It is a state visualization layer, not decoration.

## Layout

Header:

- room name,
- room status,
- current power,
- `Add Device`,
- `Analytics`.

Main wall/floor canvas with movable device cards/icons.

Device types:

- AC
- Fan
- LED
- Freezer
- Laptop charging port
- Tube Light
- Desktop
- Projector
- Generic Load

Each device shows:

- icon,
- name,
- ON/OFF or detailed state,
- actual power,
- registered rated power,
- control/protection status.

Visual behavior:

- LED glows when ON.
- Fan rotates when ON.
- AC shows STARTING / COOLING / IDLE / OFF.
- Freezer shows compressor cycling.

## Add Device

Modal fields:

- catalog/type,
- name,
- quantity,
- rated voltage,
- rated power,
- controllable,
- protected,
- automation policy,
- wall position.

On submit:

```text
POST /api/rooms/:roomId/devices
```

Backend must:

1. validate voltage/power,
2. create device,
3. default state OFF,
4. create policy,
5. conceptually connect it to room's virtual main supply,
6. include its simulated draw in the room meter,
7. create DEVICE_REGISTERED event,
8. return full state.

There is no need to draw electrical wiring.

## Device click

Open Device Settings drawer without navigating.

## Device drag

Persist position:

```text
PATCH /api/devices/:deviceId/layout
```

---

# 4.5 DEVICE SETTINGS DRAWER

Fields:

- name,
- type,
- quantity,
- rated voltage,
- rated power,
- current state,
- actual power,
- controllable,
- protected.

Automation:

- ON when occupied,
- OFF when vacant,
- vacancy delay,
- min ON time,
- min OFF time,
- temperature condition,
- humidity condition,
- CO₂ condition,
- ambient light condition,
- schedule condition,
- manual override.

### Default policies

#### LED

```text
ON when occupied = true
OFF when vacant = true
vacancy delay = 0 sec
protected = false
```

#### Fan

```text
ON when occupied = true
OFF when vacant = true
vacancy delay = 0 sec
protected = false
```

#### AC

```text
ON when occupied = true
OFF when vacant = true
vacancy delay = 600 sec
target temperature configurable
protected = false
```

#### Freezer

```text
protected = true
controllable = false
```

#### Laptop Charging Port

```text
protected = true
controllable = false
```

These are configurable defaults, not immutable laws.

## Manual device command

```text
POST /api/devices/:deviceId/commands
{
  "command": "TURN_ON"
}
```

Backend must:

1. check protection,
2. check controllability,
3. apply manual override semantics,
4. update state,
5. simulate transition,
6. create event,
7. update meter,
8. recalculate expected energy,
9. publish WebSocket update.

Protected device command must fail with `DEVICE_PROTECTED`.

---

# 4.6 ADD PERSON MODAL

Part of room interaction.

Fields:

- display name,
- optional movement behavior.

On creation:

```text
POST /api/rooms/:roomId/people
```

Adding people must increase occupancy and affect the environment model over time: CO₂ generation, internal heat gain, and comfort pressure.

---

# 4.7 CREATE ROOM MODAL

Fields:

```text
Room name *
Room type
Floor
Capacity
```

Default first room:

```text
Room 101
Classroom
1
30
```

Required sensors and virtual room meter are automatically created.

---

# 4.8 PAGE: Settings

## Route

```text
/settings
```

Settings make important assumptions transparent and configurable.

### Building

- Building name
- location label
- default electricity tariff ₹/kWh
- CO₂ emission factor kgCO₂/kWh

### Comfort

- preferred temperature min/max,
- preferred humidity min/max,
- CO₂ action threshold,
- scoring weights.

### Automation

- default vacancy delay,
- anomaly duration threshold,
- excess power threshold,
- manual override behavior.

### Simulation

- speed,
- sensor tick interval,
- outside temperature profile,
- base noise.

### System

- DB status,
- WebSocket state,
- AI provider,
- simulation mode.

API:

```text
GET /api/settings
PATCH /api/settings
```

---

# 5. GLOBAL SIMULATION CONTROLS

The backend owns simulation time.

## Controls

```text
1× | 5× | 10× | 30×
Pause | Resume | +1 min | +10 min | Reset
```

Suggested mapping:

```text
1×  → 60 real seconds per simulated minute
5×  → 12 seconds
10× → 6 seconds
30× → 2 seconds
```

The exact scheduler interval should be computed from `simulatedMinutesPerTick` and selected speed.

Simulation endpoints:

```text
GET  /api/simulation/status
POST /api/simulation/pause
POST /api/simulation/resume
POST /api/simulation/step
POST /api/simulation/reset
POST /api/simulation/speed
```

---

# 6. DEMO / SCENARIO CONTROLS

Provide a compact scenario panel accessible from room pages and optionally dashboard.

Scenarios:

```text
Normal State
Room Becomes Empty
Add Person
Remove All People
High Temperature
High CO₂
Energy Anomaly
Unregistered Load
Run Calibration
Reset Room
```

All scenario controls are backend commands.

```text
POST /api/rooms/:roomId/scenarios
{
  "scenario": "ROOM_BECOMES_EMPTY"
}
```

---

# 7. REALISTIC SENSOR SIMULATION

Every room gets these virtual signals:

1. Occupancy PIR
2. Occupancy mmWave
3. Temperature
4. Humidity
5. CO₂
6. Ambient Light
7. Virtual Main Energy Meter

## 7.1 Simulation tick

Every simulated minute:

```text
1. Advance simulation timestamp
2. Process queued user events
3. Update people/presence
4. Update occupancy state machine
5. Update environmental room state
6. Update sensor models
7. Update device state machines
8. Calculate device power
9. Calculate room meter
10. Calculate expected registered power
11. Calculate unaccounted power
12. Calculate comfort
13. Run anomaly/waste detection
14. Run automation policy engine
15. Generate action events
16. Calculate savings
17. Store telemetry
18. Store rollups
19. Publish WebSocket events
```

---

# 7.2 Occupancy sensor simulation

PIR responds to movement. mmWave responds to occupancy even when a person is still.

For simulation:

- simulated people are ground truth,
- sensor values are observations,
- the fusion layer estimates occupancy.

Example:

```text
peoplePresent = 3
PIR = movement detected
mmWave = presence detected
estimated occupancy = 3
```

Fusion must be deterministic and configurable.

---

# 7.3 Temperature model

Temperature must evolve gradually.

Conceptual equation:

```text
T_next =
    T_current
  + ((T_outside - T_current) / tau_air) * dt
  + internal_heat_gain
  - hvac_cooling_effect
  + bounded_noise
```

Where:

- `dt` is simulated hours,
- `tau_air` is the room's thermal response constant,
- internal heat gain depends on people/devices,
- HVAC effect depends on state and setpoint.

Use an explainable prototype model rather than a perfect physical HVAC model.

---

# 7.4 CO₂ model

CO₂ rises with occupancy and decreases with ventilation.

Conceptual equation:

```text
CO2_next =
    CO2_current
  + (
      (occupancy_count × co2_generation_rate)
      - ventilation_coefficient × (CO2_current - outdoor_co2)
    ) × dt
  + bounded_noise
```

Keep values bounded to prevent impossible runaway.

Prototype outdoor CO₂ default:

```text
420 ppm
```

Keep configurable.

---

# 7.5 Humidity model

Humidity changes gradually based on:

- outside humidity,
- occupancy,
- HVAC operation,
- time,
- small bounded variation.

Do not regenerate a random humidity number every minute.

---

# 7.6 Ambient light model

Ambient light depends on:

- simulated time of day,
- daylight curve,
- room type,
- window factor.

Lighting automation may use occupancy + ambient light.

---

# 8. DEVICE MODELING

Devices have three layers:

```text
Device Definition
      ↓
Device Operating Model
      ↓
Room Meter Measurement
```

## 8.1 Device definition

Stores:

- type,
- rated voltage,
- rated power,
- quantity,
- controllability,
- protected flag,
- policy,
- layout position.

## 8.2 Device operating model

### LED

```text
OFF = 0 W
ON ≈ ratedPower × quantity
```

### Fan

```text
OFF = 0 W
LOW ≈ 0.50 × ratedPower
MEDIUM ≈ 0.75 × ratedPower
HIGH ≈ 1.00 × ratedPower
```

### AC

State machine:

```text
OFF
STARTING
COOLING
IDLE
```

Conceptual power:

```text
OFF       ≈ 0–5 W standby
STARTING  ≈ 1.0–1.1 × rated power
COOLING   ≈ 0.8–1.0 × rated power
IDLE      ≈ low fan/standby power
```

Actual power depends on:

- room temperature,
- target temperature,
- outside temperature,
- compressor state,
- fan state.

AC must not draw rated power constantly just because it is ON.

### Freezer

State machine:

```text
IDLE
COMPRESSOR_ON
COMPRESSOR_OFF
```

Freezer is protected. It continues operating/cycling even when room is vacant.

### Laptop Charging Port

Protected. Power can be:

```text
0 W
low charging
normal charging
near-full trickle
```

### Generic device

Required:

```text
ratedVoltageV
ratedPowerW
quantity
controllable
protected
behaviorProfile
```

Default behavior:

```text
ON → rated power
OFF → 0
```

---

# 9. DEVICE POLICY ENGINE

Policies are data-driven.

```ts
type DevicePolicy = {
  turnOnWhenOccupied: boolean;
  turnOffWhenVacant: boolean;
  vacancyDelaySeconds: number;
  minOnSeconds: number;
  minOffSeconds: number;
  temperatureRule?: {
    enabled: boolean;
    minC?: number;
    maxC?: number;
  };
  humidityRule?: {
    enabled: boolean;
    minPct?: number;
    maxPct?: number;
  };
  co2Rule?: {
    enabled: boolean;
    maxPpm?: number;
  };
  ambientLightRule?: {
    enabled: boolean;
    minLux?: number;
  };
  scheduleRule?: unknown;
  protected: boolean;
  allowManualOverride: boolean;
};
```

The policy engine reads policies and room state; it must not contain UI assumptions.

---

# 10. OCCUPANCY STATE MACHINE

Do not implement occupancy as only a boolean.

```text
OCCUPIED
     ↓ last person exits
VACANCY_PENDING
     ↓ vacancy delay/conditions met
VACANT

VACANCY_PENDING
     ↓ person returns
OCCUPIED

VACANT
     ↓ person enters
OCCUPIED
```

## Person enters

Immediate:

```text
occupancy > 0
state = OCCUPIED
```

Then:

- cancel vacancy timer,
- restore configured occupied devices,
- LED ON if configured,
- fan ON if configured,
- AC STARTING if configured,
- update sensor model,
- create events.

## Last person leaves

Immediate:

```text
state = VACANCY_PENDING
vacancyStartedAt = now
```

Then:

- LED OFF if policy says so,
- fan OFF if policy says so,
- AC vacancy timer starts,
- protected devices remain unchanged,
- unknown loads continue.

## Vacancy delay expires

For AC default 10 min:

1. compressor stops,
2. optional fan cooldown,
3. AC fully OFF,
4. savings session updated.

## Person returns during delay

Cancel pending shutdown and return to OCCUPIED. Only count savings that actually occurred.

---

# 11. MANUAL OVERRIDE

When the user changes a device manually, create an override.

```text
manualOverride = true
overrideSetAt = timestamp
overrideExpiresAt = optional
```

Automation must respect it.

UI:

```text
Manual Override Active
Clear Override
Turn Device ON
Turn Device OFF
```

Clearing override returns control to automatic policies.

---

# 12. VIRTUAL ROOM METER

Every room has exactly one primary virtual main meter.

It measures **all electrical consumption in the room**, including:

- registered controllable devices,
- registered protected devices,
- unregistered simulated loads,
- configured base/idle electrical consumption.

Conceptual structure:

```text
ROOM
 │
 └── Virtual Main Meter
       ├── registered device load A
       ├── registered device load B
       ├── protected load C
       └── unregistered load(s)
```

Device registration is not equivalent to metering.

---

# 13. ENERGY ACCOUNTING AND MATHEMATICS

All authoritative calculations happen in backend services.

## 13.1 Energy

```text
Energy (kWh) = Power (kW) × Time (hours)
```

For each simulation tick:

```text
energyTickKWh = actualPowerKw × (simulatedMinutes / 60)
```

Cumulative:

```text
energyTotalKWh = Σ energyTickKWh
```

## 13.2 Actual room consumption

```text
Actual Room Energy = sum of virtual meter energy over the selected interval
```

## 13.3 Expected registered consumption

At minimum:

```text
Expected Device Energy = Rated Power × Quantity × Active Runtime
```

For more realistic device models, use modeled operating power and operating periods.

```text
Expected Registered Energy = Σ Expected Device Energy
```

## 13.4 Unaccounted consumption

```text
Unaccounted Energy = Actual Room Energy - Expected Registered Energy
```

For display:

```text
displayUnaccounted = max(0, actual - expected)
```

Keep raw signed residual internally for diagnostics/calibration.

## 13.5 Residual percentage

```text
Residual % = Unaccounted Energy / Expected Registered Energy × 100
```

If denominator is near zero, return `null` and display `N/A`.

## 13.6 Cost

```text
Cost = Energy (kWh) × Tariff (₹/kWh)
```

## 13.7 CO₂ avoided

```text
CO2 Avoided (kg) = Energy Saved (kWh) × Grid Emission Factor (kgCO2/kWh)
```

The emission factor must be configurable.

## 13.8 Potential avoidable energy

```text
Excess Power = max(0, Actual Power - Expected Contextual Power)
```

```text
Potential Avoidable Energy = Excess Power × Duration
```

Example:

```text
Actual = 4.5 kW
Expected unoccupied = 0.8 kW
Duration = 1 h

Excess = 3.7 kW
Potential avoidable = 3.7 kWh
```

## 13.9 Energy saved

Savings are counterfactual:

```text
Energy Saved = Counterfactual No-Action Energy - Actual Post-Action Energy
```

Per tick:

```text
savedTickKWh = max(0, counterfactualPowerKw - actualPowerKw) × dtHours
```

Then:

```text
sessionSavedKWh = Σ savedTickKWh
```

Generate the counterfactual through a shadow simulation or deterministic predicted power model with the IntelliSave action removed.

## 13.10 Before/after

The UI may show:

```text
Without IntelliSave: 4.5 kW
With IntelliSave:    1.0 kW
Current reduction:   3.5 kW
```

Label simulated/counterfactual values appropriately.

---

# 14. BASELINE ENGINE

Baseline is room-specific, contextual and confidence-scored.

## 14.1 Context dimensions

At minimum:

```text
room
occupancy mode
schedule/time bucket
temperature context
device operating context
```

Required modes:

```text
OCCUPIED
UNOCCUPIED
```

## 14.2 Initial baseline

Immediately after room creation:

- use device models,
- use prototype defaults,
- baseline confidence = LOW.

As data accumulates, calculate room-specific historical averages.

## 14.3 Simple update formula

```text
B_t = alpha × P_t + (1 - alpha) × B_(t-1)
```

Only update from valid non-anomalous observations.

## 14.4 Baseline confidence

Store:

```text
LOW
MEDIUM
HIGH
```

Based on observations, diversity, calibration and freshness.

---

# 15. ENERGY ANOMALY / WASTE DETECTION

A single signal is not sufficient.

## 15.1 Generic deviation

```text
Deviation Power = Actual Power - Expected Power
```

```text
Deviation % = (Actual - Expected) / max(Expected, epsilon) × 100
```

## 15.2 Vacancy waste condition

Potential vacancy waste requires:

```text
occupancyCount == 0
AND relevant device remains active
AND actual power above contextual expected threshold
AND monitoring duration is reached
```

Prototype defaults:

```text
monitor duration = 2 min
high-confidence duration = 10 min
```

All configurable.

## 15.3 Alert confidence score

Suggested deterministic prototype scoring:

```text
Vacancy condition       0–30
Duration                0–25
Power deviation         0–30
Context consistency     0–15
----------------------------
Total                   0–100
```

Suggested mapping:

```text
80–100 = HIGH
60–79  = MEDIUM
40–59  = LOW
<40    = no alert
```

## 15.4 Alert tiers

### Monitor

Short deviation. No action.

### Potential waste

Conditions persist. Informational alert.

### High-confidence waste

Long duration + strong deviation + safe context. Recommendation/action enabled.

## 15.5 Occupied-room anomaly

Example:

```text
occupancy > 0
AND actual > expected + configured threshold
AND duration >= configured threshold
```

Possible causes include high temperature, device behavior, unregistered load or abnormal HVAC behavior. Do not automatically label every anomaly as waste.

---

# 16. COMFORT ENGINE

Comfort is a constraint.

The model is deliberately simple and configurable.

## 16.1 Component scores

Return:

```text
temperatureScore: 0–100
humidityScore: 0–100
airQualityScore: 0–100
```

## 16.2 Prototype assumptions

```text
Preferred temperature: 22–26 °C
Preferred humidity: 30–60 %
CO₂:
  < 800 ppm       high score
  800–1200 ppm    declining score
  > 1200 ppm      poor score
```

These are prototype assumptions and must remain configurable.

## 16.3 Comfort formula

Default weights:

```text
Comfort Score =
    0.50 × temperatureScore
  + 0.20 × humidityScore
  + 0.30 × airQualityScore
```

No hidden extra multipliers.

## 16.4 Empty room

When occupancy is zero, show:

```text
No occupants — comfort impact currently not applicable
```

Energy saving should not be blocked by human comfort for an empty room unless a device/system rule requires otherwise.

## 16.5 Comfort protection

When occupied and:

```text
comfortScore < configured threshold
```

or:

```text
CO₂ > configured action threshold
```

aggressive HVAC reduction should be blocked or reduced.

---

# 17. AUTOMATION ENGINE

The automation engine is the action layer.

## 17.1 Inputs

- occupancy state,
- temperature,
- humidity,
- CO₂,
- ambient light,
- device states,
- device policies,
- schedules,
- manual overrides,
- comfort,
- anomalies/waste.

## 17.2 Outputs

```text
TURN_ON
TURN_OFF
SET_SPEED
SET_TEMPERATURE
START_VACANCY_TIMER
CANCEL_VACANCY_TIMER
CLEAR_OVERRIDE
```

## 17.3 Priority

```text
Safety/protection constraints
        ↓
Manual override constraints
        ↓
Occupancy state
        ↓
Comfort/air quality
        ↓
Configured automation policy
        ↓
Energy optimization
```

## 17.4 Default occupancy behavior

### Person enters

```text
LED → ON
Fan → ON
AC → STARTING
```

if policies allow.

### All people leave

```text
LED → OFF
Fan → OFF
AC → vacancy pending
Freezer → unchanged
Laptop Port → unchanged
Unknown loads → unchanged
```

### Vacancy delay

For AC default 10 min:

```text
vacancy starts
→ timer begins
→ compressor stops at expiry
→ optional fan cooldown
→ AC OFF
```

Every action creates events.

---

# 18. SAVINGS SESSION ENGINE

Every meaningful vacancy automation should open or update a `SavingsSession`.

Example:

```text
10:30 empty
10:30 LED OFF
10:30 Fan OFF
10:30 AC vacancy timer starts
10:40 AC OFF
11:20 person returns
→ session closes
```

Store:

- room,
- start/end,
- trigger,
- affected devices,
- counterfactual energy,
- actual energy,
- saved kWh,
- saved ₹,
- avoided CO₂,
- comfort before/after,
- events.

If a person returns before the action happens, mark the session `INTERRUPTED` and count only real savings.

---

# 19. CALIBRATION MODE

Calibration makes the meter-vs-registration concept credible.

## 19.1 User flow

Click:

```text
Run Calibration
```

Explain:

```text
Turn off non-registered devices. IntelliSave will compare the room meter against
expected registered load and learn a room-specific baseline adjustment.
```

Backend:

1. create calibration session,
2. record initial state,
3. optionally pause conflicting energy automations,
4. run configured duration,
5. collect meter readings,
6. calculate expected registered energy,
7. compare actual and expected,
8. derive room-specific multiplier/offset,
9. store result,
10. update confidence,
11. publish progress/result events.

## 19.2 Baseline adjustment

For a sample:

```text
baselineMultiplier = median(actualPower / max(expectedRegisteredPower, epsilon))
```

Use a robust median/trimmed calculation.

Do not absorb known unregistered loads into the calibration baseline.

## 19.3 Result UI

```text
Calibration Complete

Expected registered power: 1.82 kW
Measured room power:       1.88 kW
Adjustment factor:         1.033
Confidence:                Medium
```

Then:

```text
Adjusted Expected Power = Registered Expected Power × Baseline Multiplier
```

---

# 20. WHAT-IF SIMULATOR

`Simulate What-If` runs a backend projected scenario without permanently changing current state until the user chooses to apply.

Example request:

```json
{
  "actions": [
    { "deviceId": "ac_01", "command": "TURN_OFF" }
  ],
  "durationMinutes": 30
}
```

Example response:

```json
{
  "durationMinutes": 30,
  "baselineEnergyKwh": 2.25,
  "projectedEnergyKwh": 0.60,
  "projectedSavingsKwh": 1.65,
  "projectedCostSavedInr": 13.2,
  "comfortImpact": {
    "before": 92,
    "after": 89
  },
  "safe": true
}
```

These values are calculated by backend simulation/analytics, never by the browser.

---

# 21. AI / LLM EXPLANATION LAYER

The analytics engine computes facts first. The AI explains them.

## 21.1 AI must not invent

Do not let the LLM generate:

- measurements,
- tariffs,
- energy arithmetic,
- savings arithmetic,
- sensor values,
- device states.

## 21.2 AI input example

```json
{
  "room": "Room 204",
  "occupancy": 0,
  "emptyDurationMinutes": 52,
  "actualPowerKw": 4.5,
  "expectedUnoccupiedPowerKw": 0.8,
  "temperatureC": 24,
  "co2Ppm": 520,
  "alertType": "VACANCY_ENERGY_WASTE",
  "potentialAvoidableEnergyKwh": 3.22,
  "estimatedCostInr": 25.76,
  "recommendedAction": "TURN_OFF_AC"
}
```

## 21.3 AI output example

```text
Room 204 has been empty for 52 minutes while HVAC consumption remains above its
normal unoccupied level. Reducing HVAC operation is recommended. Because there are
currently no occupants, the immediate comfort impact is expected to be low.
```

## 21.4 Deterministic fallback

Without an LLM provider:

```text
The room is unoccupied and HVAC power remains above the configured unoccupied
baseline. IntelliSave recommends reducing HVAC operation.
```

Core product functionality must still work.

---

# 22. BACKEND API SPECIFICATION

Use REST for CRUD/commands and WebSockets for live updates.

Base path:

```text
/api
```

## Dashboard

```text
GET /api/dashboard/summary
GET /api/dashboard/rooms
GET /api/dashboard/energy-series
GET /api/dashboard/events
```

## Rooms

```text
GET    /api/rooms
POST   /api/rooms
GET    /api/rooms/:roomId
PATCH  /api/rooms/:roomId
DELETE /api/rooms/:roomId
```

## Room state

```text
GET /api/rooms/:roomId/state
```

Response should include:

```json
{
  "room": {},
  "occupancy": {},
  "environment": {},
  "energy": {},
  "comfort": {},
  "automation": {}
}
```

## Sensors / telemetry

```text
GET /api/rooms/:roomId/sensors
GET /api/rooms/:roomId/telemetry
GET /api/rooms/:roomId/telemetry?from=...&to=...
```

## Devices

```text
GET    /api/rooms/:roomId/devices
POST   /api/rooms/:roomId/devices
GET    /api/devices/:deviceId
PATCH  /api/devices/:deviceId
DELETE /api/devices/:deviceId
PATCH  /api/devices/:deviceId/layout
POST   /api/devices/:deviceId/commands
GET    /api/devices/:deviceId/events
```

## People

```text
GET    /api/rooms/:roomId/people
POST   /api/rooms/:roomId/people
DELETE /api/rooms/:roomId/people/:personId
```

## Energy

```text
GET /api/rooms/:roomId/energy
GET /api/rooms/:roomId/energy/series
GET /api/rooms/:roomId/energy/accounting
```

## Savings

```text
GET /api/rooms/:roomId/savings
GET /api/rooms/:roomId/savings/sessions
GET /api/rooms/:roomId/savings/sessions/:sessionId
```

## Alerts / recommendations

```text
GET  /api/rooms/:roomId/alerts
POST /api/rooms/:roomId/alerts/:alertId/acknowledge
POST /api/rooms/:roomId/alerts/:alertId/what-if
POST /api/rooms/:roomId/alerts/:alertId/apply
```

## Actions

```text
POST /api/rooms/:roomId/actions
GET  /api/rooms/:roomId/actions
```

## Calibration

```text
POST /api/rooms/:roomId/calibration/start
POST /api/rooms/:roomId/calibration/stop
GET  /api/rooms/:roomId/calibration
```

## Scenarios

```text
POST /api/rooms/:roomId/scenarios
```

## Simulation

```text
GET  /api/simulation/status
POST /api/simulation/start
POST /api/simulation/pause
POST /api/simulation/resume
POST /api/simulation/step
POST /api/simulation/reset
POST /api/simulation/speed
```

## Settings

```text
GET   /api/settings
PATCH /api/settings
```

## AI

```text
POST /api/ai/explain-alert
POST /api/ai/explain-recommendation
```

---

# 23. WEBSOCKET EVENT CONTRACT

Use a shared typed event schema.

```json
{
  "eventId": "evt_123",
  "timestamp": "2026-09-25T14:30:00.000Z",
  "buildingId": "bld_01",
  "roomId": "room_101",
  "source": "simulation",
  "eventType": "DEVICE_STATE_CHANGED",
  "payload": {
    "deviceId": "fan_01",
    "from": "ON",
    "to": "OFF",
    "reason": "ROOM_VACANT"
  }
}
```

Required event types:

```text
ROOM_CREATED
ROOM_UPDATED
ROOM_ARCHIVED

PERSON_ENTERED
PERSON_EXITED
OCCUPANCY_CHANGED

SENSOR_READING_CREATED
ROOM_TELEMETRY_UPDATED

DEVICE_REGISTERED
DEVICE_UPDATED
DEVICE_STATE_CHANGED
DEVICE_COMMAND_REJECTED

AUTOMATION_ACTION
VACANCY_TIMER_STARTED
VACANCY_TIMER_CANCELLED

ALERT_CREATED
ALERT_UPDATED

RECOMMENDATION_CREATED
RECOMMENDATION_APPLIED

SAVINGS_SESSION_STARTED
SAVINGS_EVENT_CREATED
SAVINGS_UPDATED
SAVINGS_SESSION_CLOSED

CALIBRATION_STARTED
CALIBRATION_PROGRESS
CALIBRATION_COMPLETED

SCENARIO_APPLIED

SIMULATION_TICK
SIMULATION_PAUSED
SIMULATION_RESUMED
```

---

# 24. DATABASE DESIGN

Use PostgreSQL as the primary relational database and Prisma ORM for type-safe access and migrations.

## Main entities

```text
Building
Room
RoomSettings
Sensor
SensorReading
RoomTelemetry
DeviceCatalog
Device
DevicePolicy
DeviceStateEvent
DeviceOperatingPeriod
Person
OccupancyEvent
EnergyBaseline
Alert
Recommendation
ActionEvent
SavingsSession
SavingsEvent
CalibrationSession
SimulationRun
SimulationScenarioEvent
SystemSetting
EventLog
```

## Relationship diagram

```text
Building
  │
  ├── Rooms
  │     │
  │     ├── RoomSettings
  │     ├── Sensors
  │     │     └── SensorReadings
  │     ├── RoomTelemetry
  │     ├── People
  │     │     └── OccupancyEvents
  │     ├── Devices
  │     │     ├── DeviceCatalog
  │     │     ├── DevicePolicy
  │     │     ├── DeviceStateEvents
  │     │     └── DeviceOperatingPeriods
  │     ├── EnergyBaselines
  │     ├── Alerts
  │     │     └── Recommendations
  │     ├── ActionEvents
  │     ├── SavingsSessions
  │     │     └── SavingsEvents
  │     └── CalibrationSessions
  │
  └── EventLog
```

---

# 25. PRISMA SCHEMA — REFERENCE DATA CONTRACT

Use the current stable Prisma syntax/config for the installed Prisma version. The following models define the intended domain contract; adapt only version-specific generator/config syntax.

```prisma
enum RoomStatus {
  ACTIVE
  ARCHIVED
}

enum SensorType {
  OCCUPANCY_PIR
  OCCUPANCY_MMWAVE
  TEMPERATURE
  HUMIDITY
  CO2
  AMBIENT_LIGHT
  ENERGY_METER
}

enum DeviceType {
  AC
  FAN
  LED
  FREEZER
  LAPTOP_PORT
  TUBE_LIGHT
  DESKTOP
  PROJECTOR
  GENERIC
}

enum DeviceState {
  OFF
  STARTING
  COOLING
  IDLE
  ON
  LOW
  MEDIUM
  HIGH
  COMPRESSOR_ON
  COMPRESSOR_OFF
}

enum OccupancyState {
  OCCUPIED
  VACANCY_PENDING
  VACANT
}

enum AlertSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum AlertType {
  VACANCY_ENERGY_WASTE
  ENERGY_ANOMALY
  UNACCOUNTED_CONSUMPTION
  COMFORT_RISK
  CO2_HIGH
}

enum RecommendationStatus {
  PENDING
  SIMULATED
  APPLIED
  REJECTED
  EXPIRED
}

enum EventSource {
  USER
  SIMULATION
  AUTOMATION
  SYSTEM
  AI
}

enum SavingsSessionStatus {
  OPEN
  CLOSED
  INTERRUPTED
  CANCELLED
}

enum CalibrationStatus {
  RUNNING
  COMPLETED
  CANCELLED
  FAILED
}

model Building {
  id            String      @id @default(cuid())
  name          String
  locationLabel String?
  timezone      String      @default("Asia/Kolkata")
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  rooms         Room[]
  eventLogs     EventLog[]
}

model Room {
  id                  String                    @id @default(cuid())
  buildingId          String
  name                String
  type                String
  floor               Int?
  capacity            Int?
  status              RoomStatus                @default(ACTIVE)
  createdAt           DateTime                  @default(now())
  updatedAt           DateTime                  @updatedAt
  building            Building                  @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  settings            RoomSettings?
  sensors             Sensor[]
  telemetry           RoomTelemetry[]
  devices             Device[]
  people              Person[]
  occupancyEvents     OccupancyEvent[]
  baselines           EnergyBaseline[]
  alerts              Alert[]
  recommendations     Recommendation[]
  actionEvents        ActionEvent[]
  savingsSessions     SavingsSession[]
  calibrationSessions CalibrationSession[]
  simulationRuns      SimulationRun[]
  scenarioEvents      SimulationScenarioEvent[]
  eventLogs           EventLog[]

  @@index([buildingId])
  @@index([status])
}

model RoomSettings {
  id                         String   @id @default(cuid())
  roomId                     String   @unique
  defaultVacancyDelaySec     Int      @default(600)
  anomalyDurationSec         Int      @default(600)
  monitorDurationSec         Int      @default(120)
  excessPowerThresholdKw     Float    @default(0.20)
  deviationThresholdPct      Float    @default(15.0)
  preferredTempMinC           Float    @default(22)
  preferredTempMaxC           Float    @default(26)
  preferredHumidityMinPct     Float    @default(30)
  preferredHumidityMaxPct     Float    @default(60)
  preferredCo2MaxPpm          Float    @default(1200)
  tempWeight                  Float    @default(0.50)
  humidityWeight              Float    @default(0.20)
  co2Weight                   Float    @default(0.30)
  outsideTemperatureC         Float    @default(32)
  outsideHumidityPct          Float    @default(55)
  outdoorCo2Ppm               Float    @default(420)
  baseUnregisteredPowerW      Float    @default(80)
  baselineMultiplier          Float    @default(1.0)
  baselineOffsetKw            Float    @default(0.0)
  baselineConfidence          String   @default("LOW")
  updatedAt                   DateTime @updatedAt
  room                        Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
}

model Sensor {
  id         String       @id @default(cuid())
  roomId     String
  name       String
  type       SensorType
  unit       String
  enabled    Boolean      @default(true)
  virtual    Boolean      @default(true)
  metadata   Json?
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  room       Room         @relation(fields: [roomId], references: [id], onDelete: Cascade)
  readings   SensorReading[]

  @@index([roomId, type])
}

model SensorReading {
  id           String   @id @default(cuid())
  sensorId     String
  roomId       String
  timestamp    DateTime
  numericValue Float
  quality      String   @default("GOOD")
  metadata     Json?
  sensor       Sensor   @relation(fields: [sensorId], references: [id], onDelete: Cascade)

  @@index([roomId, timestamp])
  @@index([sensorId, timestamp])
}

model RoomTelemetry {
  id                 String         @id @default(cuid())
  roomId             String
  timestamp          DateTime
  occupancyCount     Int
  temperatureC       Float
  humidityPct        Float
  co2Ppm             Float
  ambientLightLux    Float
  actualPowerKw      Float
  expectedPowerKw    Float
  unaccountedPowerKw Float
  hvacPowerKw        Float
  lightingPowerKw    Float
  otherPowerKw       Float
  comfortScore       Float?
  occupancyState     OccupancyState
  createdAt          DateTime       @default(now())
  room               Room           @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@unique([roomId, timestamp])
  @@index([roomId, timestamp])
}

model DeviceCatalog {
  id                    String     @id @default(cuid())
  name                  String
  type                  DeviceType
  iconKey               String
  defaultRatedPowerW    Float
  defaultVoltageV       Float
  defaultControllable   Boolean
  defaultProtected      Boolean
  defaultPolicy         Json?
  behaviorProfile       String
  createdAt             DateTime   @default(now())
  devices               Device[]
}

model Device {
  id                  String       @id @default(cuid())
  roomId              String
  catalogId           String?
  name                String
  type                DeviceType
  ratedPowerW         Float
  ratedVoltageV       Float
  quantity             Int          @default(1)
  controllable        Boolean      @default(true)
  protected           Boolean      @default(false)
  currentState        DeviceState  @default(OFF)
  currentPowerW       Float        @default(0)
  targetSetpointC     Float?
  manualOverride      Boolean      @default(false)
  overrideSetAt       DateTime?
  overrideExpiresAt   DateTime?
  wallX               Float        @default(50)
  wallY               Float        @default(50)
  rotationDeg         Float        @default(0)
  modelConfig         Json?
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt
  room                 Room         @relation(fields: [roomId], references: [id], onDelete: Cascade)
  catalog              DeviceCatalog? @relation(fields: [catalogId], references: [id], onDelete: SetNull)
  policy               DevicePolicy?
  stateEvents          DeviceStateEvent[]
  operatingPeriods     DeviceOperatingPeriod[]

  @@index([roomId])
}

model DevicePolicy {
  id                  String   @id @default(cuid())
  deviceId            String   @unique
  turnOnWhenOccupied  Boolean  @default(false)
  turnOffWhenVacant   Boolean  @default(false)
  vacancyDelaySec     Int      @default(0)
  minOnSec            Int      @default(0)
  minOffSec           Int      @default(0)
  temperatureRule     Json?
  humidityRule        Json?
  co2Rule             Json?
  ambientLightRule    Json?
  scheduleRule        Json?
  protected           Boolean  @default(false)
  allowManualOverride Boolean  @default(true)
  updatedAt            DateTime @updatedAt
  device              Device   @relation(fields: [deviceId], references: [id], onDelete: Cascade)
}

model DeviceStateEvent {
  id         String       @id @default(cuid())
  deviceId   String
  roomId     String
  timestamp  DateTime
  fromState  DeviceState?
  toState    DeviceState
  reason     String
  source     EventSource
  metadata   Json?
  device     Device       @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([roomId, timestamp])
  @@index([deviceId, timestamp])
}

model DeviceOperatingPeriod {
  id            String      @id @default(cuid())
  deviceId      String
  roomId        String
  startAt       DateTime
  endAt         DateTime?
  state         DeviceState
  modeledPowerW Float
  device        Device      @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([roomId, startAt])
  @@index([deviceId, startAt])
}

model Person {
  id                    String   @id @default(cuid())
  roomId                String
  displayName           String
  active                Boolean  @default(true)
  heatGainW             Float    @default(100)
  co2GenerationPpmPerHour Float   @default(20)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  room                  Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  occupancyEvents       OccupancyEvent[]
}

model OccupancyEvent {
  id             String   @id @default(cuid())
  roomId         String
  personId       String?
  timestamp      DateTime
  eventType      String
  occupancyCount Int
  source         EventSource
  metadata       Json?
  person         Person?  @relation(fields: [personId], references: [id], onDelete: SetNull)

  @@index([roomId, timestamp])
}

model EnergyBaseline {
  id                 String   @id @default(cuid())
  roomId             String
  operatingMode      String
  scheduleBucket     String?
  temperatureBucket  String?
  expectedPowerKw    Float
  baselineMultiplier Float    @default(1.0)
  confidence         String   @default("LOW")
  sampleCount        Int      @default(0)
  alpha              Float    @default(0.20)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  room               Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, operatingMode])
}

model Alert {
  id                    String          @id @default(cuid())
  roomId                String
  type                  AlertType
  severity              AlertSeverity
  score                 Float
  status                String          @default("OPEN")
  reason                String
  createdAt             DateTime        @default(now())
  resolvedAt            DateTime?
  actualPowerKw         Float?
  expectedPowerKw       Float?
  deviationPct          Float?
  durationSec           Int?
  facts                 Json?
  room                  Room            @relation(fields: [roomId], references: [id], onDelete: Cascade)
  recommendations      Recommendation[]

  @@index([roomId, createdAt])
  @@index([status, createdAt])
}

model Recommendation {
  id                    String               @id @default(cuid())
  roomId                String
  alertId               String?
  actionType            String
  status                RecommendationStatus @default(PENDING)
  explanationFacts      Json
  estimatedEnergyKwh    Float?
  estimatedCostInr      Float?
  estimatedCo2Kg        Float?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  room                  Room      @relation(fields: [roomId], references: [id], onDelete: Cascade)
  alert                 Alert?    @relation(fields: [alertId], references: [id], onDelete: SetNull)

  @@index([roomId, createdAt])
}

model ActionEvent {
  id              String      @id @default(cuid())
  roomId          String
  deviceId        String?
  timestamp       DateTime
  actionType      String
  source          EventSource
  reason          String
  beforeState     String?
  afterState      String?
  energyImpactKwh Float?
  metadata        Json?
  room            Room        @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, timestamp])
}

model SavingsSession {
  id                      String               @id @default(cuid())
  roomId                  String
  status                  SavingsSessionStatus
  triggerType             String
  startedAt               DateTime
  endedAt                 DateTime?
  counterfactualEnergyKwh Float                @default(0)
  actualEnergyKwh         Float                @default(0)
  savedEnergyKwh          Float                @default(0)
  savedCostInr            Float                @default(0)
  avoidedCo2Kg            Float                @default(0)
  comfortBefore           Float?
  comfortAfter            Float?
  comfortMaintained       Boolean?
  metadata                Json?
  room                    Room                 @relation(fields: [roomId], references: [id], onDelete: Cascade)
  events                  SavingsEvent[]

  @@index([roomId, startedAt])
}

model SavingsEvent {
  id                       String   @id @default(cuid())
  sessionId                String
  timestamp                DateTime
  counterfactualPowerKw    Float
  actualPowerKw            Float
  savedPowerKw             Float
  counterfactualEnergyKwh  Float
  actualEnergyKwh          Float
  savedEnergyKwh           Float
  reason                   String
  metadata                 Json?
  session                  SavingsSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, timestamp])
}

model CalibrationSession {
  id                    String            @id @default(cuid())
  roomId                String
  status                CalibrationStatus
  startedAt             DateTime
  endedAt               DateTime?
  expectedEnergyKwh     Float?
  actualEnergyKwh       Float?
  baselineMultiplier    Float?
  baselineOffsetKw      Float?
  confidence            String?
  metadata              Json?
  room                  Room              @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, startedAt])
}

model SimulationRun {
  id                  String   @id @default(cuid())
  roomId              String?
  scenario            String
  startedAt           DateTime @default(now())
  endedAt             DateTime?
  beforeEnergyKwh     Float?
  afterEnergyKwh      Float?
  estimatedSavingKwh  Float?
  metadata            Json?
  room                Room?    @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, startedAt])
}

model SimulationScenarioEvent {
  id         String   @id @default(cuid())
  roomId     String
  timestamp  DateTime
  scenario   String
  parameters Json?
  room       Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, timestamp])
}

model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       Json
  description String?
  updatedAt   DateTime @updatedAt
}

model EventLog {
  id         String      @id @default(cuid())
  buildingId String
  roomId     String?
  timestamp  DateTime
  source     EventSource
  eventType  String
  payload    Json
  building   Building    @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  room       Room?       @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([buildingId, timestamp])
  @@index([roomId, timestamp])
  @@index([eventType, timestamp])
}
```

---

# 26. DATABASE IMPLEMENTATION NOTES

Historical queries frequently filter by:

```text
roomId + timestamp
sensorId + timestamp
deviceId + timestamp
buildingId + timestamp
```

Add indexes accordingly.

For the prototype, keep all telemetry. For a future large deployment, roll up minute data into hourly/daily aggregates and retain event/audit history longer.

Current state is optimized for fast access; history remains append-oriented.

---

# 27. BUILDING AGGREGATION LOGIC

Building-level values are room sums.

```text
buildingPower       = Σ room.actualPowerKw
buildingEnergy      = Σ room.energyTodayKwh
buildingSavings     = Σ room.savedEnergyKwh
buildingCostSaved   = Σ room.savedCostInr
buildingCo2Avoided  = Σ room.avoidedCo2Kg
```

Do not maintain a competing independent building simulation.

---

# 28. EVENT / AUDIT MODEL

All important actions need an auditable event.

```json
{
  "eventId": "...",
  "timestamp": "...",
  "buildingId": "...",
  "roomId": "...",
  "source": "automation",
  "eventType": "DEVICE_STATE_CHANGED",
  "payload": {
    "deviceId": "...",
    "from": "ON",
    "to": "OFF",
    "reason": "ROOM_VACANT"
  }
}
```

Required reasons include:

```text
ROOM_OCCUPIED
ROOM_VACANT
VACANCY_DELAY_EXPIRED
HIGH_CO2
HIGH_TEMPERATURE
MANUAL_USER_ACTION
MANUAL_OVERRIDE
PROTECTED_DEVICE
SIMULATION_SCENARIO
RECOMMENDATION_APPLIED
```

---

# 29. RECOMMENDATION ENGINE

Every recommendation should answer:

```text
WHY?
WHAT?
WHY NOW?
EXPECTED IMPACT?
COMFORT IMPACT?
```

Example:

```text
Why: Room has been unoccupied for 48 minutes.
What: Turn off the AC.
Why now: Vacancy threshold has been exceeded.
Expected impact: Reduce modeled HVAC consumption.
Comfort: No current occupants.
Confidence: High.
```

Numerical impact is always produced by analytics/what-if services.

---

# 30. UNREGISTERED LOAD DETECTION

Example:

```text
Registered:
2 × LED 9 W
AC 1500 W
Fan 60 W

Room meter actual:
higher than expected registered load
```

UI:

```text
Unaccounted consumption detected.

Actual room consumption is 12.2% above expected registered consumption.

Possible causes:
• non-registered load
• device model deviation
• base electrical consumption
```

Never identify a specific unknown load unless independently metered.

---

# 31. DEVICE CATALOG DEFAULTS

Seed at least:

| Type | Rated Power | Voltage | Controllable | Protected | Default Policy |
|---|---:|---:|---|---|---|
| AC | 1500 W | 230 V | Yes | No | Occupied ON; vacant after 10 min |
| Fan | 60 W | 230 V | Yes | No | Occupied ON; vacant OFF immediately |
| LED | 9 W | 230 V | Yes | No | Occupied ON; vacant OFF immediately |
| Freezer | 180 W | 230 V | No | Yes | Compressor cycles regardless of occupancy |
| Laptop Charging Port | 65 W | 230 V | No | Yes | Protected |
| Tube Light | 20 W | 230 V | Yes | No | Occupied ON |
| Desktop | 150 W | 230 V | Yes | No | Configurable |
| Projector | 250 W | 230 V | Yes | No | Configurable |
| Generic Load | 100 W | 230 V | Yes | No | Manual |

All values are editable prototype defaults.

---

# 32. UI / UX DESIGN SYSTEM

The theme should resemble a modern IoT energy-management / smart-building control platform.

## 32.1 Visual direction

Use:

- deep charcoal / near-black application shell,
- warm white/cool card surfaces,
- electric green energy accents,
- cyan/blue telemetry accents,
- amber warnings,
- red only for critical errors,
- subtle grid/technical patterns,
- rounded but restrained cards,
- thin borders,
- clean industrial typography.

Avoid:

- generic SaaS purple gradients,
- excessive glassmorphism,
- gaming UI,
- cartoonish visuals,
- huge decorative gradients.

## 32.2 Typography

Use a modern readable sans-serif.

Numbers should be visually prominent:

```text
4.82 kW
12.84 kWh
₹102.72
91 / 100
```

## 32.3 Semantic status colors

```text
Green = normal / healthy / active saving
Blue  = informational / telemetry
Amber = warning / pending
Red   = critical / blocked / error
Gray  = inactive / unavailable
```

Never communicate state by color alone; also use text/icon.

## 32.4 Charts

Charts need:

- axes,
- units,
- legend,
- tooltips,
- time-range controls,
- event markers.

## 32.5 Device wall UX

The device wall should be physical enough to understand the building concept, but not game-like.

Use:

```text
simple room background
light floor grid
device cards/icons
small state indicators
power badge
subtle animations
```

## 32.6 Responsive behavior

Desktop-first:

- 1440 px,
- 1280 px,
- 1024 px.

Still usable at tablet widths.

At narrow widths:

- room grid collapses,
- drawers become full-width,
- device wall becomes scrollable/zoomable.

## 32.7 Loading / error / empty states

Every backend-driven panel needs:

- loading skeleton,
- empty state,
- error state.

## 32.8 Realtime indicator

Show:

```text
● Live
```

or:

```text
● Reconnecting…
```

or:

```text
● Offline
```

Existing data remains visible during reconnect.

---

# 33. TECH STACK

Use a TypeScript-first full-stack architecture.

## Frontend

```text
React
Vite
TypeScript
Tailwind CSS
shadcn/ui
Recharts
Zustand
TanStack Query
Socket.IO Client
Lucide React
```

## Backend

```text
Node.js
Fastify
TypeScript
Zod
Socket.IO
```

## Database

```text
PostgreSQL
Prisma ORM
```

## Infrastructure

```text
Docker Compose
```

Core prototype must not require a paid service.

## Optional future services

```text
Redis
Python FastAPI
scikit-learn
XGBoost
LLM API
```

These are not mandatory for v1.

---

# 34. VERSION POLICY

Use current stable compatible versions for the chosen stack.

Do not blindly copy deprecated setup instructions.

For Prisma in particular:

- use the current stable Prisma major,
- follow that major's current config/generator conventions,
- keep PostgreSQL as the datasource,
- do not force legacy setup into a current project.

---

# 35. FRONTEND ARCHITECTURE

Recommended structure:

```text
apps/web/
  src/
    app/
      router.tsx
      providers.tsx
      layout.tsx

    pages/
      DashboardPage/
      RoomsPage/
      RoomAnalyticsPage/
      RoomDeviceWallPage/
      SettingsPage/

    components/
      layout/
      dashboard/
      rooms/
      room/
      devices/
      sensors/
      energy/
      savings/
      alerts/
      simulation/
      calibration/
      ai/
      common/

    features/
      dashboard/
      rooms/
      roomAnalytics/
      deviceWall/
      settings/
      simulation/

    hooks/
    lib/
      api/
      websocket/
      formatters/
      validators/
    store/
    types/
    styles/
```

---

# 36. BACKEND ARCHITECTURE

Use modular backend design.

```text
apps/api/
  src/
    app.ts
    server.ts

    config/
      env.ts
      defaults.ts

    db/
      prisma.ts
      repositories/

    modules/
      buildings/
      rooms/
      devices/
      people/
      sensors/

      simulation/
        simulation-engine.ts
        simulation-clock.ts
        simulation-state.ts
        environment-model.ts
        occupancy-model.ts
        sensor-models/
          occupancy-pir.ts
          occupancy-mmwave.ts
          temperature.ts
          humidity.ts
          co2.ts
          ambient-light.ts
          energy-meter.ts
        device-models/
          base-device-model.ts
          led-model.ts
          fan-model.ts
          ac-model.ts
          freezer-model.ts
          laptop-port-model.ts
          generic-device-model.ts
        scenarios/
          room-empty.ts
          high-temperature.ts
          high-co2.ts
          unregistered-load.ts
          reset-room.ts

      energy/
        meter-engine.ts
        actual-energy.ts
        expected-energy.ts
        accounting.ts
        tariff-engine.ts
        emissions-engine.ts

      automation/
        policy-engine.ts
        occupancy-rules.ts
        comfort-rules.ts
        action-engine.ts
        manual-override.ts

      analytics/
        baseline-engine.ts
        anomaly-engine.ts
        waste-detector.ts
        deviation.ts
        confidence.ts

      comfort/
        comfort-engine.ts
        scoring.ts

      recommendations/
        recommendation-engine.ts
        what-if-engine.ts

      savings/
        savings-engine.ts
        session-manager.ts
        counterfactual-engine.ts

      calibration/
        calibration-engine.ts

      events/
        event-log.service.ts
        event-bus.ts

      ai/
        ai.service.ts
        prompt-builder.ts
        deterministic-explainer.ts

    routes/
      dashboard.routes.ts
      rooms.routes.ts
      devices.routes.ts
      people.routes.ts
      sensors.routes.ts
      energy.routes.ts
      savings.routes.ts
      calibration.routes.ts
      simulation.routes.ts
      settings.routes.ts
      ai.routes.ts

    schemas/
      rooms.schema.ts
      devices.schema.ts
      people.schema.ts
      simulation.schema.ts
      ai.schema.ts

    websocket/
      socket-server.ts
      event-publisher.ts

    utils/
      time.ts
      math.ts
      logger.ts
      errors.ts

    tests/
```

---

# 37. SHARED PACKAGE

Frontend and backend must share domain/event types.

```text
packages/shared/
  src/
    events/
      event-types.ts
      event-schema.ts
    api/
      dashboard.ts
      rooms.ts
      devices.ts
      people.ts
      energy.ts
      savings.ts
    domain/
      room.ts
      device.ts
      sensor.ts
      person.ts
      savings.ts
      alerts.ts
    simulation/
      simulation-types.ts
    constants/
      device-types.ts
      sensor-types.ts
      thresholds.ts
    index.ts
```

---

# 38. COMPLETE PROJECT REPOSITORY STRUCTURE

The agent should create approximately this structure:

```text
intellisave/
│
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── .gitignore
├── .env.example
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
├── prettier.config.js
│
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── app/
│   │       │   ├── App.tsx
│   │       │   ├── router.tsx
│   │       │   ├── layout.tsx
│   │       │   └── providers.tsx
│   │       ├── pages/
│   │       │   ├── DashboardPage/
│   │       │   ├── RoomsPage/
│   │       │   ├── RoomAnalyticsPage/
│   │       │   ├── RoomDeviceWallPage/
│   │       │   └── SettingsPage/
│   │       ├── components/
│   │       │   ├── layout/
│   │       │   │   ├── AppShell.tsx
│   │       │   │   ├── Sidebar.tsx
│   │       │   │   ├── TopBar.tsx
│   │       │   │   ├── SimulationToolbar.tsx
│   │       │   │   └── ConnectionStatus.tsx
│   │       │   ├── dashboard/
│   │       │   │   ├── BuildingKpiGrid.tsx
│   │       │   │   ├── RoomCard.tsx
│   │       │   │   ├── BuildingEnergyChart.tsx
│   │       │   │   └── DashboardAlerts.tsx
│   │       │   ├── rooms/
│   │       │   │   ├── RoomGrid.tsx
│   │       │   │   ├── RoomList.tsx
│   │       │   │   ├── CreateRoomDialog.tsx
│   │       │   │   └── RoomCardSkeleton.tsx
│   │       │   ├── room/
│   │       │   │   ├── RoomHeader.tsx
│   │       │   │   ├── RoomTabs.tsx
│   │       │   │   ├── OccupancyPanel.tsx
│   │       │   │   ├── PersonList.tsx
│   │       │   │   ├── AddPersonDialog.tsx
│   │       │   │   ├── SensorGrid.tsx
│   │       │   │   ├── ComfortPanel.tsx
│   │       │   │   ├── EventTimeline.tsx
│   │       │   │   └── RoomScenarioPanel.tsx
│   │       │   ├── devices/
│   │       │   │   ├── DeviceCard.tsx
│   │       │   │   ├── DeviceWall.tsx
│   │       │   │   ├── AddDeviceDialog.tsx
│   │       │   │   ├── DeviceSettingsDrawer.tsx
│   │       │   │   ├── DeviceStateIndicator.tsx
│   │       │   │   └── DeviceCatalogPicker.tsx
│   │       │   ├── energy/
│   │       │   │   ├── EnergyChart.tsx
│   │       │   │   ├── EnergyAccountingCard.tsx
│   │       │   │   ├── EnergyImpactCard.tsx
│   │       │   │   └── ActionMarkers.tsx
│   │       │   ├── savings/
│   │       │   │   ├── SavingsKpis.tsx
│   │       │   │   ├── SavingsSessionDrawer.tsx
│   │       │   │   └── CounterfactualComparison.tsx
│   │       │   ├── alerts/
│   │       │   │   ├── AlertCard.tsx
│   │       │   │   ├── AlertDrawer.tsx
│   │       │   │   ├── RecommendationCard.tsx
│   │       │   │   └── WhatIfDialog.tsx
│   │       │   ├── calibration/
│   │       │   │   ├── CalibrationDialog.tsx
│   │       │   │   └── CalibrationResult.tsx
│   │       │   ├── simulation/
│   │       │   │   ├── SimulationSpeedControl.tsx
│   │       │   │   ├── ScenarioButton.tsx
│   │       │   │   └── SimulationStatus.tsx
│   │       │   └── common/
│   │       │       ├── EmptyState.tsx
│   │       │       ├── ErrorState.tsx
│   │       │       ├── MetricCard.tsx
│   │       │       ├── StatusBadge.tsx
│   │       │       ├── ConfirmDialog.tsx
│   │       │       └── LoadingSkeleton.tsx
│   │       ├── features/
│   │       │   ├── dashboard/
│   │       │   ├── rooms/
│   │       │   ├── roomAnalytics/
│   │       │   ├── deviceWall/
│   │       │   ├── savings/
│   │       │   └── simulation/
│   │       ├── hooks/
│   │       │   ├── useDashboard.ts
│   │       │   ├── useRoom.ts
│   │       │   ├── useRoomTelemetry.ts
│   │       │   ├── useDevices.ts
│   │       │   ├── usePeople.ts
│   │       │   ├── useSavings.ts
│   │       │   └── useSocket.ts
│   │       ├── lib/
│   │       │   ├── api/
│   │       │   │   ├── client.ts
│   │       │   │   ├── dashboard.ts
│   │       │   │   ├── rooms.ts
│   │       │   │   ├── devices.ts
│   │       │   │   ├── people.ts
│   │       │   │   ├── energy.ts
│   │       │   │   ├── savings.ts
│   │       │   │   └── simulation.ts
│   │       │   ├── websocket/
│   │       │   │   ├── socket.ts
│   │       │   │   └── event-handlers.ts
│   │       │   └── formatters/
│   │       │       ├── energy.ts
│   │       │       ├── currency.ts
│   │       │       └── time.ts
│   │       ├── store/
│   │       │   ├── appStore.ts
│   │       │   ├── simulationStore.ts
│   │       │   └── roomStore.ts
│   │       ├── styles/
│   │       │   ├── globals.css
│   │       │   └── tokens.css
│   │       └── test/
│   │
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── app.ts
│           ├── server.ts
│           ├── config/
│           │   ├── env.ts
│           │   └── defaults.ts
│           ├── db/
│           │   ├── prisma.ts
│           │   └── repositories/
│           ├── modules/
│           │   ├── buildings/
│           │   ├── rooms/
│           │   ├── devices/
│           │   ├── people/
│           │   ├── sensors/
│           │   ├── simulation/
│           │   ├── energy/
│           │   ├── automation/
│           │   ├── analytics/
│           │   ├── comfort/
│           │   ├── recommendations/
│           │   ├── savings/
│           │   ├── calibration/
│           │   ├── events/
│           │   └── ai/
│           ├── routes/
│           │   ├── dashboard.routes.ts
│           │   ├── rooms.routes.ts
│           │   ├── devices.routes.ts
│           │   ├── people.routes.ts
│           │   ├── sensors.routes.ts
│           │   ├── energy.routes.ts
│           │   ├── savings.routes.ts
│           │   ├── calibration.routes.ts
│           │   ├── simulation.routes.ts
│           │   ├── settings.routes.ts
│           │   └── ai.routes.ts
│           ├── schemas/
│           ├── websocket/
│           ├── utils/
│           └── tests/
│
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   └── src/
│   │       ├── api/
│   │       ├── domain/
│   │       ├── events/
│   │       ├── simulation/
│   │       ├── constants/
│   │       └── index.ts
│   ├── ui/
│   │   ├── package.json
│   │   └── src/
│   │       ├── button/
│   │       ├── card/
│   │       ├── dialog/
│   │       ├── drawer/
│   │       ├── badge/
│   │       └── index.ts
│   └── config/
│       ├── package.json
│       ├── eslint/
│       ├── prettier/
│       └── tsconfig/
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DOMAIN_MODEL.md
│   ├── SIMULATION_MODEL.md
│   ├── ENERGY_MATH.md
│   ├── COMFORT_MODEL.md
│   ├── AUTOMATION_RULES.md
│   ├── SAVINGS_METHODOLOGY.md
│   ├── DEMO_SCRIPT.md
│   ├── ASSUMPTIONS.md
│   └── FUTURE_IOT_INTEGRATION.md
│
├── scripts/
│   ├── seed-demo.ts
│   ├── reset-db.ts
│   └── verify-system.ts
│
├── ml/
│   └── README.md
│
└── .github/
    └── workflows/
        ├── ci.yml
        └── lint.yml
```

---

# 39. PACKAGE RESPONSIBILITIES

## `apps/web`

Frontend only. Never run authoritative simulation, calculate authoritative savings, mutate DB or independently decide automation.

## `apps/api`

Owns business logic, simulation, DB access, calculations, automation, events and WebSockets.

## `packages/shared`

Owns shared types, event schemas, domain constants and validation contracts.

## `packages/ui`

Reusable UI primitives.

## `prisma`

Schema, migrations and seed.

## `docs`

All prototype assumptions and architecture.

---

# 40. STATE MANAGEMENT

## Frontend

Use TanStack Query for server state:

- rooms,
- devices,
- telemetry history,
- alerts,
- savings,
- settings.

Use Zustand for UI state:

- selected room,
- selected device,
- open drawers,
- simulation toolbar state,
- temporary interaction state.

WebSocket updates should patch/invalidate query caches. Do not duplicate the entire backend simulation state in multiple frontend stores.

---

# 41. ERROR HANDLING

Backend returns structured errors.

Example:

```json
{
  "error": {
    "code": "DEVICE_PROTECTED",
    "message": "This device is protected and cannot be controlled by IntelliSave."
  }
}
```

Codes:

```text
ROOM_NOT_FOUND
DEVICE_NOT_FOUND
PERSON_NOT_FOUND
INVALID_COMMAND
DEVICE_PROTECTED
DEVICE_NOT_CONTROLLABLE
MANUAL_OVERRIDE_ACTIVE
INVALID_POLICY
CALIBRATION_ALREADY_RUNNING
SIMULATION_PAUSED
INVALID_SCENARIO
```

Frontend shows human-readable feedback.

---

# 42. VALIDATION

Use Zod for:

- room creation,
- device creation,
- device policy,
- person creation,
- simulation commands,
- scenario requests,
- action commands,
- settings.

Always validate on the backend.

---

# 43. LOGGING

Backend logs should include:

```text
timestamp
level
module
requestId
roomId
deviceId
eventType
message
```

Do not log every simulation tick noisily under normal operation.

---

# 44. PERFORMANCE RULES

The prototype must remain smooth on a normal laptop.

Do not:

- refetch every query every second,
- execute dozens of redundant DB queries per room per tick,
- broadcast full building state to every client on every tick.

Prefer:

```text
one simulation tick
→ compute room values in memory
→ batch persistence
→ publish compact events
```

Minute-level telemetry is sufficient for v1.

---

# 45. SIMULATION ENGINE DESIGN

Use a central service:

```text
SimulationEngine
```

Responsibilities:

- simulation clock,
- room states,
- queued commands,
- domain loop,
- persistence,
- event publication.

Do not create one JavaScript interval per room.

Use one scheduler and adjust the interval according to simulation speed.

---

# 46. SIMULATION CLOCK

```ts
type SimulationClock = {
  currentTime: Date;
  speed: 1 | 5 | 10 | 30;
  status: "RUNNING" | "PAUSED" | "STOPPED";
};
```

Simulation time is independent of system wall clock.

Persist latest simulated timestamp periodically.

---

# 47. DEMO SEED DATA

First initialization creates:

```text
Building: IntelliSave Demo Building
Room: Room 101
Type: Classroom
Floor: 1
Capacity: 30
```

Required sensors:

- PIR,
- mmWave,
- temperature,
- humidity,
- CO₂,
- ambient light,
- virtual room energy meter.

Convenient demo devices:

```text
1 × AC
2 × LED
1 × Fan
1 × Freezer
1 × Laptop Charging Port
```

Room creation itself should install sensors automatically but not install electrical devices unless a device template is explicitly selected.

---

# 48. DEMO SCRIPT — 3 TO 5 MINUTES

The app should make this sequence easy.

## Scene 1 — Normal

Room 101:

```text
Occupancy: 30
Temperature: ~27°C
HVAC active
Lighting active
Fan active
```

## Scene 2 — Empty room

Click:

```text
Simulate Room Becomes Empty
```

Backend:

```text
occupancy → 0
LED → OFF
Fan → OFF
AC → vacancy pending
```

## Scene 3 — Vacancy timer

Set:

```text
30×
```

Advance.

At configured vacancy delay:

```text
AC → staged shutdown
AC → OFF
```

Timeline records the actions.

## Scene 4 — Savings

Show:

```text
Counterfactual energy
Actual energy
Energy saved
Cost saved
CO₂ avoided
```

## Scene 5 — Comfort protection

Trigger:

```text
Add people
High Temperature
High CO₂
```

Sensor/environment models respond. Automation must not aggressively reduce HVAC when the room is occupied and comfort/air quality is poor.

## Scene 6 — Unregistered load

Trigger:

```text
Simulate Unregistered Load
```

Meter shows actual > expected registered, and UI explains possible non-registered load/model deviation.

---

# 49. EXAMPLE NUMERICAL SCENARIO

Suppose:

```text
2 LEDs = 2 × 9 W = 18 W
Fan = 60 W
AC = 1500 W
```

For 2 hours:

```text
LED energy = 18 × 2 / 1000 = 0.036 kWh
Fan energy = 60 × 2 / 1000 = 0.120 kWh
AC energy  = 1500 × 2 / 1000 = 3.000 kWh
Expected total = 3.156 kWh
```

If room meter measures:

```text
3.54 kWh
```

Then:

```text
Unaccounted = 3.54 - 3.156 = 0.384 kWh
Residual ≈ 0.384 / 3.156 × 100 ≈ 12.17%
```

Display:

```text
Actual room consumption is 12.2% above expected registered consumption.
Possible causes: non-registered load or model deviation.
```

---

# 50. ILLUSTRATIVE SAVINGS SCENARIO

Assume:

```text
LED = 20 W
Fan = 60 W
AC = 1500 W
```

Room becomes empty.

LED and Fan shut down immediately. AC shuts down after 10 minutes.

The engine must calculate actual savings from tick-level counterfactual power. Do not hardcode the savings value into the UI.

---

# 51. API DATA SOURCE MAPPING SUMMARY

| Frontend Data | Backend Source |
|---|---|
| Current room power | Virtual room meter |
| Current occupancy | Room simulation state + occupancy fusion |
| Temperature | Temperature sensor model / SensorReading |
| Humidity | Humidity sensor model / SensorReading |
| CO₂ | CO₂ sensor model / SensorReading |
| Ambient light | Ambient-light sensor model / SensorReading |
| Device state | Device current state |
| Device actual power | Device operating model |
| Expected registered energy | Expected energy engine |
| Unaccounted energy | Meter actual − expected registered |
| Comfort | Comfort engine |
| Alerts | Waste/anomaly engine |
| Recommendations | Recommendation engine |
| Cost saved | Savings engine × tariff |
| CO₂ avoided | Savings engine × emission factor |
| Event timeline | EventLog / ActionEvent / DeviceStateEvent |
| Calibration | Calibration engine |
| What-if | Counterfactual / what-if engine |
| AI explanation | AI service using structured analytics facts |

---

# 52. SECURITY / TRUST REQUIREMENTS

Even for a local hackathon prototype:

- validate all API input,
- never trust frontend calculated values,
- never let frontend directly modify energy totals,
- protect DB credentials,
- never commit `.env`,
- sanitize AI inputs,
- never let LLM output execute commands,
- route commands through backend policy/protection checks.

---

# 53. AI CONTROL BOUNDARY

Correct:

```text
Sensor data
   ↓
Analytics
   ↓
Structured facts
   ↓
LLM explanation
   ↓
Human-readable text
```

Incorrect:

```text
Sensor data
   ↓
LLM
   ↓
Direct device control
```

Actual control:

```text
Sensor data
   ↓
Deterministic policy engine
   ↓
Protection checks
   ↓
Action engine
```

---

# 54. TESTING REQUIREMENTS

Implement unit + integration tests.

## Energy tests

Verify:

```text
5 kW × 2 h = 10 kWh
```

and:

```text
actual = 3.54
expected = 3.156
unaccounted = 0.384
```

## Occupancy tests

```text
person enters → VACANT/OCCUPANCY_PENDING to OCCUPIED
one of many leaves → remains OCCUPIED
last person leaves → VACANCY_PENDING
person returns during pending → OCCUPIED + timer cancelled
```

## Device automation tests

```text
LED: person enters → ON
LED: person leaves → OFF
Fan: person enters → ON
Fan: person leaves → OFF
AC: person leaves → vacancy timer
AC: timer expires → staged shutdown
Freezer: vacancy → remains cycling
Laptop port: vacancy → remains protected
```

## Manual override

```text
automation wants ON
user override OFF
result = OFF
```

Clear override and automation resumes.

## Comfort

Occupied + high CO₂:

```text
aggressive HVAC reduction blocked or softened
```

Empty room:

```text
comfort constraint does not block vacancy energy saving
```

## Savings

```text
counterfactual > actual → saved > 0
actual >= counterfactual → saved = 0
```

## Protected devices

Attempt:

```text
TURN_OFF Freezer
```

Expected:

```text
DEVICE_PROTECTED
no state change
```

---

# 55. ACCEPTANCE CRITERIA

## Application

- [ ] `/dashboard` loads.
- [ ] `/rooms` loads.
- [ ] `/rooms/:roomId/analytics` loads.
- [ ] `/rooms/:roomId/wall` loads.
- [ ] `/settings` loads.
- [ ] navigation works.
- [ ] deep links work.

## Room creation

- [ ] first room exists after seed.
- [ ] new room can be created.
- [ ] required sensors auto-create.
- [ ] virtual room meter auto-creates.
- [ ] room appears on dashboard.
- [ ] room appears on Rooms page.

## Devices

- [ ] AC can be added.
- [ ] Fan can be added.
- [ ] LED can be added.
- [ ] Freezer can be added.
- [ ] Laptop port can be added.
- [ ] custom voltage/power works.
- [ ] default state is OFF.
- [ ] device appears on wall.
- [ ] device affects room meter.
- [ ] protected device cannot be controlled.
- [ ] policy can be edited.

## People

- [ ] person can be added.
- [ ] occupancy increases.
- [ ] environmental values evolve.
- [ ] person can be removed.
- [ ] last-person exit triggers vacancy state.

## Simulation

- [ ] central backend simulation.
- [ ] one tick = one simulated minute.
- [ ] 1×/5×/10×/30× work.
- [ ] pause/resume works.
- [ ] +1 minute works.
- [ ] +10 minutes works.
- [ ] reset works.

## Automation

- [ ] LED responds to occupancy policy.
- [ ] Fan responds to occupancy policy.
- [ ] AC responds to occupancy policy.
- [ ] LED/Fan turn off immediately on vacancy if configured.
- [ ] AC follows vacancy timer.
- [ ] return cancels pending vacancy shutdown.
- [ ] manual override works.
- [ ] protected devices remain unaffected.

## Energy

- [ ] room meter updates.
- [ ] expected registered energy updates.
- [ ] unaccounted energy updates.
- [ ] tariff calculation works.
- [ ] CO₂ avoided works.

## Analytics

- [ ] baseline exists.
- [ ] anomaly detection works.
- [ ] duration thresholds work.
- [ ] alerts are generated.
- [ ] alert facts are structured.
- [ ] recommendations are generated.

## Savings

- [ ] session starts.
- [ ] counterfactual is calculated.
- [ ] actual energy is recorded.
- [ ] saved kWh is calculated.
- [ ] saved cost is calculated.
- [ ] avoided CO₂ is calculated.
- [ ] session closes.
- [ ] interrupted sessions count only real savings.

## Comfort

- [ ] temperature score works.
- [ ] humidity score works.
- [ ] CO₂ score works.
- [ ] weighted comfort score works.
- [ ] occupied comfort constraints influence actions.

## Calibration

- [ ] calibration starts.
- [ ] expected vs actual is measured.
- [ ] adjustment factor is calculated.
- [ ] confidence is recorded.
- [ ] baseline changes after calibration.

## Realtime

- [ ] dashboard updates without refresh.
- [ ] room telemetry updates live.
- [ ] device state updates live.
- [ ] automation events appear live.
- [ ] savings updates live.

---

# 56. UI POLISH DEFINITION OF DONE

The final prototype must look like one coherent product, not a collection of developer screens.

Required:

- consistent spacing,
- consistent cards,
- consistent iconography,
- responsive navigation,
- tooltips,
- loading skeletons,
- error states,
- empty states,
- toast feedback,
- restrained device animations,
- visible Simulation Mode,
- clear units,
- clear Simulated/Estimated labeling.

---

# 57. REQUIRED DOCUMENTATION GENERATED BY THE AGENT

## `README.md`

Include:

- IntelliSave overview,
- setup,
- database setup,
- seed,
- development commands,
- architecture,
- demo instructions.

## `docs/ARCHITECTURE.md`

Explain frontend → API → simulation → analytics → DB → WebSocket.

## `docs/SIMULATION_MODEL.md`

Explain room state, sensor models, environmental equations, device state machines and simulation clock.

## `docs/ENERGY_MATH.md`

Explain every energy equation.

## `docs/COMFORT_MODEL.md`

Explain assumptions and weights.

## `docs/AUTOMATION_RULES.md`

Explain every device/occupancy rule.

## `docs/SAVINGS_METHODOLOGY.md`

Explain counterfactual savings and limitations.

## `docs/ASSUMPTIONS.md`

List configurable prototype assumptions.

## `docs/DEMO_SCRIPT.md`

Give a 3–5 minute hackathon demo flow.

## `docs/FUTURE_IOT_INTEGRATION.md`

Explain how simulation providers are replaced by real IoT/BMS integrations.

---

# 58. FUTURE ML ARCHITECTURE

Do not make machine learning mandatory for v1.

Current prototype:

```text
Deterministic simulation
+
Statistical baseline
+
Rule-based anomaly detection
+
Rule-based automation
+
Optional LLM explanation
```

Future:

```text
Historical telemetry
      ↓
Feature engineering
      ↓
ML model
      ↓
Expected load prediction
      ↓
Anomaly score
      ↓
Recommendation ranking
```

Potential future models:

- regression for expected power,
- time-series forecasting,
- anomaly detection,
- occupancy forecasting.

Python can be added later as a separate service.

---

# 59. FUTURE IOT / BMS INTEGRATION

Keep provider interfaces abstract.

```ts
interface SensorDataProvider {
  getLatestRoomTelemetry(roomId: string): Promise<RoomTelemetry>;
}

interface DeviceControlProvider {
  executeCommand(
    deviceId: string,
    command: DeviceCommand
  ): Promise<DeviceCommandResult>;
}
```

Current implementation:

```text
SimulationSensorProvider
SimulationDeviceControlProvider
```

Future:

```text
IoTSensorProvider
BMSDeviceControlProvider
SmartMeterProvider
```

---

# 60. IMPORTANT TERMINOLOGY

Use these names consistently.

### Actual consumption

Measured room-meter consumption.

### Expected registered consumption

Modeled consumption from registered devices.

### Unaccounted consumption

Difference between measured room energy and expected registered energy.

### Energy saved

Counterfactual no-action energy minus actual energy.

### Potential avoidable energy

Estimated excess energy that could potentially be reduced by a safe action.

### Comfort score

Configurable prototype index based on environmental conditions and occupancy context.

### Automation/Savings session

A bounded interval in which IntelliSave actions are applied and their impact is measured.

### Calibration

A controlled observation used to learn a room-specific baseline adjustment.

---

# 61. WHAT THE FRONTEND MUST NEVER DO

Do not put these authoritative calculations in React:

```text
energy saved
cost saved
CO₂ avoided
baseline
anomaly score
vacancy timer
device physics
occupancy state transitions
meter readings
comfort score
```

Frontend may format values, e.g.:

```text
4.82 → "4.82 kW"
0.384 → "0.38 kWh"
```

but must not derive authoritative values.

---

# 62. WHAT THE BACKEND MUST NEVER DO

Do not:

- let LLM text directly command devices,
- overwrite historical events,
- delete savings history merely because a room is archived,
- falsely assign unaccounted energy to a specific device,
- override protected device rules,
- mutate user-visible state without an appropriate event,
- use uncontrolled random values as the primary sensor model.

---

# 63. FINAL END-TO-END DATA FLOW

```text
USER ACTION / SCENARIO
        ↓
REST API
        ↓
DOMAIN COMMAND
        ↓
ROOM STATE
        ↓
SIMULATION ENGINE
        ↓
ENVIRONMENT + PEOPLE
        ↓
SENSOR MODELS
        ↓
DEVICE STATE MODELS
        ↓
POWER CALCULATION
        ↓
VIRTUAL ROOM METER
        ↓
EXPECTED REGISTERED ENERGY
        ↓
UNACCOUNTED / DEVIATION
        ↓
COMFORT ENGINE
        ↓
ANOMALY / WASTE DETECTOR
        ↓
AUTOMATION POLICY ENGINE
        ↓
ACTION ENGINE
        ↓
SAVINGS SESSION / COUNTERFACTUAL
        ↓
EVENT LOG
        ↓
POSTGRESQL
        ↓
WEBSOCKET
        ↓
REACT DASHBOARD
```

---

# 64. THE CORE INTELLISAVE INTELLIGENCE LOOP

```text
DETECT
  ↓
Find unusual or unnecessary energy use.

EXPLAIN
  ↓
Explain context using structured facts.

OPTIMIZE
  ↓
Choose the least disruptive configured action.

ACT
  ↓
Apply the action in simulation mode.

MEASURE
  ↓
Compare counterfactual and actual energy.

SHOW SAVINGS
  ↓
Display kWh, ₹, CO₂ and comfort.

LEARN
  ↓
Store the result for future room-specific baselines.
```

---

# 65. FINAL AGENT EXECUTION INSTRUCTION

Build in this order:

```text
1. Initialize monorepo
2. Configure TypeScript/tooling
3. Configure PostgreSQL
4. Configure Prisma
5. Create schema and migrations
6. Create seed data
7. Implement simulation clock
8. Implement room state
9. Implement people/occupancy
10. Implement environment model
11. Implement device models
12. Implement virtual meter
13. Implement expected energy
14. Implement accounting
15. Implement comfort engine
16. Implement baseline
17. Implement anomaly/waste detection
18. Implement automation
19. Implement savings sessions
20. Implement calibration
21. Implement REST APIs
22. Implement WebSockets
23. Implement shared types
24. Build Dashboard
25. Build Rooms page
26. Build Room Analytics page
27. Build Device Wall
28. Build Device Settings
29. Build Settings
30. Build Scenario controls
31. Add AI explanation + deterministic fallback
32. Add unit/integration tests
33. Add demo seed/scenarios
34. Add documentation
35. Run full verification
```

After every major stage, run type-checking and tests.

Do not build the UI first and fake the backend later.

Do not leave placeholder buttons that do not perform backend behavior.

Every state-changing button must ultimately follow:

```text
UI command
→ API
→ backend domain logic
→ persistent/current state
→ event
→ WebSocket update
→ UI update
```

---

# 66. FINAL ACCEPTANCE DEMO

A judge should be able to perform this exact sequence without touching code:

```text
Open Dashboard
    ↓
Open Room 101
    ↓
See sensors and room analytics
    ↓
Open Device Wall
    ↓
See AC / LED / Fan / Freezer / Laptop Port
    ↓
Go back to Analytics
    ↓
Add Person
    ↓
Occupancy becomes 1
    ↓
LED/Fan/AC respond
    ↓
Sensor values evolve
    ↓
Remove Person
    ↓
LED/Fan turn OFF
    ↓
AC vacancy timer starts
    ↓
Set simulation to 30×
    ↓
AC shuts down after configured delay
    ↓
Savings session records counterfactual
    ↓
Dashboard updates saved kWh / ₹ / CO₂
    ↓
Trigger Unregistered Load
    ↓
Unaccounted consumption appears
    ↓
Run Calibration
    ↓
Baseline adjustment is stored
    ↓
Trigger High CO₂ / High Temperature with occupants
    ↓
Comfort constraint changes recommendation
    ↓
Open event timeline
    ↓
Every important action is visible with timestamp and reason
```

The software must feel like a functioning **virtual smart building**, not a collection of static dashboard screens.

---

# 67. FINAL PRODUCT POSITIONING

Preserve the following product idea throughout the implementation:

> **IntelliSave is not merely an energy monitoring dashboard. It is a decision and optimization layer that interprets room-level energy in context, explains why potential waste is occurring, chooses a safe action, measures the impact of that action and shows the resulting savings.**

**IntelliSave — Monitor • Understand • Optimize • Demonstrate**
