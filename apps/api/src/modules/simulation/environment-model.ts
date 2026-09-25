import { clamp, boundedNoise, roundTo } from '../../utils/math.js';
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

    // ─── 1. Thermal Model ─────────────────────────────────────────
    // Thermal time constant tau (seconds) for building thermal mass: ~3600s
    const tau = 3600.0;
    const outdoorTemp = state.outsideTemperatureC;

    // Heat gains:
    // Occupants: ~100W sensible heat per person
    const occupantHeatWatts = people.reduce((sum, p) => sum + (p.heatGainW || 100), 0);

    // Device internal gains: lights and equipment convert power to heat
    const activeEquipmentWatts = devices.reduce((sum, d) => {
      if (d.type !== 'AC' && d.isPoweredOn) {
        return sum + d.currentPowerW;
      }
      return sum;
    }, 0) + room.unregisteredLoadW;

    const totalInternalGainWatts = occupantHeatWatts + activeEquipmentWatts;
    // Room thermal capacitance estimate: 45 sqm * 3m height * 1.2 kg/m3 * 1000 J/kgK ≈ 162,000 J/K
    const roomThermalCapacitance = room.areaSqMeters * 3.0 * 1200.0;
    const heatGainRatePerSec = totalInternalGainWatts / roomThermalCapacitance;

    // HVAC cooling effect:
    const acDevice = devices.find((d) => d.type === 'AC' && d.isPoweredOn && d.currentState === 'COOLING');
    let hvacCoolingRatePerSec = 0;
    if (acDevice) {
      // 1.5 Ton AC has ~5000 W thermal cooling capacity
      const ratedCoolingWatts = 5000.0;
      hvacCoolingRatePerSec = ratedCoolingWatts / roomThermalCapacitance;
    }

    // Heat transfer through walls/windows: (T_out - T_in) / tau
    const conductionRatePerSec = (outdoorTemp - state.temperatureC) / tau;

    // Thermal delta
    const deltaT = (conductionRatePerSec + heatGainRatePerSec - hvacCoolingRatePerSec) * dtSeconds;
    const newTemp = clamp(state.temperatureC + deltaT + boundedNoise(0.02), 16.0, 42.0);

    // ─── 2. CO2 Model ─────────────────────────────────────────────
    // Outdoor CO2 baseline: ~415 ppm
    const outdoorCo2 = SIMULATION_DEFAULTS.OUTDOOR_CO2_PPM;
    // Occupant generation: ~38,000 ppm*liter / hr, in 135 m^3 room ≈ 0.08 ppm/sec per person
    const co2GenRatePerSec = people.length * 0.08;
    // Natural infiltration + ventilation air exchange rate (ach): 0.5 air changes per hour ≈ 0.00014 / sec
    const ventilationRatePerSec = 0.00014;
    const deltaCo2 = (co2GenRatePerSec - (state.co2Ppm - outdoorCo2) * ventilationRatePerSec) * dtSeconds;
    const newCo2 = clamp(state.co2Ppm + deltaCo2 + boundedNoise(0.5), 380.0, 3500.0);

    // ─── 3. Humidity Model ─────────────────────────────────────────
    const outdoorHumidity = SIMULATION_DEFAULTS.OUTDOOR_HUMIDITY_PCT;
    // AC dehumidifies at ~0.001 % per second when cooling
    const acDehumidifyRate = acDevice ? 0.001 : 0;
    const occupantMoistureRate = people.length * 0.0005;
    const humidityInfiltrationRate = 0.0001;
    const deltaHumidity =
      ((outdoorHumidity - state.humidityPct) * humidityInfiltrationRate + occupantMoistureRate - acDehumidifyRate) *
      dtSeconds;
    const newHumidity = clamp(state.humidityPct + deltaHumidity + boundedNoise(0.05), 20.0, 95.0);

    // ─── 4. Ambient Light Model ───────────────────────────────────
    // Solar daylight curve: peaks around 13:00 (1 PM)
    const hour = simTime.getHours() + simTime.getMinutes() / 60;
    let naturalLightLux = 0;
    if (hour >= 6 && hour <= 19) {
      // Half-sine solar curve
      const solarAngle = ((hour - 6) / 13) * Math.PI;
      naturalLightLux = Math.sin(solarAngle) * 600.0;
    }

    // Artificial lights contribution
    const activeLights = devices.filter((d) => (d.type === 'LED' || d.type === 'TUBE_LIGHT') && d.isPoweredOn);
    const artificialLightLux = activeLights.length * 200.0;

    const newLux = Math.round(clamp(naturalLightLux + artificialLightLux + boundedNoise(5.0), 0.0, 1500.0));

    // Update room simulation state
    simulationState.updateRoomState(roomId, {
      temperatureC: roundTo(newTemp, 2),
      co2Ppm: roundTo(newCo2, 1),
      humidityPct: roundTo(newHumidity, 1),
      ambientLightLux: newLux,
    });

    return {
      temperature: roundTo(newTemp, 2),
      humidity: roundTo(newHumidity, 1),
      co2: roundTo(newCo2, 1),
      ambientLight: newLux,
    };
  }
}

export const environmentModel = new EnvironmentModel();
