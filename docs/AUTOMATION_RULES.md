# Lumora — Autonomous Energy & Comfort Policy Engine

Lumora implements a **closed-loop bidirectional policy engine** that balances rapid energy conservation with human comfort and equipment safety.

---

## 1. Decision Hierarchy

Automation actions adhere to a strict safety-first priority chain:

$$\text{Safety \& Protected Loads} \;\longrightarrow\; \text{Manual Overrides} \;\longrightarrow\; \text{Occupancy State} \;\longrightarrow\; \text{Comfort Constraints} \;\longrightarrow\; \text{Energy Optimization}$$

1. **Protected Loads**: Biological research freezers, emergency infrastructure, and medical equipment are locked and cannot be turned off by automation.
2. **Manual User Overrides**: If an occupant intentionally adjusts a device while present, automation will not undo their action until the room becomes vacant or the override is cleared.
3. **Occupancy State**: Presence dictates primary operational modes.

---

## 2. Occupancy Welcome Automation (§17.4)

When a human entity enters a vacant room (`occupancyCount` transitions from $0 \to \ge 1$):

| Device Type | Automated Action | Target Operating State | Electrical Impact |
| :--- | :--- | :--- | :--- |
| **LED / Tube Light** | Immediate Turn ON | `ON` | Draws $100\%$ rated power |
| **Ceiling Fan** | Immediate Turn ON | `ON` (Medium Speed) | Draws $75\%$ rated power |
| **Air Conditioner** | Climate Pre-Cooling | `COMPRESSOR_ON` | If $T_{\text{room}} > T_{\text{setpoint}}$, engages cooling |
| **Freezer** | Continuous Operation | `COMPRESSOR_ON` / Cycling | Unchanged (Protected) |
| **Laptop Ports** | Power Available | Active / Trickle | Unchanged (Protected) |

- **Session Reset**: Any active counterfactual savings session is immediately closed.
- **Override Awakening**: Overrides from prior sessions are reset so the room enters a fresh autonomous lifecycle.

---

## 3. Multi-Stage Vacancy Shutdown (§42)

When the last person leaves a room (`occupancyCount = 0`):

```
Time = 0m (Immediate)
├── LED / Lighting → Forced OFF (0 W)
└── Fans → Forced OFF (0 W)

Time = 5m (Stage 1 HVAC)
└── AC Compressor → Cut OFF (Switches to COMPRESSOR_OFF, ~45 W standby)

Time = 10m (Stage 2 HVAC)
└── AC Unit → Fully Powered OFF (0 W)

Continuous (Protected)
└── Deep Freezers → REMAINS ON (Continuous 250W–350W operational cycling)
```

### Stage Breakdown

1. **Stage 0 — Immediate Shedding ($t = 0\text{s}$)**:
   - Non-critical loads with zero thermal inertia (lights and fans) are cut instantly to prevent wasted kilowatt-hours.
2. **Stage 1 — Compressor Cutoff ($t \ge 5\text{ min}$)**:
   - AC compressor is shut off while keeping internal blower fans in standby. This immediately reduces power draw by **95%** (from 1800W down to 45W) while allowing cold air remaining in ducting to circulate.
3. **Stage 2 — Full HVAC Shutdown ($t \ge 10\text{ min}$)**:
   - Complete power cut to the AC unit ($0\text{ W}$).

---

## 4. Protected Equipment Rules

Appliances designated with `isProtected: true` or `type: 'FREEZER'`:
- Cannot be switched OFF via the `/api/devices/:id/off` REST endpoint (returns HTTP 403 Forbidden).
- Are bypassed by all vacancy automation loops.
- Automatically restore operational state upon master room power reconnection.

---

## 5. Event Audit Logging

Every automated action produces a verifiable, immutable event on the internal event bus and database:
- `AUTOMATION_ACTION`: Records `deviceId`, `action` (`TURN_ON` / `TURN_OFF` / `COMPRESSOR_OFF`), `reason`, and `powerSavedW`.
- `DEVICE_STATE_CHANGED`: Broadcast to all connected WebSockets in real time.
