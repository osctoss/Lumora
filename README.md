# ⚡ Lumora — Autonomous Energy & Comfort Optimization Platform

> **Smart Building Energy Efficiency Engine & Real-Time Digital Twin**  
> Built for institutional buildings, campuses, and commercial real estate to eliminate vacant power waste, protect occupant comfort, and mathematically prove energy savings.

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

Commercial and institutional facilities waste **20% to 35%** of active energy through empty-room cooling, phantom lighting, and unmonitored equipment running overnight. Existing building management systems (BMS) are:
1. **Rule-brittle:** Blindly shut down power or require manual schedules that fail when human routines shift.
2. **Comfort-blind:** Drastically throttle HVAC, causing productivity drops, drowsiness from high $\text{CO}_2$, and occupant complaints.
3. **Unverifiable:** Rely on arbitrary historical baselines that confuse seasonal weather shifts with actual operational savings.

**Lumora** solves this through **physics-grounded digital twins**, **counterfactual shadow-room savings verification**, and **closed-loop bidirectional policy automation**.

---

## 🚀 Key Innovations & Core Architecture

- **🔬 1Hz Differential Equation Simulation Engine:** Simulates real thermal capacitance ($0.5^\circ\text{C}/\text{min}$ cooling/warming), dual-rating compressor transitions, outdoor equilibrium caps ($T_{\text{outdoor}} - 5^\circ\text{C}$), metabolic $\text{CO}_2$ respiration/decay, and diurnal daylight curves. Supports $1\times$ to $60\times$ acceleration.
- **🛡️ ASHRAE-55 Composite Comfort Protection:** Integrates operative dry-bulb temperature, relative humidity, and air quality ($\text{CO}_2$) into a continuous comfort score ($0\text{–}100$). Prevents over-aggressive energy shedding when occupants are present.
- **📊 Mathematically Proven Counterfactual Ledger:** Replaces naive historical baselines with a live in-memory shadow twin:
  $$\text{Energy Saved (kWh)} = \int_{t_{\text{start}}}^{t_{\text{end}}} \max\left(0, \, P_{\text{counterfactual}}(t) - P_{\text{actual}}(t)\right) \, dt$$
- **⚡ Bidirectional Autonomous Automation:**
  - **Occupancy Welcome:** Instant activation of lighting and fans, plus climate pre-cooling upon entity entrance.
  - **Multi-Stage Vacancy Shutdown:** Instant lighting/fan cutoff at $0\text{m}$, AC compressor cutoff at $5\text{m}$ (slashing power by 95%), and full HVAC cutoff at $10\text{m}$.
- **🔒 Protected Equipment Safety Chain:** Critical appliances (e.g., biological research freezers, emergency lighting, high-priority workstations) are protected at both API and automation levels with hardware-grade lockout checks.
- **📦 Fully Decoupled Frontend & Backend:** The React SPA (`apps/web`) and Fastify API (`apps/api`) can be built, run, and deployed independently to Vercel and Render/Railway without monorepo build coupling.

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
│   │   │   └── test/        # Automated Acceptance Test Suite (§75–§80)
│   │   ├── prisma/          # Schema, migrations, and demo seeds
│   │   └── Dockerfile       # Standalone API container
│   └── web/                 # React 18 + Vite + Tailwind CSS + Recharts + React Router
│       ├── src/
│       │   ├── pages/       # DashboardPage, RoomsPage, RoomAnalyticsPage, RoomDeviceWallPage
│       │   ├── components/  # Layout, Device Config Modals, Add Person/Device Modals
│       │   └── lib/         # REST client and Socket.IO connection manager
│       ├── vercel.json      # Standalone Vercel SPA routing
│       ├── nginx.conf       # Standalone Nginx reverse proxy
│       └── Dockerfile       # Standalone Web container
├── packages/
│   └── shared/              # Shared TypeScript contracts and schemas
├── docs/                    # In-depth architectural, mathematical, and integration guides
├── docker-compose.prod.yml  # Multi-container production deployment
└── package.json             # Root workspace orchestration
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** v20+
- **pnpm** v9+ (`npm install -g pnpm`)
- **PostgreSQL** v14+ (Local or managed cloud; runs in high-performance in-memory mode if DB is offline)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/osctoss/Lumora.git
cd Lumora

# Install dependencies across all workspaces
pnpm install
```

### 3. Database Setup (Optional if using PostgreSQL)
Configure your `DATABASE_URL` in `.env`:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/lumora?schema=public"

# Synchronize database schema & populate initial demo room/devices
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

## 🚀 Deployment Options

Lumora supports multiple production deployment strategies:

1. **One-Click Docker Compose**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
2. **Cloud PaaS (Decoupled)**:
   - **Frontend**: Deploy `apps/web` directly to **Vercel** or **Netlify**.
   - **Backend**: Deploy `apps/api` directly to **Render**, **Railway**, or **Fly.io**.
   - **Database**: Managed PostgreSQL on **Neon** or **Supabase**.
3. **Linux VPS with PM2 & Nginx**:
   Detailed Nginx reverse proxy configuration and PM2 systemd daemon guides are provided in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

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
