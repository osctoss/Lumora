# ⚡ Lumora — Autonomous Smart Building Energy & Comfort Optimization

> **Autonomous Energy Efficiency Engine, Physics-Grounded Digital Twin & Counterfactual Ledger**  
> Built for institutional buildings, university campuses, and commercial real estate to eliminate vacant power waste, protect occupant comfort, and mathematically prove energy savings.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.27-black.svg)](https://fastify.dev/)
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-indigo.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Acceptance Tests](https://img.shields.io/badge/Acceptance%20Tests-29%2F29%20Passing-emerald.svg)](apps/api/src/test/acceptance.spec.ts)

---

## 🌟 Overview & Problem Statement

Commercial and institutional facilities waste **20% to 35%** of active power through empty-room cooling, phantom lighting, and unmonitored equipment running overnight. Existing building management systems (BMS) suffer from three fatal flaws:
1. **Rule-brittle:** Blindly shut down power or require manual calendar schedules that fail when human routines shift.
2. **Comfort-blind:** Drastically throttle HVAC, causing productivity drops, drowsiness from high $\text{CO}_2$, and occupant complaints.
3. **Unverifiable:** Rely on arbitrary historical baselines that confuse seasonal weather shifts with actual operational savings.

**Lumora** solves this through **physics-grounded digital twins**, **closed-loop bidirectional policy automation**, and **counterfactual shadow-room savings verification**.

---

## 🏛️ System Architecture

Lumora uses a decoupled, reactive monorepo architecture separating the real-time simulation engine, high-performance API/WebSocket gateway, cloud-tier relational database, and responsive React frontend.

```mermaid
graph TB
    subgraph Client Tier ["Client Tier (Browser / React SPA)"]
        UI["Vite + React 18 SPA<br/>Tailwind CSS • Recharts • Lucide"]
        SocketClient["Socket.IO Client<br/>Realtime Stream Consumer"]
        ApiClient["REST Fetch Client<br/>Optimistic Mutations"]
    end

    subgraph Edge ["API Gateway & Realtime Service (Render / Node.js)"]
        Fastify["Fastify 4.x HTTP Engine<br/>REST Endpoints • JSON Schema"]
        SocketServer["Socket.IO Gateway<br/>1Hz State Delta Broadcast"]
        EventBus["Internal Async Event Bus<br/>Decoupled Domain Telemetry"]
    end

    subgraph Engine ["Simulation & Digital Twin Core (In-Memory)"]
        SimEngine["1Hz Physical Clock & Tick Loop<br/>Thermal Dynamics • CO₂ Model"]
        PolicyEngine["Policy Automation Engine<br/>Multi-Stage Vacancy • Welcome Matrix"]
        ComfortEngine["ASHRAE-55 Comfort Evaluator<br/>Continuous 0-100 Score"]
        SavingsEngine["Counterfactual Shadow Twin<br/>Live Numerical Energy Integration"]
        WasteDetector["Anomaly & Waste Detector<br/>Unregistered Load & Baseline Drift"]
    end

    subgraph Data Tier ["Persistence Tier (Neon Cloud / PostgreSQL)"]
        Prisma["Prisma ORM Client<br/>Schema Push • Migrations • Seeding"]
        Postgres[("Neon PostgreSQL<br/>Rooms • Devices • Telemetry • Policies")]
    end

    %% Client Interactions
    UI --> ApiClient
    UI --> SocketClient
    ApiClient -->|"HTTP REST (GET/POST/PATCH)"| Fastify
    SocketServer -->|"WebSocket (1Hz Stream)"| SocketClient

    %% Gateway to Engines
    Fastify --> EventBus
    EventBus --> PolicyEngine
    EventBus --> SavingsEngine
    EventBus --> WasteDetector

    %% Engine Loop
    SimEngine -->|"Physical State Ticks"| EventBus
    PolicyEngine -->|"Actuation Commands"| SimEngine
    SimEngine --> ComfortEngine
    ComfortEngine -->|"Comfort Scores"| PolicyEngine
    SavingsEngine -->|"Validated kWh Saved"| EventBus
    EventBus --> SocketServer

    %% Persistence
    SimEngine -.->|"Periodic State Snapshots"| Prisma
    EventBus -.->|"Logged Events & Telemetry"| Prisma
    Prisma --> Postgres
```

---

## 🔄 Closed-Loop Automation & Savings Workflow

Every second, Lumora runs a continuous feedback loop: sensing environmental physics, enforcing occupancy policies, protecting critical equipment, computing counterfactual baselines, and streaming updates to the dashboard.

```mermaid
sequenceDiagram
    autonumber
    participant Sensors as Virtual/Physical Sensors
    participant Sim as Simulation Engine (1Hz)
    participant Comfort as ASHRAE-55 Evaluator
    participant Policy as Policy Engine
    participant Shadow as Counterfactual Twin
    participant DB as Neon PostgreSQL
    participant UI as React UI (Dashboard)

    loop Every 1 Second (Tick Cycle)
        Sensors->>Sim: Temperature, Occupancy, CO₂, Lux, Active Power
        Sim->>Comfort: Compute operative temp & CO₂ index
        Comfort-->>Policy: Thermal (0-100) & IAQ Comfort Score

        alt Room Transitions to VACANT
            Policy->>Policy: Start Multi-Stage Vacancy Countdown
            Note over Policy: 0m: Cut non-essential lights/fans<br/>5m: Throttle AC compressor<br/>10m: Cut primary HVAC
            Policy->>Sim: Dispatch Actuation (State Changes)
        else Room Transitions to OCCUPIED
            Policy->>Sim: Dispatch Welcome Matrix (Restore Light/HVAC)
        end

        Sim->>Shadow: Calculate Counterfactual Unoptimized Baseline
        Note over Shadow: Shadow room stays running at setpoint<br/>Savings = Counterfactual - Actual Power
        Shadow->>DB: Record Verified kWh & INR Savings Session

        Sim->>UI: Broadcast WebSocket Tick (Active kW, Comfort %, Saved kWh)
    end
```

---

## 🚀 Key Innovations & Engineering Highlights

- **🔬 1Hz Differential Equation Simulation Engine:** Simulates real thermal capacitance ($0.5^\circ\text{C}/\text{min}$ cooling/warming), dual-rating compressor transitions, outdoor equilibrium caps ($T_{\text{outdoor}} - 5^\circ\text{C}$), metabolic $\text{CO}_2$ respiration/decay, and diurnal daylight curves. Supports $1\times$ to $60\times$ acceleration.
- **🛡️ ASHRAE-55 Composite Comfort Protection:** Integrates operative dry-bulb temperature, relative humidity, and air quality ($\text{CO}_2$) into a continuous comfort score ($0\text{–}100$). Prevents over-aggressive energy shedding when occupants are present.
- **📊 Mathematically Proven Counterfactual Ledger:** Replaces naive historical baselines with a live in-memory shadow twin:
  $$\text{Energy Saved (kWh)} = \int_{t_{\text{start}}}^{t_{\text{end}}} \max\left(0, \, P_{\text{counterfactual}}(t) - P_{\text{actual}}(t)\right) \, dt$$
- **⚡ Bidirectional Autonomous Automation:**
  - **Occupancy Welcome:** Instant activation of lighting and fans, plus climate pre-cooling upon entity entrance.
  - **Multi-Stage Vacancy Shutdown:** Instant lighting/fan cutoff at $0\text{m}$, AC compressor cutoff at $5\text{m}$ (slashing power by 95%), and full HVAC cutoff at $10\text{m}$.
- **🔒 Protected Equipment Safety Chain:** Critical appliances (e.g., biological research freezers, emergency lighting, high-priority workstations) are protected at both API and automation levels with hardware-grade lockout checks.
- **📦 In-Memory Fallback:** The backend hosts an active in-memory digital twin capable of operating with zero latency even when the external database is momentarily offline.

---

## 🏗️ Repository Structure

```
Lumora/
├── apps/
│   ├── api/                 # Fastify + Socket.IO + In-Memory Digital Twin + Prisma
│   │   ├── src/
│   │   │   ├── modules/     # Simulation, Comfort, Policy, Savings, Analytics, Energy
│   │   │   ├── routes/      # REST Endpoints (Rooms, Devices, Simulation, Building)
│   │   │   ├── websocket/   # Socket.IO Realtime Gateway
│   │   │   ├── config/      # Dynamic PORT and environment parsing
│   │   │   └── test/        # Automated Acceptance Test Suite (§75–§80)
│   │   ├── prisma/          # Schema, migrations, and demo seeds
│   │   └── Dockerfile       # Standalone API container
│   └── web/                 # React 18 + Vite + Tailwind CSS + Recharts + React Router
│       ├── public/          # Favicon assets, PWA manifest, and 512×512 Lumora logo
│       ├── src/
│       │   ├── pages/       # DashboardPage, RoomsPage, RoomAnalyticsPage, RoomDeviceWallPage
│       │   ├── components/  # Layout (with 512×512 logo), Modals, Gauges, Device Controls
│       │   └── lib/         # REST client and Socket.IO connection manager
│       ├── vercel.json      # Standalone Vercel SPA routing
│       └── Dockerfile       # Standalone Web container
├── packages/
│   └── shared/              # Shared TypeScript contracts, schemas, and compiled dist/
├── docs/                    # In-depth architectural, mathematical, and integration guides
├── docker-compose.prod.yml  # Multi-container production deployment
└── package.json             # Root workspace orchestration with build shortcuts
```

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** v20+
- **pnpm** v9+ (`npm install -g pnpm`)
- **PostgreSQL** v14+ (Local or cloud; runs in high-performance in-memory mode if DB is offline)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/osctoss/Lumora.git
cd Lumora

# Install dependencies across all workspaces
pnpm install
```

### 3. Database Setup (Neon Cloud or Local PostgreSQL)
Configure your `DATABASE_URL` in `.env`:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/lumora?schema=public"
```

Push schema and seed initial building/device catalog:
```powershell
pnpm db:push
pnpm db:seed
```

### 4. Running the Development Server
```bash
# Starts both Backend API (port 3001) and Web UI (port 5173) concurrently
pnpm dev
```

- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **API Health Check:** [http://localhost:3001/api/health](http://localhost:3001/api/health)
- **Prisma Studio:** `pnpm db:studio` → [http://localhost:5555](http://localhost:5555)

---

## ☁️ Cloud PaaS Production Deployment

Lumora is pre-configured for a zero-maintenance cloud architecture across **Neon**, **Render**, and **Vercel**:

### 1. Database (Neon.tech)
1. Create a free serverless PostgreSQL database on [neon.tech](https://neon.tech).
2. Copy your connection string (`DATABASE_URL`).
3. From your local terminal, push the schema and seed the database:
   ```powershell
   $env:DATABASE_URL="postgresql://<user>:<password>@<endpoint>.neon.tech/lumora-db?sslmode=require"
   pnpm db:push
   pnpm db:seed
   ```

### 2. Backend API & WebSockets (Render)
1. Connect your repository to [Render](https://render.com) as a **Web Service**.
2. Configure settings:
   - **Root Directory**: `.`
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm build:api`
   - **Start Command**: `node apps/api/dist/server.js`
3. Add Environment Variables:
   - `DATABASE_URL`: *(Your Neon connection string from Step 1)*
   - `NODE_ENV`: `production`
   - `API_HOST`: `0.0.0.0`
4. Copy your live API URL (e.g., `https://lumora-api.onrender.com`).

### 3. Frontend UI (Vercel)
1. Connect the repository to [Vercel](https://vercel.com).
2. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`
3. Add Environment Variables:
   - `VITE_API_URL`: `https://lumora-api.onrender.com`
   - `VITE_WS_URL`: `https://lumora-api.onrender.com`
4. Deploy!

---

## 🧪 Acceptance Testing (§75–§80)

To execute the automated domain verification suite covering thermal dynamics, meter aggregation, occupancy mass balance, and vacancy counterfactuals:

```bash
cd apps/api
npx tsx src/test/acceptance.spec.ts
```

```
================================
Results: 29 PASSED, 0 FAILED
================================
```

---

## 📚 Complete Documentation Index

| Documentation File | Contents |
| :--- | :--- |
| [docs/SIMULATION_MODEL.md](docs/SIMULATION_MODEL.md) | 1Hz physical differential equations, thermal rates ($0.5^\circ\text{C}/\text{min}$), equilibrium caps, and $\text{CO}_2$ mass balances. |
| [docs/SAVINGS_METHODOLOGY.md](docs/SAVINGS_METHODOLOGY.md) | Counterfactual copy-room twin, numerical energy integration, and financial/carbon formulas. |
| [docs/AUTOMATION_RULES.md](docs/AUTOMATION_RULES.md) | Bidirectional occupancy welcome policy, multi-stage vacancy shutdown, and protected equipment locks. |
| [docs/COMFORT_MODEL.md](docs/COMFORT_MODEL.md) | ASHRAE-55 composite comfort index ($0\text{–}100$), sub-score formulas, and comfort protection overrides. |
| [docs/DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md) | Entity relationships, room microclimates, person models, appliance state machines, and submetering. |
| [docs/API.md](docs/API.md) | Complete REST API endpoint reference and Socket.IO real-time event catalog. |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production Docker, Vercel/Render PaaS, and VPS/Nginx deployment walkthroughs. |
| [docs/FUTURE_IOT_INTEGRATION.md](docs/FUTURE_IOT_INTEGRATION.md) | BACnet/IP, Modbus TCP, MQTT protocols, and IPMVP Option C measurement roadmap. |
| [docs/ENERGY_MATH.md](docs/ENERGY_MATH.md) | Deterministic 5-minute interval submetering mathematics and aggregation proofs. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | High-level system architecture, data flow pipelines, and component boundaries. |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | Step-by-step hackathon and stakeholder presentation script. |
| [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) | Prototype defaults, electrical parameters, and environmental baselines. |

---

## 📄 License
Distributed under the **MIT License** © 2026 Lumora Systems.
