import type { OccupancyState } from '@intellisave/shared';
import { EventTypes } from '@intellisave/shared';
import { simulationState } from './simulation-state.js';
import { simulationClock } from './simulation-clock.js';
import { publish } from '../../websocket/event-publisher.js';
import { logger } from '../../utils/logger.js';

export class OccupancyModel {
  updateRoomOccupancy(roomId: string, dtSeconds: number): {
    state: OccupancyState;
    peopleCount: number;
    vacancyElapsedSec: number;
    transitioned: boolean;
  } {
    const room = simulationState.getRoom(roomId);
    if (!room) {
      return { state: 'VACANT', peopleCount: 0, vacancyElapsedSec: 0, transitioned: false };
    }

    const people = simulationState.getPeople(roomId);
    const activePeople = people.filter((p) => p.active);
    const peopleCount = activePeople.length;
    const currentState = room.state.occupancyState;
    const now = simulationClock.getSimulatedTime();

    let newState = currentState;
    let transitioned = false;
    let vacancyElapsedSec = 0;

    if (peopleCount > 0) {
      // Room is actively occupied
      if (currentState !== 'OCCUPIED') {
        newState = 'OCCUPIED';
        transitioned = true;
        simulationState.updateRoomState(roomId, {
          occupancyState: newState,
          vacancyStartedAt: null,
          occupancyCount: peopleCount,
          peoplePresent: activePeople.map((p) => p.id),
        });

        publish(EventTypes.OCCUPANCY_STATE_CHANGED, roomId, {
          previousState: currentState,
          newState,
          peopleCount,
          reason: 'Presence detected by micro-movement / PIR sensors',
        });
      } else {
        simulationState.updateRoomState(roomId, {
          occupancyCount: peopleCount,
          peoplePresent: activePeople.map((p) => p.id),
        });
      }
    } else {
      // No people detected
      if (currentState === 'OCCUPIED') {
        // First tick without people -> VACANCY_PENDING
        newState = 'VACANCY_PENDING';
        transitioned = true;
        const vacancyStartIso = now.toISOString();

        simulationState.updateRoomState(roomId, {
          occupancyState: newState,
          vacancyStartedAt: vacancyStartIso,
          occupancyCount: 0,
          peoplePresent: [],
        });

        publish(EventTypes.OCCUPANCY_STATE_CHANGED, roomId, {
          previousState: currentState,
          newState,
          peopleCount: 0,
          reason: 'PIR and mmWave show zero presence, entering grace period',
        });
      } else if (currentState === 'VACANCY_PENDING') {
        // Count vacancy delay
        const vacancyStart = room.state.vacancyStartedAt ? new Date(room.state.vacancyStartedAt) : now;
        vacancyElapsedSec = Math.floor((now.getTime() - vacancyStart.getTime()) / 1000);

        if (vacancyElapsedSec >= room.state.vacancyDelaySeconds) {
          // Confirmation timeout reached -> VACANT
          newState = 'VACANT';
          transitioned = true;

          simulationState.updateRoomState(roomId, {
            occupancyState: newState,
            occupancyCount: 0,
            peoplePresent: [],
          });

          publish(EventTypes.OCCUPANCY_STATE_CHANGED, roomId, {
            previousState: currentState,
            newState,
            peopleCount: 0,
            vacancyDurationSeconds: vacancyElapsedSec,
            reason: `Vacancy confirmation timeout (${room.state.vacancyDelaySeconds}s) expired`,
          });

          logger.info(`🚪 Room ${roomId} confirmed VACANT after ${vacancyElapsedSec}s`);
        }
      }
    }

    return { state: newState, peopleCount, vacancyElapsedSec, transitioned };
  }
}

export const occupancyModel = new OccupancyModel();
