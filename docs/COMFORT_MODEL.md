# Lumora — Human Comfort Index & ASHRAE-55 Model

Energy efficiency without comfort is counter-productive. If aggressive energy-saving measures degrade indoor air quality or thermal comfort, building occupants will either override automated systems or suffer productivity loss.

**Lumora** treats human comfort as a **hard mathematical constraint**, inspired by **ASHRAE Standard 55 (Thermal Environmental Conditions for Human Occupancy)** and **ASHRAE 62.1 (Ventilation for Acceptable Indoor Air Quality)**.

---

## 1. Overall Comfort Score Formula

The prototype computes a continuous composite **Comfort Index (0 to 100)**:

$$\text{Comfort Score} = 0.50 \cdot S_{\text{temperature}} + 0.20 \cdot S_{\text{humidity}} + 0.30 \cdot S_{\text{air\_quality}}$$

---

## 2. Component Sub-Scores

### 2.1 Thermal Comfort Score ($S_{\text{temperature}}$)
Evaluates indoor operative temperature:
- **Optimal Band ($22^\circ\text{C}$ to $26^\circ\text{C}$)**: Yields a maximum score of $95\text{–}100$.
- **Acceptable Band ($20^\circ\text{C}$ to $22^\circ\text{C}$ or $26^\circ\text{C}$ to $28^\circ\text{C}$)**: Linearly scales between $75\text{–}94$.
- **Discomfort Band ($< 18^\circ\text{C}$ or $> 30^\circ\text{C}$)**: Rapidly degrades toward $0$.

### 2.2 Relative Humidity Score ($S_{\text{humidity}}$)
Evaluates respiratory comfort and mold risk:
- **Optimal Comfort Band ($40\%$ to $60\%$)**: Yields $100$.
- **Acceptable Band ($30\%$ to $40\%$ or $60\%$ to $70\%$)**: Scales between $70\text{–}90$.
- **Unacceptable ($< 20\%$ dry air or $> 75\%$ humid air)**: Severe penalty below $50$.

### 2.3 Indoor Air Quality Score ($S_{\text{air\_quality}}$)
Evaluates Carbon Dioxide ($\text{CO}_2$) concentration as a proxy for ventilation adequacy and cognitive alertness:
- **Fresh Air ($< 600\text{ ppm}$)**: Yields $100$.
- **Moderate ($600\text{ ppm}$ to $1,000\text{ ppm}$)**: Yields $80\text{–}95$.
- **Declining ($1,000\text{ ppm}$ to $1,400\text{ ppm}$)**: Triggers drowsiness warnings, score drops to $50\text{–}79$.
- **Hazardous ($> 1,500\text{ ppm}$)**: Score drops below $40$, triggering high air-quality alerts.

---

## 3. Classification Thresholds

| Comfort Score Range | Status | UI Indicator | Action Recommendation |
| :--- | :--- | :--- | :--- |
| **85 – 100** | `OPTIMAL` | Emerald Glow | Normal autonomous energy optimization |
| **70 – 84** | `ACCEPTABLE` | Teal / Blue | Standard operations; minor adjustments |
| **50 – 69** | `DEGRADED` | Amber Warning | Automation dampens HVAC throttling |
| **< 50** | `CRITICAL` | Rose Alert | Ventilation override; air exchange prioritized |

---

## 4. Vacant Room Exemption

When `occupancyCount == 0`:
- The system flags comfort as **"Not Applicable — Room Vacant"**.
- Energy conservation takes total precedence. Temperatures are allowed to float toward environmental equilibrium without penalizing building comfort KPIs.

---

## 5. Comfort Protection Override

If a room is occupied and:
$$\text{Comfort Score} < 60 \quad \text{or} \quad [\text{CO}_2] > 1,400\text{ ppm}$$
The automation policy engine temporarily locks out aggressive HVAC setpoint setbacks, preventing energy saving from compromising human well-being.
