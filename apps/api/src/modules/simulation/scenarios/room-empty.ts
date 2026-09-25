import { simulationState } from '../simulation-state.js';
import { publish } from '../../../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import { logger } from '../../../utils/logger.js';

export function triggerRoomEmptyScenario(roomId: string = 'room-101'): void {
  logger.info(`🎭 [Scenario] Triggered: Room Empty (All occupants leave ${roomId})`);
  simulationState.clearPeople(roomId);

  publish(EventTypes.SCENARIO_TRIGGERED, roomId, {
    scenario: 'ROOM_EMPTY',
    description: 'All occupants left the room. Vacancy countdown initiated.',
    timestamp: new Date().toISOString(),
  });
}
