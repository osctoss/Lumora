# Lumora — Digital Twin Domain & Entity Model

The **Lumora Digital Twin** is structured around strongly typed, relational entities that model the physical layout, electrical topology, and environmental dynamics of commercial buildings.

---

## 1. Entity-Relationship Architecture

```
Building (1)
  └── Rooms (1..N)
        ├── Master Power Supply Circuit (Boolean)
        ├── Environmental State (Temp, Humidity, CO2, Lux)
        ├── Simulated People (0..N Entities)
        ├── Electrical Devices (0..N Registered Loads)
        ├── Virtual Sensor Suite (7 Physical Sensors)
        ├── Smart Submeter (5-minute Interval Accumulator)
        └── Counterfactual Savings Sessions (0..N Auditable Logs)
```

---

## 2. Core Entities

### 2.1 Building
The root facility entity:
- `id`: Unique identifier (e.g., `building-demo-01`).
- `name`: Facility title (e.g., `Lumora Demo Building`).
- `electricityTariffInrPerKwh`: Commercial tariff rate (default: `8.00 INR/kWh`).
- `co2FactorKgPerKwh`: Carbon intensity factor of the regional grid (default: `0.82 kg CO2/kWh`).

### 2.2 Room
The central spatial boundary for power, climate, and occupancy:
- **Topology**: `id`, `name`, `floor`, `capacity`, `areaSqMeters`.
- **Master Power**: `powerSupplyOn` (boolean). When false, cuts electrical supply to all devices.
- **Microclimate State**: `temperatureC`, `humidityPct`, `co2Ppm`, `ambientLightLux`, `acSetpointC`.
- **Occupancy Model**: `occupancyCount` (integer), `occupancyState` (`VACANT`, `VACANCY_PENDING`, `OCCUPIED`).
- **Power Aggregation**: `totalPowerKw`, `expectedRegisteredPowerKw`, `unaccountedPowerKw`.

### 2.3 Person (Occupancy Entity)
In Lumora, occupancy is an **entity-based model**, not an abstract number:
- `id`: UUID.
- `displayName`: Occupant name (e.g., `Alice`, `Visitor 1`).
- `active`: Boolean presence indicator.
- `heatGainW`: Sensible heat output added to thermal balance ($100.0\text{ W}$).
- `co2GenerationPpmPerHour`: Metabolic $\text{CO}_2$ exhalation ($38,000\text{ ppm}\cdot\text{m}^3/\text{hr}$).

### 2.4 Electrical Devices
Appliances installed on the room's electrical wall:
- `type`: `AC`, `FAN`, `LED`, `TUBE_LIGHT`, `FREEZER`, `LAPTOP_PORT`, `DESKTOP`, `PROJECTOR`, `GENERIC`.
- `ratedPowerW`: Nominal wattage at full operation.
- `standbyPowerW`: Residual power draw when idle or compressor-off.
- `currentState`: State machine (`ON`, `OFF`, `COMPRESSOR_ON`, `COMPRESSOR_OFF`, `SPEED_1`–`3`).
- `isProtected`: If true (e.g., Freezer), automation cannot turn it off.
- `isControllable`: If true, automation policy can manage its power states.
- `manualOverride`: Boolean flag set when a user manually interacts with the device.

### 2.5 Virtual Sensor Suite
Each room is automatically provisioned with 7 calibrated sensor telemetry channels:
1. `ENERGY_METER`: Total real-time electrical power draw (Watts).
2. `OCCUPANCY_PIR`: Passive Infrared motion sensor (Boolean).
3. `OCCUPANCY_MMWAVE`: High-precision micro-presence sensor (Boolean).
4. `TEMPERATURE`: Operative indoor dry-bulb thermometer ($^\circ\text{C}$).
5. `HUMIDITY`: Relative humidity hygrometer ($\% \text{RH}$).
6. `CO2`: Non-Dispersive Infrared (NDIR) Carbon Dioxide sensor ($\text{ppm}$).
7. `AMBIENT_LIGHT`: Photodiode illuminance sensor ($\text{lux}$).

---

## 3. Metering & Accounting Model (§34–§38)

The digital twin includes a deterministic **5-minute Smart Submetering Engine**:
- **Aggregation Formula**:
  $$\text{Interval Energy (kWh)} = \frac{\sum (P_i \times \Delta t_{\text{min}})}{60,000}$$
- **Partial Interval Tracking**: Ongoing consumption is tracked live second-by-second and committed to historical ledger tables exactly on 5-minute clock boundaries (`:00`, `:05`, `:10`, etc.).
- **Building Totalization**: Building energy is the exact deterministic sum of all individual room submeters:
  $$E_{\text{building}} = \sum_{r \in \text{Rooms}} E_r$$

---

## 4. Anomaly & Discrepancy Classification

Lumora distinguishes between different categories of power:
1. **Registered Expected Power ($P_{\text{expected}}$)**: Sum of wattages from known, modeled appliances in their current operational states.
2. **Measured Active Power ($P_{\text{measured}}$)**: Total wattage passing through the room's electrical panel submeter.
3. **Unaccounted Consumption ($P_{\text{unaccounted}}$)**:
   $$P_{\text{unaccounted}} = \max\left(0, \, P_{\text{measured}} - P_{\text{expected}}\right)$$
   Represents unmodeled equipment, degradation, or unauthorized plug loads.
