import { simulationState } from '../simulation/simulation-state.js';
import { simulationClock } from '../simulation/simulation-clock.js';
import { publish } from '../../websocket/event-publisher.js';
import { EventTypes, DeviceState } from '@intellisave/shared';
import { logger } from '../../utils/logger.js';

import { roundTo } from '../../utils/math.js';

export interface PolicyActionResult {
  deviceId: string;
  action: 'TURN_OFF' | 'TURN_ON' | 'COMPRESSOR_OFF' | 'ADJUST_SPEED';
  reason: string;
  powerSavedW: number;
}

export interface VacancyPolicyConfig {
  acCompressorOffMinutes: number;
  acFullOffMinutes: number;
  lightingOffDelaySeconds: number;
  fanOffDelaySeconds: number;
}

export class PolicyEngine {
  private config: VacancyPolicyConfig = {
    acCompressorOffMinutes: 5,  // Correction §42: AC compressor OFF after 5 min
    acFullOffMinutes: 10,        // Correction §42: AC full OFF after 10 min
    lightingOffDelaySeconds: 0, // Correction §42: LED OFF immediately
    fanOffDelaySeconds: 0,      // Correction §42: Fan OFF immediately
  };

  public getConfig(): VacancyPolicyConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<VacancyPolicyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  evaluateRoomPolicies(roomId: string, currentSimTime?: Date): PolicyActionResult[] {
    const room = simulationState.getRoom(roomId);
    if (!room) return [];

    const actions: PolicyActionResult[] = [];
    const state = room.state;
    const devices = simulationState.getDevices(roomId);
    const now = currentSimTime || simulationClock.getSimulatedTime();

    // If room power supply is OFF, devices cannot operate
    if (!state.powerSupplyOn) {
      return [];
    }

    // ─── Occupancy Welcome Automation (INTELLISAVE_BUILD_SPEC §17.4) ───
    if (state.occupancyCount > 0) {
      const occupancyStart = state.occupancyStartedAt ? new Date(state.occupancyStartedAt) : now;
      const occupancyElapsedSec = Math.max(0, (now.getTime() - occupancyStart.getTime()) / 1000);
      const occupancyElapsedMin = occupancyElapsedSec / 60;

      for (const device of devices) {
        if (device.manualOverride) continue; // Respect manual overrides
        if (device.isProtected || device.type === 'FREEZER') continue; // Protected devices never auto-toggled

        // turnOnDelayMin: 0 (Immediate), 2, 5, 10, 20, or -1 (Manual Only)
        const onDelayMin = device.turnOnDelayMin !== undefined ? device.turnOnDelayMin : 0;
        if (onDelayMin === -1) continue; // Manual only — do not turn on automatically

        if (occupancyElapsedMin < onDelayMin) {
          continue; // Timer hasn't elapsed yet
        }

        // 1. LED / Lighting — turn ON automatically upon occupancy
        if (device.type === 'LED' || device.type === 'TUBE_LIGHT') {
          if (!device.isPoweredOn || device.currentState === 'OFF') {
            const previousState = device.currentState;
            simulationState.updateDevice(roomId, device.id, {
              currentState: 'ON',
              isPoweredOn: true,
              currentPowerW: device.ratedPowerW,
            });

            actions.push({
              deviceId: device.id,
              action: 'TURN_ON',
              reason: `Occupancy detected (${onDelayMin === 0 ? 'Immediate' : `${onDelayMin}m timer`}): ${device.name} turned ON`,
              powerSavedW: 0,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState,
              newState: 'ON',
              source: 'AUTOMATION',
              reason: `Occupancy welcome policy: lighting turned ON after ${onDelayMin}m delay`,
              powerW: device.ratedPowerW,
            });

            publish(EventTypes.DEVICE_TURNED_ON, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
            });

            this.logActionEvent(roomId, device.id, 'TURN_ON', previousState, 'ON', 'Occupancy welcome lighting');
          }
        }

        // 2. Fan — turn ON automatically upon occupancy
        else if (device.type === 'FAN') {
          if (!device.isPoweredOn || device.currentState === 'OFF') {
            const previousState = device.currentState;
            const fanPower = roundTo(device.ratedPowerW * 0.75, 1);

            simulationState.updateDevice(roomId, device.id, {
              currentState: 'ON',
              isPoweredOn: true,
              currentPowerW: fanPower,
            });

            actions.push({
              deviceId: device.id,
              action: 'TURN_ON',
              reason: `Occupancy detected (${onDelayMin === 0 ? 'Immediate' : `${onDelayMin}m timer`}): ${device.name} turned ON`,
              powerSavedW: 0,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState,
              newState: 'ON',
              source: 'AUTOMATION',
              reason: `Occupancy welcome policy: fan turned ON after ${onDelayMin}m delay`,
              powerW: fanPower,
            });

            publish(EventTypes.DEVICE_TURNED_ON, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
            });

            this.logActionEvent(roomId, device.id, 'TURN_ON', previousState, 'ON', 'Occupancy welcome fan');
          }
        }

        // 3. AC — turns on per timer, compressor operates according to temperature vs setpoint
        else if (device.type === 'AC') {
          if (!device.isPoweredOn || device.currentState === 'OFF') {
            const previousState = device.currentState;
            const setpoint = state.acSetpointC || 24.0;
            const compOn = state.temperatureC > setpoint;
            const newState: DeviceState = compOn ? 'COMPRESSOR_ON' : 'COMPRESSOR_OFF';
            const power = compOn ? device.ratedPowerW : (device.standbyPowerW > 0 ? device.standbyPowerW : 45.0);

            simulationState.updateDevice(roomId, device.id, {
              currentState: newState,
              isPoweredOn: true,
              currentPowerW: power,
            });

            actions.push({
              deviceId: device.id,
              action: 'TURN_ON',
              reason: `Occupancy detected (${onDelayMin === 0 ? 'Immediate' : `${onDelayMin}m timer`}): ${device.name} powered ON (Compressor: ${compOn ? 'ON' : 'Standby'}, Room: ${state.temperatureC.toFixed(1)}°C, Setpoint: ${setpoint}°C)`,
              powerSavedW: 0,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState,
              newState,
              source: 'AUTOMATION',
              reason: `Occupancy welcome policy: AC powered ON after ${onDelayMin}m delay`,
              powerW: power,
            });

            publish(EventTypes.DEVICE_TURNED_ON, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
            });

            if (compOn) {
              publish(EventTypes.AC_COMPRESSOR_ON, roomId, {
                deviceId: device.id,
                source: 'AUTOMATION',
              });
            }

            this.logActionEvent(roomId, device.id, 'TURN_ON', previousState, newState, 'Occupancy climate control');
          }
        }

