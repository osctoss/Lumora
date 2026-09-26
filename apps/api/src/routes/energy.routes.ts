import { FastifyInstance } from 'fastify';
import { simulationState } from '../modules/simulation/simulation-state.js';
import { meterEngine } from '../modules/energy/meter-engine.js';
import { roundTo } from '../utils/math.js';

export async function energyRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/energy/building — building energy aggregation (Correction §38, §56)
  app.get<{ Querystring: { start?: string; end?: string } }>('/building', async (request) => {
    const start = request.query.start ? new Date(request.query.start) : undefined;
    const end = request.query.end ? new Date(request.query.end) : undefined;
    return await meterEngine.getBuildingEnergy(start, end);
  });

  // GET /api/energy/rooms/:roomId — room energy consumption intervals & cumulative (Correction §38, §56)
  app.get<{ Params: { roomId: string }; Querystring: { start?: string; end?: string } }>(
    '/rooms/:roomId',
    async (request, reply) => {
      const room = simulationState.getRoom(request.params.roomId);
      if (!room) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      const start = request.query.start ? new Date(request.query.start) : undefined;
      const end = request.query.end ? new Date(request.query.end) : undefined;
      return await meterEngine.getRoomEnergy(room.roomId, start, end);
    },
  );

  // GET /api/energy/accounting/:roomId — registered expectation vs actual breakdown (Correction §50)
  app.get<{ Params: { roomId: string } }>('/accounting/:roomId', async (request, reply) => {
    const room = simulationState.getRoom(request.params.roomId);
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    const meteredPowerW = Math.round(room.state.totalPowerKw * 1000);
    const expectedSumPowerW = Math.round(room.state.expectedRegisteredPowerKw * 1000);
    const unaccountedPowerW = Math.max(0, meteredPowerW - expectedSumPowerW);
    const discrepancyPct =
      expectedSumPowerW > 0 ? roundTo((unaccountedPowerW / expectedSumPowerW) * 100, 1) : 0;

    return {
      roomId: room.roomId,
      timestamp: room.state.simulationTimestamp,
      meteredActivePowerW: meteredPowerW,
      expectedSumPowerW,
      unaccountedPowerW,
      discrepancyPercentage: discrepancyPct,
      isAnomaly: unaccountedPowerW > 50,
      activeDevicesCount: simulationState.getDevices(room.roomId).filter((d) => d.isPoweredOn).length,
    };
  });
}
