# IntelliSave System Assumptions & Engineering Parameters

1. **Electricity Tariff**:
   - Default commercial tariff is set to **₹8.00 per kWh** (configurable in System Settings).

2. **Grid GHG Emission Factor**:
   - Baseline Scope 2 emission intensity is assumed to be **0.82 kg CO₂ / kWh**, representing the standard national grid carbon intensity factor.

3. **Room 101 Physical Dimensions**:
   - Room Type: Smart University Classroom / Lab
   - Floor Area: 60 m² (Height: 3.0 m, Volume: 180 m³)
   - Thermal Time Constant ($\tau$): 3600 seconds
   - Design Occupancy Capacity: 30 persons

4. **Occupant Metabolic Dissipation**:
   - Sensible & latent heat dissipation: 100 Watts / person
   - CO₂ generation rate: 0.005 Liters / second / person

5. **Equipment Catalog Assumptions**:
   - Inverter AC: 1500W rated cooling capacity (variable load depending on thermal delta).
   - LED Lighting Array: 60W total active consumption (400–600 lux illumination).
   - Ventilation Fan: 50W rated power (3-speed setting).
   - Biological Deep Freezer: 250W rated compressor power (100% protected, continuous cycling).
   - Workstation PD: 100W rated power (100% protected, vital lab workstation).

6. **Safety & Failsafe Priority Order**:
   1. Device Safety & Protection Lockouts (Overrides all automation).
   2. Manual Operator Overrides.
   3. Occupancy-Driven Rules.
   4. ASHRAE Comfort Bounds.
   5. Aggressive Energy Conservation.
