# Lumora — Physical IoT & Building Management Integration Roadmap

While the current version of **Lumora** operates as a high-fidelity **software-only digital twin**, the underlying event-driven microservices architecture is engineered to interface directly with physical building management systems (BMS) and IoT telemetry networks.

---

## 1. Hardware Integration Architecture

```
Physical Building Hardware (HVAC, Meters, Relays, Sensors)
                 │
                 ├── BACnet/IP (Chillers, Air Handling Units, VAVs)
                 ├── Modbus TCP / RTU (Panel Submeters, Energy Analyzers)
                 ├── MQTT / Sparkplug B (Wireless Multi-Sensors)
                 └── Zigbee / Z-Wave (Smart Wall Switches, Plug Relays)
                 │
                 ▼
       ┌────────────────────────┐
       │   Lumora Edge Gateway  │ (Local Industrial PC / Gateway)
       └────────────────────────┘
                 │  TLS / WebSocket / gRPC
                 ▼
       ┌────────────────────────┐
       │   Lumora Cloud Engine  │ (Digital Twin + Policy + Savings Ledger)
       └────────────────────────┘
```

---

## 2. Protocol Adapters

### 2.1 Modbus TCP / RTU (Smart Submetering)
- **Target Hardware**: Schneider Electric / ABB / Siemens DIN-rail submeters with CT clamps.
- **Data Ingested**: Active power ($P_{\text{kW}}$), Power Factor ($\cos \phi$), Voltage ($V$), and Frequency ($\text{Hz}$).
- **Mapping**: Modbus holding registers map directly into the existing `readEnergyMeter()` data pipeline.

### 2.2 BACnet/IP (Commercial HVAC Control)
- **Target Hardware**: Trane / Daikin / Carrier Chiller Controllers, Thermostats, and VAV Boxes.
- **Bi-Directional Interface**:
  - **Read**: `Present_Value` of `Analog_Input` (Room Temp, Humidity, $\text{CO}_2$).
  - **Write**: `Present_Value` of `Analog_Output` (AC setpoint adjustment) or `Binary_Output` (Compressor enable).

### 2.3 MQTT / Sparkplug B (Environmental Micro-Sensors)
- **Target Hardware**: ESP32 / Nordic nRF9160 wireless sensor pucks measuring temperature, humidity, light lux, and $\text{CO}_2$ (NDIR).
- **Payload**: Lightweight JSON payloads published to `building/{bldgId}/room/{roomId}/telemetry`.

---

## 3. IPMVP Option C Compliance (Savings Measurement & Verification)

When connected to physical hardware, Lumora aligns with the **International Performance Measurement and Verification Protocol (IPMVP) Option C**:
- **Actual Consumption ($P_{\text{actual}}$)**: Ingested directly from calibrated physical smart meters.
- **Counterfactual Baseline ($P_{\text{counterfactual}}$)**: Calculated by the digital twin in memory, simulating what the facility's appliances would have consumed without autonomous intervention.
- Provides commercial facility managers and ESCOs (Energy Service Companies) with audit-grade proof of energy savings for carbon credit certification and utility rebate programs.

---

## 4. Hardware Fail-Safe & Watchdog Chain

To prevent operational disruptions in physical buildings:
1. **Heartbeat Watchdog**: If communication between the Lumora cloud engine and the local BMS gateway drops for $> 60\text{ seconds}$, all automated control relays fall back to safe manual default operation.
2. **Local Protected Circuit Lock**: Physical overrides on critical equipment (e.g., biological cold storage) are enforced by hardwired physical interlocks, complementing the digital twin's software lock.
