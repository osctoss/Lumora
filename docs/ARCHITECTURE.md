# IntelliSave Architecture Specification

## 1. System Topology

```
+-------------------------------------------------------------------------+
|                              Web Frontend                               |
|                  React 18 + Vite + Tailwind CSS + Lucide                |
|           (Live Sparklines, Device Wall, What-If, AI Diagnostics)       |
+------------------------------------+------------------------------------+
                                     |  HTTP REST & WebSocket (Socket.IO)
                                     v
+-------------------------------------------------------------------------+
|                             API Gateway                                 |
|                       Fastify 4.x + TypeScript                          |
|             CORS, JSON Schema Validation, Modular Route Handlers         |
+------------------------------------+------------------------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
+-----------------------------+             +-----------------------------+
|    Simulation Engine 1Hz    |             |    Analytics & Automation   |
| - Physics Differential Eqs  |             | - Policy Evaluation Engine  |
| - Thermal Capacitance Model |             | - Counterfactual Savings    |
| - CO2 Respiration Curves    |             | - ASHRAE-55 Comfort Score   |
| - 7 Virtual Sensor Models   |             | - Anomaly & Waste Detector  |
| - 7 Dynamic Device Models   |             | - Protected Device Enforcer |
+--------------+--------------+             +--------------+--------------+
               |                                           |
               +---------------------+---------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                          Data & Persistence                             |
|         In-Memory Real-Time Digital Twin (Zero-Latency Fallback)        |
|             Prisma ORM Client -> PostgreSQL Database Service            |
+-------------------------------------------------------------------------+
```

## 2. In-Memory Digital Twin Pattern
Because real-time building control requires sub-second decision making, the backend hosts an active in-memory digital twin of all physical parameters (`temperature`, `co2`, `humidity`, `lux`, `device states`, `occupancy state`, and `active savings sessions`).

- When PostgreSQL is available, state snapshots and events are persisted to relational tables (`RoomTelemetry`, `SensorReading`, `DeviceStateEvent`, `EventLog`, `SavingsSession`).
- When offline or during rapid development, the in-memory engine provides zero-latency continuity without breaking client functionality.

## 3. WebSocket Event Distribution Model
The Socket.IO gateway uses room-scoped channels:
- `SIMULATION_TICK`: Broadcasts compact metric deltas (active power, expected power, unaccounted power, comfort score, environmental readings).
- `DEVICE_STATE_CHANGED`: Broadcasts actuation changes triggered by policy or user override.
- `SCENARIO_TRIGGERED`: Broadcasts edge-case scenario events for UI reaction.
