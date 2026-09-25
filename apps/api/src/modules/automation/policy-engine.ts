import { simulationState } from '../simulation/simulation-state.js';
import { publish } from '../../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import { logger } from '../../utils/logger.js';

export interface PolicyActionResult {
  deviceId: string;
  action: 'TURN_OFF' | 'TURN_ON' | 'ADJUST_SPEED';
  reason: string;
  powerSavedW: number;
}

export class PolicyEngine {
  evaluateRoomPolicies(roomId: string): PolicyActionResult[] {
    const room = simulationState.getRoom(roomId);
    if (!room) return [];

    const actions: PolicyActionResult[] = [];
    const state = room.state;
    const devices = simulationState.getDevices(roomId);

    // Rule 1: Vacancy Auto-Shutoff for Non-Protected Controllable Devices
    if (state.occupancyState === 'VACANT') {
      for (const device of devices) {
        // Strict protection guard: Never touch protected devices
        if (device.isProtected) continue;
        if (!device.isControllable) continue;

        const policy = device.policy;
        const turnOffOnVacancy = policy ? policy.turnOffOnVacancy : true;

        if (turnOffOnVacancy && device.isPoweredOn) {
          const powerBefore = device.currentPowerW;

          // Turn off device
          simulationState.updateDevice(roomId, device.id, {
            currentState: 'OFF',
            isPoweredOn: false,
            currentPowerW: device.standbyPowerW,
          });

          actions.push({
            deviceId: device.id,
            action: 'TURN_OFF',
            reason: `Autonomous shutoff: Room 101 confirmed vacant for > ${state.vacancyDelaySeconds}s`,
            powerSavedW: powerBefore - device.standbyPowerW,
          });

          publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
            deviceId: device.id,
            previousState: device.currentState,
            newState: 'OFF',
            source: 'AUTOMATION',
            reason: `Autonomous vacancy shutoff (Policy Rule 1)`,
            powerW: device.standbyPowerW,
          });

          logger.info(`⚡ [Automation] Turned OFF ${device.name} in ${roomId} (Saved ${powerBefore}W)`);
        }
      }
    }

    // Rule 2: Occupancy Reactivation (Lights & AC when room becomes occupied)
    if (state.occupancyState === 'OCCUPIED') {
      const lights = devices.filter((d) => (d.type === 'LED' || d.type === 'TUBE_LIGHT') && !d.isPoweredOn);
      // If room is dim (< 300 lux) and occupied, turn on primary lighting
      if (state.ambientLightLux < 300 && lights.length > 0) {
        const light = lights[0];
        simulationState.updateDevice(roomId, light.id, {
          currentState: 'ON',
          isPoweredOn: true,
          currentPowerW: light.ratedPowerW,
        });

        actions.push({
          deviceId: light.id,
          action: 'TURN_ON',
          reason: `Auto-illuminate: Occupancy detected with ambient light at ${state.ambientLightLux} lux`,
          powerSavedW: 0,
        });

        publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
          deviceId: light.id,
          previousState: light.currentState,
          newState: 'ON',
          source: 'AUTOMATION',
          reason: `Occupancy comfort lighting`,
          powerW: light.ratedPowerW,
        });
      }
    }

    return actions;
  }
}

export const policyEngine = new PolicyEngine();
