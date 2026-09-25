import { FastifyInstance } from 'fastify';
import { simulationState } from '../modules/simulation/simulation-state.js';
import { roundTo } from '../utils/math.js';

export async function energyRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/energy/accounting/:roomId
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
