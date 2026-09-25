import { FastifyInstance } from 'fastify';
import { simulationState } from '../modules/simulation/simulation-state.js';
import { publish } from '../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';

export async function roomRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/rooms
  app.get('/', async () => {
    const rooms = simulationState.getAllRooms().map((r) => ({
      id: r.roomId,
      buildingId: 'building-demo-01',
      name: r.name,
      type: 'CLASSROOM',
      floor: r.floor,
      capacity: r.capacity,
      areaSqMeters: r.areaSqMeters,
      status: 'ACTIVE' as const,
      currentOccupancyState: r.state.occupancyState,
      currentTemperature: r.state.temperatureC,
      currentHumidity: r.state.humidityPct,
      currentCo2: r.state.co2Ppm,
      currentLux: r.state.ambientLightLux,
      currentComfortScore: r.state.comfortScore,
      totalActivePowerW: Math.round(r.state.totalPowerKw * 1000),
      totalExpectedPowerW: Math.round(r.state.expectedRegisteredPowerKw * 1000),
      unaccountedPowerW: Math.round(r.state.unaccountedPowerKw * 1000),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    return { rooms, total: rooms.length };
  });

  // GET /api/rooms/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const room = simulationState.getRoom(request.params.id);
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    return {
      room: {
        id: room.roomId,
        name: room.name,
        floor: room.floor,
        capacity: room.capacity,
        areaSqMeters: room.areaSqMeters,
      },
      state: room.state,
      devices: Array.from(room.devices.values()),
      people: Array.from(room.people.values()),
      sensors: Array.from(room.sensors.values()),
      unregisteredLoadW: room.unregisteredLoadW,
    };
  });

  // POST /api/rooms/:id/occupancy
  app.post<{ Params: { id: string }; Body: { count?: number; state?: string } }>(
    '/:id/occupancy',
    async (request, reply) => {
      const room = simulationState.getRoom(request.params.id);
      if (!room) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      const { count = 0 } = request.body || {};
      simulationState.clearPeople(room.roomId);

      for (let i = 1; i <= count; i++) {
        simulationState.addPerson(room.roomId, {
          id: `person-manual-${i}`,
          roomId: room.roomId,
          displayName: `Occupant #${i}`,
          active: true,
          heatGainW: 100,
          co2GenerationPpmPerHour: 38000,
        });
      }

      publish(EventTypes.OCCUPANCY_CHANGED, room.roomId, {
        roomId: room.roomId,
        occupancyCount: count,
        reason: 'Manual occupancy adjustment',
      });

      return { success: true, roomId: room.roomId, occupancyCount: count };
    },
  );
}
