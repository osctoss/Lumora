import { simulationState } from '../simulation-state.js';
import { publish } from '../../../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import { logger } from '../../../utils/logger.js';

export function triggerUnregisteredLoadScenario(roomId: string = 'room-101', watts: number = 350): void {
  logger.info(`🎭 [Scenario] Triggered: Unregistered unauthorized load (${watts}W) on ${roomId}`);
  simulationState.setUnregisteredLoad(roomId, watts);

  publish(EventTypes.SCENARIO_TRIGGERED, roomId, {
    scenario: 'UNREGISTERED_LOAD',
    description: `Unauthorized appliance plugged in: ${watts}W unregistered load injected. Smart submeter detects unaccounted discrepancy.`,
    powerW: watts,
    timestamp: new Date().toISOString(),
  });
}
