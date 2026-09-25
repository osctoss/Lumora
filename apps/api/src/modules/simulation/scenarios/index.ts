import { triggerRoomEmptyScenario } from './room-empty.js';
import { triggerHighTemperatureScenario } from './high-temperature.js';
import { triggerHighCo2Scenario } from './high-co2.js';
import { triggerUnregisteredLoadScenario } from './unregistered-load.js';
import { triggerResetRoomScenario } from './reset-room.js';

export {
  triggerRoomEmptyScenario,
  triggerHighTemperatureScenario,
  triggerHighCo2Scenario,
  triggerUnregisteredLoadScenario,
  triggerResetRoomScenario,
};

export function triggerScenario(name: string, roomId: string = 'room-101', params?: Record<string, unknown>): void {
  switch (name) {
    case 'ROOM_EMPTY':
      triggerRoomEmptyScenario(roomId);
      break;
    case 'HIGH_HEAT':
    case 'HIGH_TEMPERATURE':
      triggerHighTemperatureScenario(roomId);
      break;
    case 'HIGH_CO2':
      triggerHighCo2Scenario(roomId);
      break;
    case 'UNREGISTERED_LOAD':
      const watts = typeof params?.watts === 'number' ? params.watts : 350;
      triggerUnregisteredLoadScenario(roomId, watts);
      break;
    case 'RESET_ROOM':
    default:
      triggerResetRoomScenario(roomId);
      break;
  }
}
