# ⚡ IntelliSave — Autonomous Energy & Comfort Optimization Platform

> **Smart Building Energy Efficiency Engine & Real-Time Digital Twin**  
> Built for institutional buildings, campuses, and commercial real estate to eliminate vacant power waste, protect occupant comfort, and mathematically prove energy savings.

---

## 🌟 Overview & Problem Statement

Commercial and institutional facilities waste **20% to 35%** of active energy through empty-room cooling, phantom lighting, and unmonitored equipment running overnight. Existing building management systems (BMS) are:
1. **Rule-brittle:** Blindly shut down power or require manual schedules.
2. **Comfort-blind:** Drastically throttle HVAC, causing productivity drops and occupant complaints.
3. **Unverifiable:** Rely on vague baselines that can't differentiate seasonal weather shifts from real savings.

**IntelliSave** solves this through **physics-grounded digital twins**, **counterfactual savings verification**, and **autonomous multi-tier automation policies**.

---

## 🚀 Key Innovations & Architecture

- **🔬 1Hz Differential Equation Simulation Engine:** Simulates real thermal capacitance, metabolic CO₂ generation, humidity curves, and daylight attenuation in real time (supporting 1x to 30x time acceleration).
- **🛡️ ASHRAE-55 Comfort Protection Engine:** Integrates operative temperature, relative humidity, and air quality into a composite comfort index (0–100). Prevents over-aggressive energy shedding when occupants are present.
- **📊 Mathematically Proven Counterfactual Ledger:** Replaces naive historical baselines with a live shadow-load model:
  $$\text{Energy Saved (kWh)} = \int \max(0, P_{\text{counterfactual}}(t) - P_{\text{actual}}(t)) \, dt$$
- **🔒 Protected Equipment Safety Chain:** Critical appliances (e.g., biological research freezers, emergency lighting, high-priority workstations) are protected at both API and automation levels with hardware-grade lockout checks.
- **🤖 Zero-Cost AI Diagnostics:** Built-in deterministic root-cause reasoning layer that diagnoses ghost loads and model deviations instantly without external API latency or cost.

---

## 🏗️ Monorepo Structure

```
intellisave/
├── apps/
│   ├── api/             # Fastify + TypeScript + Socket.IO + In-Memory Digital Twin
│   │   ├── src/
│   │   │   ├── modules/ # Simulation, Comfort, Automation, Savings, AI
│   │   │   ├── routes/  # REST APIs (Rooms, Devices, Simulation, Savings, AI)
│   │   │   └── websocket/# Real-time Socket.IO event publisher
│   └── web/             # React 18 + Vite + Tailwind CSS + High-Fidelity UI
│       └── src/         # SVG sparklines, Device Wall, What-If Calculator, Scenario injector
├── packages/
│   └── shared/          # Shared domain models, DTOs, Enums, and WebSocket schemas
├── prisma/              # 24 Models & 11 Enums for PostgreSQL persistence
├── docs/                # Architecture, energy equations, and demo documentation
└── scripts/             # Verification and demo utilities
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** v18+ or v20+
- **pnpm** v9+ (`npm install -g pnpm`)

*(Note: PostgreSQL/Docker is completely optional. The engine runs out of the box with an in-memory high-performance digital twin).*

### 2. Install & Start
```bash
# Clone the repository
cd intellisave

# Install all workspace dependencies
pnpm install

# Start both API (port 3001) and Web UI (port 5173) simultaneously
pnpm dev
```

- **Web Dashboard:** [http://localhost:5173](http://localhost:5173)
- **API Health Check:** [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 🎯 3-Minute Hackathon Demo Script

1. **Dashboard Overview:** Open `http://localhost:5173`. Point out real-time active power draw, expected load, and the 1Hz telemetry sparkline.
2. **Add Occupants:** Use the `+` button in the Occupancy card to add 15 people. Observe:
   - PIR and mmWave presence sensors trigger.
   - AC transitions into Cooling mode; lights illuminate.
   - CO₂ levels rise organically based on human respiration equations.
3. **Empty Room Waste & Autonomous Shutoff:**
   - Click **"Room Empties"** scenario or set people to 0.
   - The state transitions to `VACANCY_PENDING`.
   - Set speed to **30x** simulation acceleration.
   - Once the vacancy timer elapses, non-critical lighting and HVAC automatically switch OFF.
   - The **Verified Savings Ledger** immediately starts accumulating avoided kWh, ₹ financial savings, and avoided CO₂.
4. **Protected Equipment Lockout:** Switch to the **Device Wall** tab. Attempt to power down the "Biological Deep Freezer" or "Workstation PD". The system rejects the shutdown with a protected device alert.
5. **Ghost Load Detection & AI Root Cause:**
   - Click the **"Ghost Load (+350W)"** scenario button.
   - Notice the unaccounted power spike on the telemetry sparkline.
   - Click **"AI Diagnostics"** to inspect the root-cause diagnosis.
6. **What-If ROI Calculator:** Switch to the **Savings Ledger** tab. Adjust the target cooling setpoint and vacancy delay sliders to project institutional annual savings.

---

## 📄 License
MIT © 2026 IntelliSave Systems
