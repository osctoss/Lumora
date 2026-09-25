import { simulationState } from '../simulation-state.js';
import { publish } from '../../../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import { logger } from '../../../utils/logger.js';

export function triggerHighTemperatureScenario(roomId: string = 'room-101'): void {
  logger.info(`🎭 [Scenario] Triggered: High Heat Wave on ${roomId}`);
  simulationState.updateRoomState(roomId, {
    outsideTemperatureC: 41.5,
    temperatureC: 31.0,
  });

  publish(EventTypes.SCENARIO_TRIGGERED, roomId, {
    scenario: 'HIGH_HEAT',
    description: 'Severe heat wave injected (Outdoor: 41.5°C). AC compressor demand surging.',
    timestamp: new Date().toISOString(),
  });
}
