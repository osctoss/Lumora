import { simulationState } from '../simulation-state.js';
import { publish } from '../../../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import { logger } from '../../../utils/logger.js';

export function triggerHighCo2Scenario(roomId: string = 'room-101'): void {
  logger.info(`🎭 [Scenario] Triggered: High CO2 Overcrowding on ${roomId}`);

  // Populate room with 25 active students
  for (let i = 1; i <= 25; i++) {
    simulationState.addPerson(roomId, {
      id: `person-crowd-${i}`,
      roomId,
      displayName: `Student #${i}`,
      active: true,
      heatGainW: 100,
      co2GenerationPpmPerHour: 42000,
    });
  }

  simulationState.updateRoomState(roomId, {
    co2Ppm: 1650.0,
  });

  publish(EventTypes.SCENARIO_TRIGGERED, roomId, {
    scenario: 'HIGH_CO2',
    description: 'Overcrowding injected: 25 occupants added, indoor CO2 surged past 1600 ppm.',
    timestamp: new Date().toISOString(),
  });
}
