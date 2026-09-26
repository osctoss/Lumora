# Lumora — Counterfactual Savings Verification Methodology

Traditional building energy accounting relies on **historical baselines** (comparing today's consumption against last week's or last year's). In modern facility operations, historical baselines are fundamentally flawed: they cannot distinguish between energy saved through autonomous intelligence versus energy differences caused by seasonal weather shifts, shifting occupant schedules, or grid outages.

**Lumora** replaces static estimations with a **live in-memory counterfactual twin engine**.

---

## 1. The Counterfactual "Shadow Room" Model

When a room becomes vacant, Lumora clones the exact operational state of the room into an isolated, in-memory **Shadow Copy Room**:

```
Real Room (Autonomous Actions Applied):
Occupancy: 0 → LED OFF (0W) → Fan OFF (0W) → AC Compressor OFF at 5m (45W) → AC Full OFF at 10m (0W)

Shadow Copy Room (What WOULD Have Happened Without Automation):
Occupancy: 0 → LED remains ON (36W) → Fan remains ON (75W) → AC Compressor continues cycling (1800W / 45W)
```

The difference between what the room **actually draws** and what the **copy room would have drawn** represents the **true, mathematically verifiable energy savings**.

---

## 2. Mathematical Formulation

### 2.1 Instantaneous Power Delta
At any time $t$ during an active vacancy savings session:
$$\Delta P(t) = \max\left(0, \, P_{\text{counterfactual}}(t) - P_{\text{actual}}(t)\right)$$

### 2.2 Numerical Energy Integration
Over the duration of a vacancy session from $t_{\text{start}}$ to $t_{\text{end}}$, energy saved is numerically integrated over each discrete time step $\Delta t$:
$$E_{\text{saved}} = \sum_{k=1}^{N} \frac{\Delta P(t_k) \cdot \Delta t_k}{3600 \times 1000} \quad [\text{kWh}]$$

### 2.3 Financial & Environmental Impact
- **Financial Savings**:
  $$\text{Cost Saved (INR)} = E_{\text{saved}} \times \text{Electricity Tariff} \quad (\text{Default: } 8.00\text{ INR/kWh})$$
- **Avoided Carbon Emissions**:
  $$\text{CO}_2\text{ Avoided (kg)} = E_{\text{saved}} \times \text{Grid Emission Factor} \quad (\text{Default: } 0.82\text{ kg CO}_2/\text{kWh})$$

---

## 3. Independent Copy-Room Physics

The shadow copy room is not a static number—it simulates its own continuous physical environment:
1. **HVAC Cycling**: If the copy room's temperature is above setpoint ($24^\circ\text{C}$), its AC compressor stays in `COMPRESSOR_ON` drawing full rated power ($1800\text{ W}$) and cooling at $0.5^\circ\text{C}/\text{min}$.
2. **Equilibrium Standby**: When the copy room reaches setpoint, its AC transitions to `COMPRESSOR_OFF`, drawing standby fan power ($45\text{ W}$).
3. **Continuous Loads**: Lights, fans, and unprotected equipment remain in their pre-vacancy operational states.

---

## 4. No-Copy-Room Optimization (§41)

If all controllable loads (lights, fans, ACs) were **already OFF** when the room became vacant:
- No energy waste could occur.
- No copy room is instantiated in memory.
- The engine logs: `ℹ️ [Savings] Room vacant but all controllable loads already OFF; copy-room not created.`
- Eliminates unnecessary memory overhead and prevents false savings generation.

---

## 5. Savings Session Lifecycle

1. **Trigger**: Occurs when occupancy drops to 0 and `occupancyState` transitions to `VACANCY_PENDING` / `VACANT`.
2. **Execution**: Every 1-second simulation tick, `savingsEngine.updateSession()` evaluates both real and shadow power, accumulating cumulative kWh, INR, and $\text{kg CO}_2$.
3. **Closure**: The instant an occupant re-enters the room (`occupancyCount > 0`):
   - The session transitions to `CLOSED`.
   - The final duration and totals are finalized.
   - The completed session is persisted to PostgreSQL for historical auditing and analytics reporting.
