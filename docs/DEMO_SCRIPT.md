# IntelliSave 3-5 Minute Pitch & Demo Walkthrough

### Act 1: The Invisible Waste in Smart Buildings (0:00 - 0:45)
- Open the IntelliSave Dashboard at `http://localhost:5173`.
- "Modern buildings boast about being 'smart', yet over 25% of commercial power is wasted heating, cooling, and lighting completely empty rooms. When facilities try to cut costs, they over-throttle HVAC, making occupants miserable."
- Highlight the **Live Power Meter (1610W)**, the **Dual-Technology PIR + mmWave Occupancy**, and the **ASHRAE-55 Comfort Score (95/100)**.

### Act 2: Real-Time Physical Simulation & Edge Scenarios (0:45 - 2:00)
- "IntelliSave runs a 1Hz differential physical model simulating real thermodynamics, human respiration, and equipment curves."
- Click **"Room Empties"** or drop occupancy to 0:
  - Explain the state transition: `OCCUPIED` -> `VACANCY_PENDING`.
  - "Notice the system doesn't immediately kill the equipment. It triggers a calibrated grace period to avoid short-cycling compressors."
  - Accelerate time to **30x**.
  - Show the autonomous shutoff: LEDs and AC turn off.
  - Show the **Verified Savings Ledger** tick upward with avoided kWh and ₹ INR savings.

### Act 3: Critical Asset Protection & Ghost Load Diagnostics (2:00 - 3:30)
- Navigate to the **Device Wall** tab.
- "What about critical equipment? A biological sample freezer or lab workstation can never be powered down."
- Attempt to turn off the **Biological Deep Freezer**:
  - The UI highlights the `[PROTECTED]` badge and prevents actuation.
- Click **"Ghost Load (+350W)"**:
  - Point to the SVG sparkline showing actual power exceeding expected registered power.
  - Click **"AI Diagnostics"** to display the root-cause analysis showing submeter discrepancies.

### Act 4: Mathematical Verification & ROI (3:30 - 4:30)
- Switch to the **Verified Savings Ledger** tab.
- Explain the counterfactual model: "We don't guess based on last month's utility bill. We compare against the continuous counterfactual load."
- Interact with the **What-If Calculator** sliders (e.g. moving setpoint from 22°C to 24°C) to show projected institutional returns in ₹ and carbon credits.
- Wrap up: "IntelliSave bridges the gap between aggressive energy efficiency and human comfort."
