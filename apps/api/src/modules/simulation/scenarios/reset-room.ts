import { simulationState } from '../simulation-state.js';
import { publish } from '../../../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import { logger } from '../../../utils/logger.js';

export function triggerResetRoomScenario(roomId: string = 'room-101'): void {
  logger.info(`🎭 [Scenario] Triggered: Room Reset on ${roomId}`);

  simulationState.clearPeople(roomId);
  simulationState.addPerson(roomId, {
    id: 'person-prof-sharma',
    roomId,
    displayName: 'Prof. Sharma',
    active: true,
    heatGainW: 110,
    co2GenerationPpmPerHour: 40000,
  });
  simulationState.addPerson(roomId, {
    id: 'person-student-01',
    roomId,
    displayName: 'Student Alpha',
    active: true,
    heatGainW: 95,
    co2GenerationPpmPerHour: 36000,
  });

  simulationState.setUnregisteredLoad(roomId, 0);

  simulationState.updateRoomState(roomId, {
    temperatureC: 24.0,
    outsideTemperatureC: 32.0,
    humidityPct: 50.0,
    co2Ppm: 450.0,
    ambientLightLux: 500.0,
    occupancyState: 'OCCUPIED',
    vacancyStartedAt: null,
  });

  // Turn on primary devices
  simulationState.updateDevice(roomId, 'dev-ac-101', {
    currentState: 'COOLING',
    isPoweredOn: true,
    currentPowerW: 1450,
  });
  simulationState.updateDevice(roomId, 'dev-led-1-101', {
    currentState: 'ON',
    isPoweredOn: true,
    currentPowerW: 36,
  });
  simulationState.updateDevice(roomId, 'dev-led-2-101', {
    currentState: 'ON',
    isPoweredOn: true,
    currentPowerW: 36,
  });
  simulationState.updateDevice(roomId, 'dev-fan-101', {
    currentState: 'SPEED_2',
    isPoweredOn: true,
    currentPowerW: 42,
  });

  publish(EventTypes.SCENARIO_TRIGGERED, roomId, {
    scenario: 'RESET_ROOM',
    description: 'Room 101 restored to standard occupied operational baseline.',
    timestamp: new Date().toISOString(),
  });
}
