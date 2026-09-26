# Lumora — REST API & WebSocket Realtime Gateway Reference

Lumora exposes a Fastify HTTP REST API alongside a real-time Socket.IO gateway.

---

## 1. Simulation Clock Control

| Method | Endpoint | Description | Payload Example |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/simulation/state` | Returns the current simulation status, speed, and time. | — |
| `GET` | `/api/simulation/clock` | Alias to `/api/simulation/state`. | — |
| `POST` | `/api/simulation/speed` | Sets clock multiplier (`1`, `2`, `5`, `10`, `30`, `60`). | `{"speed": 10}` or `{"speedMultiplier": 10}` |
| `POST` | `/api/simulation/pause` | Pauses simulation clock tick progression. | `{}` |
| `POST` | `/api/simulation/resume` | Resumes simulation clock progression. | `{}` |
| `POST` | `/api/simulation/reset` | Resets simulated time back to `09:00:00 AM`. | `{}` |

---

## 2. Building & Global Analytics

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/building/energy` | Returns total active power, energy today, total saved, and costs across all rooms. |
| `GET` | `/api/building/events` | Returns recent system events and automation logs (`?limit=50`). |
| `GET` | `/api/building/alerts` | Returns active alerts (`UNACCOUNTED_CONSUMPTION`, `VACANCY_ENERGY_WASTE`, `CO2_HIGH`). |
| `GET` | `/api/dashboard/overview` | Aggregated dashboard KPIs, room cards, and active alerts summary. |
| `GET` | `/api/dashboard/trends` | Time-series hourly consumption, counterfactual baselines, and savings. |

---

## 3. Rooms & Virtual Twin

| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/rooms` | Lists all rooms with capacity, power, and occupancy count. | — |
| `POST` | `/api/rooms` | Dynamically creates a new room with **0 devices**. | `{"name": "Lab 204", "floor": 2, "capacity": 15, "areaSqMeters": 45}` |
| `GET` | `/api/rooms/:id/virtual` | Complete virtual twin payload (sensor strip, devices, people). | — |
| `GET` | `/api/rooms/:id/energy` | Room 5-minute interval energy meter readings. | — |
| `POST` | `/api/rooms/:id/power/on` | Turns master room electrical power ON. | `{}` |
| `POST` | `/api/rooms/:id/power/off` | Cuts master room electrical power OFF (0 W across all loads). | `{}` |
| `POST` | `/api/rooms/:id/temperature`| Sets manual room temperature slider ($0^\circ\text{C}$ to $50^\circ\text{C}$). | `{"temperatureC": 26.5}` |
| `POST` | `/api/rooms/:id/people` | Adds a simulated person entity (triggers welcome automation). | `{"displayName": "Alice"}` |
| `DELETE`| `/api/rooms/:id/people/:personId` | Removes an occupant (triggers vacancy automation on last exit). | — |
| `POST` | `/api/rooms/:id/devices` | Adds an electrical appliance to the room's virtual wall. | `{"name": "AC Unit", "type": "AC", "ratedPowerW": 1800}` |

---

## 4. Device Controls

| Method | Endpoint | Description | Response / Behavior |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/devices/:id/on` | Turns an appliance ON (sets `manualOverride: true`). | Returns updated device state. |
| `POST` | `/api/devices/:id/off`| Turns an appliance OFF (sets `manualOverride: true`). | Returns HTTP 403 if device is **Protected**. |
| `PATCH`| `/api/devices/:id` | Updates device name, rated wattage, or AC setpoint ($18\text{–}28^\circ\text{C}$). | `{"ratedPowerW": 2000, "setpointC": 23}` |

---

## 5. WebSocket Real-Time Event Catalog

Clients connect to the root Socket.IO gateway (`/socket.io`). All events follow the standard envelope:

```typescript
interface IntelliSaveEvent<T> {
  eventId: string;
  timestamp: string;
  buildingId: string;
  roomId?: string;
  eventType: string;
  source: 'SIMULATION' | 'AUTOMATION' | 'USER' | 'METER';
  payload: T;
}
```

### Key Event Types

| Event Name | Description |
| :--- | :--- |
| `SIMULATION_TICK` | Emitted every 1 second per room with physical sensors, power, and clock state. |
| `SIMULATION_PAUSED` | Broadcast when the simulation clock is paused. |
| `SIMULATION_RESUMED` | Broadcast when the simulation clock resumes ticking. |
| `ROOM_POWER_ON` / `ROOM_POWER_OFF` | Emitted on master power supply circuit toggle. |
| `PERSON_ADDED` / `PERSON_REMOVED` | Emitted on occupant arrival or departure. |
| `OCCUPANCY_CHANGED` | Tracks count transitions and trigger reasons. |
| `DEVICE_STATE_CHANGED` | Broadcast on device on/off, mode changes, or speed adjustments. |
| `AUTOMATION_ACTION` | Records automated welcome or vacancy shutoff actions with power saved. |
| `SAVINGS_SESSION_STARTED` | Emitted when a counterfactual copy room session opens upon vacancy. |
| `SAVINGS_SESSION_CLOSED` | Emitted when an occupant returns and the savings session finalizes. |
| `METER_READING` | Emitted every 5 minutes when an electrical interval commits. |
