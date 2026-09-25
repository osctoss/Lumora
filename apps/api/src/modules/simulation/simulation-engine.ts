import { simulationClock } from './simulation-clock.js';
import { simulationState } from './simulation-state.js';
import { occupancyModel } from './occupancy-model.js';
import { environmentModel } from './environment-model.js';
import { readEnergyMeter } from './sensor-models/energy-meter.js';
import { readPirSensor } from './sensor-models/occupancy-pir.js';
import { readMmWaveSensor } from './sensor-models/occupancy-mmwave.js';
import { readTemperatureSensor } from './sensor-models/temperature.js';
import { readHumiditySensor } from './sensor-models/humidity.js';
import { readCo2Sensor } from './sensor-models/co2.js';
import { readAmbientLightSensor } from './sensor-models/ambient-light.js';
import { getDeviceModel } from './device-models/index.js';
import { policyEngine } from '../automation/policy-engine.js';
import { savingsEngine } from '../savings/savings-engine.js';
import { computeComfortScore } from '../comfort/comfort-engine.js';
import { publish } from '../../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import { roundTo } from '../../utils/math.js';
import { logger } from '../../utils/logger.js';

export class SimulationEngine {
  private timer: NodeJS.Timeout | null = null;
  private isProcessingTick = false;
  private realTickIntervalMs = 1000; // 1 real second per tick

  start(): void {
    if (this.timer) return;
    logger.info('🚀 Simulation Engine started (1Hz physical tick loop)');
    this.timer = setInterval(() => {
      this.tick();
    }, this.realTickIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('🛑 Simulation Engine stopped');
    }
  }

  private tick(): void {
    if (this.isProcessingTick) return;
    if (simulationClock.getStatus() !== 'RUNNING') return;

    this.isProcessingTick = true;
    try {
      const dtSeconds = 1 * simulationClock.getSpeedMultiplier();
      const simTime = simulationClock.advance(dtSeconds);
      const timestampIso = simTime.toISOString();
      const rooms = simulationState.getAllRooms();

      for (const room of rooms) {
        const roomId = room.roomId;

        // ─── Step 3 & 4: Occupancy State Machine ────────────────────
        const occResult = occupancyModel.updateRoomOccupancy(roomId, dtSeconds);

        // ─── Step 5: Environmental Differential Equations ───────────
        const envResult = environmentModel.updateEnvironment(roomId, dtSeconds);

        // ─── Step 6: Sensor Readings ────────────────────────────────
        const pirVal = readPirSensor(occResult.peopleCount);
        const mmWaveVal = readMmWaveSensor(occResult.peopleCount);
        const tempVal = readTemperatureSensor(envResult.temperature);
        const humidityVal = readHumiditySensor(envResult.humidity);
        const co2Val = readCo2Sensor(envResult.co2);
        const luxVal = readAmbientLightSensor(envResult.ambientLight);

        simulationState.updateSensorReading(roomId, 'sensor-pir-101', pirVal);
        simulationState.updateSensorReading(roomId, 'sensor-mmwave-101', mmWaveVal);
        simulationState.updateSensorReading(roomId, 'sensor-temp-101', tempVal);
        simulationState.updateSensorReading(roomId, 'sensor-humidity-101', humidityVal);
        simulationState.updateSensorReading(roomId, 'sensor-co2-101', co2Val);
        simulationState.updateSensorReading(roomId, 'sensor-light-101', luxVal);

        // ─── Step 7: Device Models & Power Calculation ──────────────
        const devices = simulationState.getDevices(roomId);
        let totalExpectedPowerW = 0;

        for (const device of devices) {
          const model = getDeviceModel(device.type);
          const devResult = model.calculate(device, {
            dtSeconds,
            roomTempC: envResult.temperature,
            targetTempC: 24.0,
            occupancyCount: occResult.peopleCount,
            roomLux: envResult.ambientLight,
          });

          simulationState.updateDevice(roomId, device.id, {
            currentState: devResult.newState,
            isPoweredOn: devResult.isPoweredOn,
            currentPowerW: devResult.powerW,
          });

          totalExpectedPowerW += devResult.powerW;
        }

        // ─── Step 8: Smart Energy Meter Aggregation ─────────────────
        const meterReading = readEnergyMeter(devices, room.unregisteredLoadW, timestampIso);
        simulationState.updateSensorReading(roomId, 'sensor-meter-101', meterReading.activePowerW);

        // ─── Step 9 & 10: Policy Engine & Autonomous Actions ────────
        policyEngine.evaluateRoomPolicies(roomId);

        // ─── Step 11 & 12: Anomaly & Unregistered Load Detection ────
        if (meterReading.unaccountedPowerW >= 50.0) {
          // If unaccounted power > 50W, emit alert
          publish(EventTypes.ANOMALY_DETECTED, roomId, {
            meteredPowerW: meterReading.activePowerW,
            expectedPowerW: meterReading.expectedPowerW,
            unaccountedPowerW: meterReading.unaccountedPowerW,
            severity: 'HIGH',
            message: `Unregistered load detected: ${meterReading.unaccountedPowerW}W unaccounted power draw`,
          });
        }

        // ─── Step 13 & 14: Savings & Counterfactual Ledger ──────────
        savingsEngine.updateSession(roomId, meterReading.activePowerW, dtSeconds);

        // ─── Step 15 & 16: ASHRAE Comfort Scoring ───────────────────
        const comfort = computeComfortScore(
          envResult.temperature,
          envResult.humidity,
          envResult.co2,
          envResult.ambientLight,
        );

        // ─── Step 17 & 18: Update Room State & Broadcast Tick ────────
        simulationState.updateRoomState(roomId, {
          totalPowerKw: roundTo(meterReading.activePowerW / 1000, 3),
          expectedRegisteredPowerKw: roundTo(meterReading.expectedPowerW / 1000, 3),
          unaccountedPowerKw: roundTo(meterReading.unaccountedPowerW / 1000, 3),
          comfortScore: comfort.overallScore,
        });

        // Broadcast SIMULATION_TICK
        publish(
          EventTypes.SIMULATION_TICK,
          roomId,
          {
            roomId,
            timestamp: timestampIso,
            tickNumber: simulationClock.getTicksElapsed(),
            metrics: {
              temperature: envResult.temperature,
              humidity: envResult.humidity,
              co2: envResult.co2,
              ambientLight: envResult.ambientLight,
              occupancyDetected: occResult.peopleCount > 0,
              peopleCount: occResult.peopleCount,
              totalActivePowerW: meterReading.activePowerW,
              totalExpectedPowerW: meterReading.expectedPowerW,
              unaccountedPowerW: meterReading.unaccountedPowerW,
              comfortScore: comfort.overallScore,
              occupancyState: occResult.state,
              voltageV: meterReading.voltageV,
              powerFactor: meterReading.powerFactor,
            },
          },
          'SIMULATION',
        );
      }
    } catch (err) {
      logger.error('Error in simulation tick:', err);
    } finally {
      this.isProcessingTick = false;
    }
  }
}

export const simulationEngine = new SimulationEngine();
