import { simulationState } from '../simulation/simulation-state.js';
import { simulationClock } from '../simulation/simulation-clock.js';
import { publish } from '../../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import { logger } from '../../utils/logger.js';

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

    // ─── Vacancy Automation (Correction §42) ──────────────────────
    if (state.occupancyCount === 0 && state.vacancyStartedAt) {
      const vacancyStart = new Date(state.vacancyStartedAt);
      const vacancyElapsedSec = Math.max(0, (now.getTime() - vacancyStart.getTime()) / 1000);
      const vacancyElapsedMin = vacancyElapsedSec / 60;

      for (const device of devices) {
        // Protected devices (like Freezer) ALWAYS remain ON (Correction §42)
        if (device.isProtected || device.type === 'FREEZER') {
          continue;
        }

        // 1. LED / Lighting — turn OFF immediately
        if (device.type === 'LED' || device.type === 'TUBE_LIGHT') {
          if (vacancyElapsedSec >= this.config.lightingOffDelaySeconds && device.isPoweredOn && device.currentState !== 'OFF') {
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
              reason: `Autonomous shutoff: ${device.name} turned OFF immediately on room vacancy`,
              powerSavedW: powerBefore,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState,
              newState: 'OFF',
              source: 'AUTOMATION',
              reason: 'Autonomous vacancy shutoff (immediate LED policy)',
              powerW: 0,
            });

            publish(EventTypes.DEVICE_TURNED_OFF, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
            });

            this.logActionEvent(roomId, device.id, 'TURN_OFF', previousState, 'OFF', 'Immediate vacancy lighting shutoff');
          }
        }

        // 2. Fan — turn OFF immediately
        else if (device.type === 'FAN') {
          if (vacancyElapsedSec >= this.config.fanOffDelaySeconds && device.isPoweredOn && device.currentState !== 'OFF') {
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
              reason: `Autonomous shutoff: ${device.name} turned OFF immediately on room vacancy`,
              powerSavedW: powerBefore,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState,
              newState: 'OFF',
              source: 'AUTOMATION',
              reason: 'Autonomous vacancy shutoff (immediate Fan policy)',
              powerW: 0,
            });

            publish(EventTypes.DEVICE_TURNED_OFF, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
            });

            this.logActionEvent(roomId, device.id, 'TURN_OFF', previousState, 'OFF', 'Immediate vacancy fan shutoff');
          }
        }

        // 3. AC — multi-stage vacancy policy (Correction §42)
        // Stage 2: Full OFF after 10 minutes of vacancy
        else if (device.type === 'AC') {
          if (vacancyElapsedMin >= this.config.acFullOffMinutes && device.isPoweredOn && device.currentState !== 'OFF') {
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
              reason: `Autonomous AC full shutoff after ${this.config.acFullOffMinutes} min vacancy`,
              powerSavedW: powerBefore,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState,
              newState: 'OFF',
              source: 'AUTOMATION',
              reason: `Autonomous AC shutdown after ${this.config.acFullOffMinutes}m vacancy`,
              powerW: 0,
            });

            publish(EventTypes.DEVICE_TURNED_OFF, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
            });

            this.logActionEvent(roomId, device.id, 'TURN_OFF', previousState, 'OFF', `AC full off after ${this.config.acFullOffMinutes}m`);
          }
          // Stage 1: Compressor OFF after 5 minutes of vacancy
          else if (
            vacancyElapsedMin >= this.config.acCompressorOffMinutes &&
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

            actions.push({
              deviceId: device.id,
              action: 'COMPRESSOR_OFF',
              reason: `Autonomous AC compressor shutoff after ${this.config.acCompressorOffMinutes} min vacancy`,
              powerSavedW: powerBefore - compOffPower,
            });

            publish(EventTypes.AC_COMPRESSOR_OFF, roomId, {
              deviceId: device.id,
              source: 'AUTOMATION',
              reason: `AC compressor cut off after ${this.config.acCompressorOffMinutes}m vacancy`,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState: 'COMPRESSOR_ON',
              newState: 'COMPRESSOR_OFF',
              source: 'AUTOMATION',
              reason: `Compressor cut off after ${this.config.acCompressorOffMinutes}m vacancy`,
              powerW: compOffPower,
            });

            this.logActionEvent(roomId, device.id, 'COMPRESSOR_OFF', 'COMPRESSOR_ON', 'COMPRESSOR_OFF', `AC compressor cut off after ${this.config.acCompressorOffMinutes}m`);
          }
        }

        // 4. Other controllable devices — follow device policy (Correction §42)
        else if (device.isControllable) {
          const turnOff = device.policy ? device.policy.turnOffOnVacancy : true;
          if (turnOff && device.isPoweredOn && device.currentState !== 'OFF') {
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
              reason: `Autonomous shutoff: ${device.name} turned OFF per device vacancy policy`,
              powerSavedW: powerBefore - device.standbyPowerW,
            });

            publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
              deviceId: device.id,
              previousState,
              newState: 'OFF',
              source: 'AUTOMATION',
              reason: 'Device vacancy policy shutoff',
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
