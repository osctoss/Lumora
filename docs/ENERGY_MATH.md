# IntelliSave Mathematical & Physical Formulations

## 1. Thermal Building Physics Model
Indoor room temperature changes continuously according to Newton's law of cooling modified by internal heat sources and HVAC cooling power:

$$\frac{dT}{dt} = \frac{T_{\text{ambient}} - T}{\tau_{\text{thermal}}} + \frac{\dot{Q}_{\text{occupants}} + \dot{Q}_{\text{devices}} - \dot{Q}_{\text{hvac}}}{C_{\text{room}}}$$

- $T_{\text{ambient}}$: Outside outdoor air temperature (°C)
- $\tau_{\text{thermal}}$: Building envelope thermal time constant (~3600 seconds)
- $\dot{Q}_{\text{occupants}}$: Metabolic heat gain (~100W per person)
- $\dot{Q}_{\text{devices}}$: Heat dissipated from active electronics (~90% of active electrical power)
- $\dot{Q}_{\text{hvac}}$: Active mechanical heat extraction when AC compressor is running
- $C_{\text{room}}$: Effective thermal mass of the room air and furnishings

## 2. Metabolic CO₂ Respiration Model
Human respiration increases indoor carbon dioxide levels according to mass balance:

$$\frac{d[\text{CO}_2]}{dt} = \frac{N_{\text{people}} \cdot G_{\text{co2}}}{V_{\text{room}}} - \text{ACH} \cdot ([\text{CO}_2] - [\text{CO}_{2,\text{outdoor}}])$$

- $G_{\text{co2}}$: Average generation rate (~0.005 L/s per person)
- $V_{\text{room}}$: Room air volume (m³)
- $\text{ACH}$: Air changes per hour from infiltration and mechanical ventilation
- $[\text{CO}_{2,\text{outdoor}}]$: Background outdoor atmospheric concentration (~415 ppm)

## 3. Counterfactual Savings Verification
Unlike naive baseline comparisons that fluctuate with outdoor weather or changing occupancy, IntelliSave calculates savings by running a shadow counterfactual device state:

$$E_{\text{saved}} = \sum_{t} \max\left(0, P_{\text{counterfactual}}(t) - P_{\text{actual}}(t)\right) \cdot \Delta t$$

- $P_{\text{counterfactual}}$: What power draw would have occurred had the vacancy policy not shut down the device.
- Financial cost savings:
  $$\text{Cost Saved (₹)} = E_{\text{saved}} \times \text{Tariff}_{\text{commercial}}$$
- Scope 2 Greenhouse Gas emissions avoided:
  $$\text{CO}_{2\text{ avoided (kg)}} = E_{\text{saved}} \times \text{Emission Factor}_{\text{grid}}$$

## 4. ASHRAE-55 Composite Comfort Index
Occupant well-being is scored on a 0 to 100 scale:

$$\text{Score}_{\text{comfort}} = 0.50 \cdot S_{\text{thermal}} + 0.20 \cdot S_{\text{humidity}} + 0.30 \cdot S_{\text{air\_quality}}$$

Where each sub-score is penalized proportionally when deviating from recommended comfort bounds (21–25°C, 35–60% RH, <800 ppm CO₂).
