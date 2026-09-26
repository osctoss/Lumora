import { clamp, roundTo } from '../../utils/math.js';
import { simulationState } from './simulation-state.js';
import { simulationClock } from './simulation-clock.js';
import { SIMULATION_DEFAULTS } from '../../config/defaults.js';

export class EnvironmentModel {
  updateEnvironment(roomId: string, dtSeconds: number): {
    temperature: number;
    humidity: number;
    co2: number;
    ambientLight: number;
  } {
    const room = simulationState.getRoom(roomId);
    if (!room) {
      return {
        temperature: SIMULATION_DEFAULTS.INITIAL_ROOM_TEMP_C,
        humidity: SIMULATION_DEFAULTS.INITIAL_ROOM_HUMIDITY_PCT,
        co2: SIMULATION_DEFAULTS.INITIAL_ROOM_CO2_PPM,
        ambientLight: SIMULATION_DEFAULTS.INITIAL_ROOM_LUX,
      };
    }

    const state = room.state;
    const devices = simulationState.getDevices(roomId);
    const people = simulationState.getPeople(roomId).filter((p) => p.active);
    const simTime = simulationClock.getSimulatedTime();

    // ─── 1. Thermal Model (Correction §27, §28) ───────────────────
    const acDevice = devices.find((d) => d.type === 'AC' && d.isPoweredOn && d.currentState !== 'OFF');
    let newTemp = state.temperatureC;

    if (acDevice && state.powerSupplyOn) {
      // AC is running (Correction §27):
      // Target setpoint enforced between 18°C and 28°C
      const acSetpoint = clamp(state.acSetpointC || 24.0, 18.0, 28.0);

      if (state.temperatureC > acSetpoint) {
        // Temperature reduction: 0.5°C per simulation minute
        const coolingDrop = (0.5 / 60) * dtSeconds;
        newTemp = Math.max(acSetpoint, state.temperatureC - coolingDrop);
      } else {
        // At or below setpoint: maintain setpoint (COMPRESSOR_OFF mode)
        // Guard against float drift below setpoint
        newTemp = acSetpoint;
      }
    } else {
      // AC is OFF (Correction §28):
      // Temperature rises gradually toward environmental temperature - 5°C
      const outdoorTemp = state.outsideTemperatureC || SIMULATION_DEFAULTS.OUTDOOR_TEMP_C;
      const targetEquilibriumTemp = outdoorTemp - 5.0;

      if (state.temperatureC < targetEquilibriumTemp) {
        // Temperature rise: 0.5°C per simulation minute
        const warmingRise = (0.5 / 60) * dtSeconds;
        newTemp = Math.min(targetEquilibriumTemp, state.temperatureC + warmingRise);
      } else if (state.temperatureC > targetEquilibriumTemp) {
        // If room was warmer than equilibrium (e.g., manual override), cool towards equilibrium
        const coolingDrop = (0.5 / 60) * dtSeconds;
        newTemp = Math.max(targetEquilibriumTemp, state.temperatureC - coolingDrop);
      } else {
        newTemp = targetEquilibriumTemp;
      }
    }

    // Float rounding to 2 decimal places to prevent drift
    newTemp = roundTo(newTemp, 2);

    // ─── 2. CO2 Model (Correction §29) ─────────────────────────────
    // Outdoor CO2 baseline: ~415 ppm
    const outdoorCo2 = SIMULATION_DEFAULTS.OUTDOOR_CO2_PPM;
    // Occupant generation: 0.08 ppm/sec per person (4.8 ppm/min)
    const co2GenRatePerSec = people.length * 0.08;
    // Infiltration + ventilation air exchange rate
    const ventilationRatePerSec = 0.00014;
    const deltaCo2 = (co2GenRatePerSec - (state.co2Ppm - outdoorCo2) * ventilationRatePerSec) * dtSeconds;
    const newCo2 = clamp(state.co2Ppm + deltaCo2, 380.0, 3500.0);

    // ─── 3. Humidity Model (Correction §30) ─────────────────────────
    const outdoorHumidity = SIMULATION_DEFAULTS.OUTDOOR_HUMIDITY_PCT;
    const isAcCooling = acDevice && acDevice.currentState === 'COMPRESSOR_ON';
    const acDehumidifyRate = isAcCooling ? 0.001 : 0;
    const occupantMoistureRate = people.length * 0.0005;
    const humidityInfiltrationRate = 0.0001;
    const deltaHumidity =
      ((outdoorHumidity - state.humidityPct) * humidityInfiltrationRate + occupantMoistureRate - acDehumidifyRate) *
      dtSeconds;
    const newHumidity = clamp(state.humidityPct + deltaHumidity, 20.0, 95.0);

    // ─── 4. Ambient Light Model (Correction §30) ───────────────────
    const hour = simTime.getHours() + simTime.getMinutes() / 60;
    let naturalLightLux = 0;
    if (hour >= 6 && hour <= 19) {
      const solarAngle = ((hour - 6) / 13) * Math.PI;
      naturalLightLux = Math.sin(solarAngle) * 600.0;
    }

    const activeLights = devices.filter(
      (d) => (d.type === 'LED' || d.type === 'TUBE_LIGHT') && d.isPoweredOn && d.currentState !== 'OFF',
    );
    const artificialLightLux = activeLights.length * 200.0;
    const newLux = Math.round(clamp(naturalLightLux + artificialLightLux, 0.0, 1500.0));

    // Update room simulation state
    simulationState.updateRoomState(roomId, {
      temperatureC: newTemp,
      co2Ppm: roundTo(newCo2, 1),
      humidityPct: roundTo(newHumidity, 1),
      ambientLightLux: newLux,
    });

    return {
      temperature: newTemp,
      humidity: roundTo(newHumidity, 1),
      co2: roundTo(newCo2, 1),
      ambientLight: newLux,
    };
  }
}

export const environmentModel = new EnvironmentModel();
