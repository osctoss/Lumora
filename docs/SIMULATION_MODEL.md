# Lumora — Simulation Physics & Environmental Models

The **Lumora Digital Twin** runs on a deterministic, 1Hz physical differential equation engine that advances the physical and thermodynamic states of rooms, occupants, and electrical equipment.

---

## 1. Simulation Architecture

The simulation engine decouples **real physical time** from **simulated time** via a centralized `SimulationClock`:
- **Tick Interval**: 1 real second per simulation cycle.
- **Speed Multipliers**: $1\times, 2\times, 5\times, 10\times, 30\times, 60\times$.
- **Time Advancement**:
  $$\Delta t_{\text{sim}} = \Delta t_{\text{real}} \times \text{speedMultiplier}$$
  At $60\times$, 1 real second advances 1 simulated minute.

---

## 2. Thermal & HVAC Dynamics

### 2.1 Active Cooling (AC Compressor ON)
When an Air Conditioner compressor is active and the room temperature $T_{\text{room}}$ exceeds the target setpoint $T_{\text{setpoint}}$:
- **Cooling Rate**: A deterministic rate of **$0.5^\circ\text{C}$ per minute** ($0.00833^\circ\text{C}/\text{s}$):
  $$T_{\text{room}}(t + \Delta t) = \max\left(T_{\text{setpoint}}, \, T_{\text{room}}(t) - 0.5 \times \frac{\Delta t}{60}\right)$$
- **Setpoint Enforcement**: Target setpoints are strictly bounded within $[18^\circ\text{C}, \, 28^\circ\text{C}]$.
- **Float Stability**: The temperature is clamped at setpoint to prevent sub-setpoint numerical drift.
- **Dual-Rating Compressor Transition**: Once $T_{\text{room}} \le T_{\text{setpoint}}$, the AC transitions to `COMPRESSOR_OFF` mode, dropping power consumption from rated power (e.g., 1800W) down to standby/fan power (e.g., 45W).

### 2.2 Passive Warming & Equilibrium Cap (AC OFF)
When cooling is turned OFF and outside environmental temperature $T_{\text{env}}$ is warmer than indoor temperature:
- **Warming Rate**: Passive thermal conduction and solar heat gain warm the room at **$0.5^\circ\text{C}$ per minute**:
  $$T_{\text{room}}(t + \Delta t) = \min\left(T_{\text{cap}}, \, T_{\text{room}}(t) + 0.5 \times \frac{\Delta t}{60}\right)$$
- **Equilibrium Thermal Cap**: Natural indoor warming stops strictly at **$T_{\text{env}} - 5.0^\circ\text{C}$**:
  $$T_{\text{cap}} = T_{\text{env}} - 5^\circ\text{C}$$
  For example, with $T_{\text{env}} = 40^\circ\text{C}$, the room warms until exactly $35^\circ\text{C}$ and stabilizes.

---

## 3. Metabolic Occupancy & $\text{CO}_2$ Mass Balance

Carbon Dioxide concentration inside the room is governed by occupant respiration and continuous ventilation air exchange.

### 3.1 $\text{CO}_2$ Differential Equation
$$\frac{d[\text{CO}_2]}{dt} = \frac{N_{\text{people}} \cdot G_{\text{metabolic}}}{V_{\text{room}}} - \lambda_{\text{vent}} \cdot \left([\text{CO}_2](t) - [\text{CO}_2]_{\text{outdoor}}\right)$$

Where:
- $[\text{CO}_2]_{\text{outdoor}} = 415.0\text{ ppm}$ (baseline atmospheric air).
- $G_{\text{metabolic}} = 38,000\text{ ppm}\cdot\text{m}^3/\text{hr}$ per active human occupant.
- $\lambda_{\text{vent}}$ is the natural room ventilation exchange rate ($0.05\text{ hr}^{-1}$).

### 3.2 Decay and Rise Behavior
1. **Zero Occupants ($N = 0$)**: $\text{CO}_2$ decays exponentially towards the outdoor baseline of $415\text{ ppm}$.
2. **Occupied ($N \ge 1$)**: $\text{CO}_2$ accumulates steadily proportional to the count of living entities in the room.

---

## 4. Relative Humidity & Ambient Light Dynamics

### 4.1 Relative Humidity
- **Occupant Evapotranspiration**: Occupants add moisture, increasing relative humidity towards an upper bound of $65\%$.
- **AC Dehumidification**: Running AC active cooling condenses water vapor, gradually drawing humidity down towards a comfort equilibrium ($45\%$).
- **Empty Room Naturalization**: Vacant rooms decay towards outdoor ambient humidity ($50\%$).

### 4.2 Ambient Light (Lux)
Total illuminance $E_{\text{total}}$ is the sum of outdoor diurnal daylight penetrating windows and artificial lighting:
$$E_{\text{total}} = E_{\text{daylight}}(t) + \sum_{i \in \text{Lights}} E_{\text{fixture}, i}$$
- Outdoor sunlight models solar elevation angles (peak at noon, 0 at night).
- Standard troffers and LED fixtures add $300\text{–}500\text{ lux}$ when powered ON.

---

## 5. Master Room Electrical Power Supply

Each room features a physical **Master Power Supply circuit** (`powerSupplyOn`):
- **Power ON**: Devices draw power according to their state machines and sensors read active telemetry.
- **Power OFF**:
  - Electrical flow is immediately cut to **$0\text{ W}$** across all connected loads.
  - The smart submeter instantly records $0.000\text{ kW}$.
  - Devices cease operation.
  - Upon power restoration, protected equipment (such as biological Freezers) automatically resume `COMPRESSOR_ON` state.