        // 4. Other controllable devices
        else if (device.isControllable) {
          if (!device.isPoweredOn || device.currentState === 'OFF') {
            const previousState = device.currentState;
            simulationState.updateDevice(roomId, device.id, {
              currentState: 'ON',
              isPoweredOn: true,
              currentPowerW: device.ratedPowerW,
            });

            actions.push({
              deviceId: device.id,
              action: 'TURN_ON',
              reason: `Occupancy detected: ${device.name} turned ON`,
              powerSavedW: 0,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState,
              newState: 'ON',
              source: 'AUTOMATION',
              reason: `Occupancy welcome policy: ${device.name} turned ON`,
              powerW: device.ratedPowerW,
            });

            publish(EventTypes.DEVICE_TURNED_ON, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
            });

            this.logActionEvent(roomId, device.id, 'TURN_ON', previousState, 'ON', 'Occupancy device turn ON');
          }
        }
      }
    }

    // ─── Vacancy Automation (Correction §42) ──────────────────────
    else if (state.occupancyCount === 0 && state.vacancyStartedAt) {
      const vacancyStart = new Date(state.vacancyStartedAt);
      const vacancyElapsedSec = Math.max(0, (now.getTime() - vacancyStart.getTime()) / 1000);
      const vacancyElapsedMin = vacancyElapsedSec / 60;

      for (const device of devices) {
        // Protected devices (like Freezer) ALWAYS remain ON (Correction §42)
        if (device.isProtected || device.type === 'FREEZER') {
          continue;
        }

        if (device.manualOverride) continue;

        // Determine configured turnOffDelayMin (default: LED/Fan=0 [Immediate], AC=10m, Others=5m)
        const defaultOffDelay =
          device.type === 'AC'
            ? this.config.acFullOffMinutes
            : (device.type === 'LED' || device.type === 'TUBE_LIGHT' || device.type === 'FAN')
            ? 0
            : 5;
        const offDelayMin = device.turnOffDelayMin !== undefined ? device.turnOffDelayMin : defaultOffDelay;

        if (offDelayMin === -1) continue; // Manual only — do not shut off automatically

        // 1. LED / Lighting — turn OFF per delay
        if (device.type === 'LED' || device.type === 'TUBE_LIGHT') {
          if (vacancyElapsedMin >= offDelayMin && device.isPoweredOn && device.currentState !== 'OFF') {
            const powerBefore = device.currentPowerW;
            const previousState = device.currentState;

            simulationState.updateDevice(roomId, device.id, {
              currentState: 'OFF',
              isPoweredOn: false,
              currentPowerW: 0,
            });

            actions.push({
              deviceId: device.id,
              action: 'TURN_OFF',
              reason: `Autonomous shutoff: ${device.name} turned OFF (${offDelayMin === 0 ? 'immediately' : `after ${offDelayMin}m`} on room vacancy)`,
              powerSavedW: powerBefore,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState,
              newState: 'OFF',
              source: 'AUTOMATION',
              reason: `Autonomous vacancy shutoff (${offDelayMin}m lighting policy)`,
              powerW: 0,
            });

            publish(EventTypes.DEVICE_TURNED_OFF, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
            });

            this.logActionEvent(roomId, device.id, 'TURN_OFF', previousState, 'OFF', `Vacancy lighting shutoff (${offDelayMin}m)`);
          }
        }

        // 2. Fan — turn OFF per delay
        else if (device.type === 'FAN') {
          if (vacancyElapsedMin >= offDelayMin && device.isPoweredOn && device.currentState !== 'OFF') {
            const powerBefore = device.currentPowerW;
            const previousState = device.currentState;

            simulationState.updateDevice(roomId, device.id, {
              currentState: 'OFF',
              isPoweredOn: false,
              currentPowerW: 0,
            });

            actions.push({
              deviceId: device.id,
              action: 'TURN_OFF',
              reason: `Autonomous shutoff: ${device.name} turned OFF (${offDelayMin === 0 ? 'immediately' : `after ${offDelayMin}m`} on room vacancy)`,
              powerSavedW: powerBefore,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState,
              newState: 'OFF',
              source: 'AUTOMATION',
              reason: `Autonomous vacancy shutoff (${offDelayMin}m fan policy)`,
              powerW: 0,
            });

            publish(EventTypes.DEVICE_TURNED_OFF, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
            });

            this.logActionEvent(roomId, device.id, 'TURN_OFF', previousState, 'OFF', `Vacancy fan shutoff (${offDelayMin}m)`);
          }
        }

        // 3. AC — multi-stage vacancy policy:
        // Full OFF after configured offDelayMin (e.g. 10m, 5m, 2m, Immediate)
        else if (device.type === 'AC') {
          if (vacancyElapsedMin >= offDelayMin && device.isPoweredOn && device.currentState !== 'OFF') {
            const powerBefore = device.currentPowerW;
            const previousState = device.currentState;

            simulationState.updateDevice(roomId, device.id, {
              currentState: 'OFF',
              isPoweredOn: false,
              currentPowerW: 0,
            });

            actions.push({
              deviceId: device.id,
              action: 'TURN_OFF',
              reason: `Autonomous AC full shutoff after ${offDelayMin === 0 ? 'immediate' : `${offDelayMin} min`} vacancy`,
              powerSavedW: powerBefore,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState,
              newState: 'OFF',
              source: 'AUTOMATION',
              reason: `Autonomous AC shutdown after ${offDelayMin}m vacancy`,
              powerW: 0,
            });

            publish(EventTypes.DEVICE_TURNED_OFF, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
            });

            this.logActionEvent(roomId, device.id, 'TURN_OFF', previousState, 'OFF', `AC full off after ${offDelayMin}m`);
          }
          // Pre-shutoff Stage: Compressor cuts off early (e.g. at half delay or 5 min) if offDelayMin > 0
          else if (
            offDelayMin > 0 &&
            vacancyElapsedMin >= Math.min(5, offDelayMin / 2) &&
            device.isPoweredOn &&
            device.currentState === 'COMPRESSOR_ON'
          ) {
            const powerBefore = device.currentPowerW;
            const compOffPower = device.standbyPowerW > 0 ? device.standbyPowerW : 45.0;

            simulationState.updateDevice(roomId, device.id, {
              currentState: 'COMPRESSOR_OFF',
              isPoweredOn: true,
              currentPowerW: compOffPower,
            });

            const compCutoffMin = Math.min(5, offDelayMin / 2);
            actions.push({
              deviceId: device.id,
              action: 'COMPRESSOR_OFF',
              reason: `Autonomous AC compressor shutoff after ${compCutoffMin} min vacancy`,
              powerSavedW: powerBefore - compOffPower,
            });

            publish(EventTypes.AC_COMPRESSOR_OFF, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
              reason: `AC compressor cut off after ${compCutoffMin}m vacancy`,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState: 'COMPRESSOR_ON',
              newState: 'COMPRESSOR_OFF',
              source: 'AUTOMATION',
              reason: `Compressor cut off after ${compCutoffMin}m vacancy`,
              powerW: compOffPower,
            });

            this.logActionEvent(roomId, device.id, 'COMPRESSOR_OFF', 'COMPRESSOR_ON', 'COMPRESSOR_OFF', `AC compressor cut off after ${compCutoffMin}m`);
          }
        }

        // 4. Other controllable devices — follow device policy
        else if (device.isControllable) {
          const turnOff = device.policy ? device.policy.turnOffOnVacancy : true;
          if (turnOff && vacancyElapsedMin >= offDelayMin && device.isPoweredOn && device.currentState !== 'OFF') {
            const powerBefore = device.currentPowerW;
            const previousState = device.currentState;

            simulationState.updateDevice(roomId, device.id, {
              currentState: 'OFF',
              isPoweredOn: false,
              currentPowerW: device.standbyPowerW,
            });

            actions.push({
              deviceId: device.id,
              action: 'TURN_OFF',
              reason: `Autonomous shutoff: ${device.name} turned OFF per device vacancy policy (${offDelayMin}m)`,
              powerSavedW: powerBefore - device.standbyPowerW,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState,
              newState: 'OFF',
              source: 'AUTOMATION',
              reason: `Device vacancy policy shutoff (${offDelayMin}m)`,
              powerW: device.standbyPowerW,
            });

            publish(EventTypes.DEVICE_TURNED_OFF, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
            });

            this.logActionEvent(roomId, device.id, 'TURN_OFF', previousState, 'OFF', 'Generic device vacancy shutoff');
          }
        }
      }
    }

    // Broadcast AUTOMATION_ACTION for any actions taken
    for (const act of actions) {
      publish(EventTypes.AUTOMATION_ACTION, roomId, {
        roomId,
        deviceId: act.deviceId,
        action: act.action,
        reason: act.reason,
        powerSavedW: act.powerSavedW,
        timestamp: now.toISOString(),
      });
    }

    return actions;
  }

  private logActionEvent(
    roomId: string,
    deviceId: string,
    actionType: string,
    beforeState: string,
    afterState: string,
    reason: string,
  ): void {
    import('../../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        const roomExists = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
        if (!roomExists) return;

        await prisma.actionEvent.create({
          data: {
            roomId,
            deviceId,
            actionType,
            source: 'AUTOMATION',
            reason,
            beforeState,
            afterState,
          },
        });
      } catch {}
    });
  }
}

export const policyEngine = new PolicyEngine();
