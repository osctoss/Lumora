import { FastifyInstance } from 'fastify';
import { simulationState } from '../modules/simulation/simulation-state.js';
import { savingsEngine } from '../modules/savings/savings-engine.js';
import { roundTo } from '../utils/math.js';

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/dashboard/overview
  app.get('/overview', async () => {
    const rooms = simulationState.getAllRooms();
    const activeSessions = savingsEngine.getAllActiveSessions();

    const totalActivePowerW = rooms.reduce((sum, r) => sum + Math.round(r.state.totalPowerKw * 1000), 0);
    const expectedPowerW = rooms.reduce((sum, r) => sum + Math.round(r.state.expectedRegisteredPowerKw * 1000), 0);
    const instantaneousSavingsW = Math.max(0, expectedPowerW - totalActivePowerW);

    const todaySavingsKwh = roundTo(rooms.reduce((sum, r) => sum + r.cumulativeSavingsKwh, 0), 2);
    const todaySavingsInr = roundTo(rooms.reduce((sum, r) => sum + r.cumulativeCostSavedInr, 0), 2);
    const todayCo2AvoidedKg = roundTo(rooms.reduce((sum, r) => sum + r.cumulativeCo2SavedKg, 0), 2);

    const avgComfort =
      rooms.length > 0
        ? roundTo(rooms.reduce((sum, r) => sum + (r.state.comfortScore || 90), 0) / rooms.length, 1)
        : 95.0;

    return {
      kpis: {
        totalRooms: rooms.length,
        activeRooms: rooms.filter((r) => r.state.occupancyState === 'OCCUPIED').length,
        totalActivePowerW,
        expectedPowerW,
        instantaneousSavingsW,
        todaySavingsKwh,
        todaySavingsInr,
        todayCo2AvoidedKg,
        averageComfortScore: avgComfort,
        activeAlertsCount: rooms.filter((r) => r.unregisteredLoadW > 0).length,
      },
      rooms: rooms.map((r) => ({
        id: r.roomId,
        name: r.name,
        floor: r.floor,
        capacity: r.capacity,
        occupancyState: r.state.occupancyState,
        temperatureC: r.state.temperatureC,
        humidityPct: r.state.humidityPct,
        co2Ppm: r.state.co2Ppm,
        comfortScore: r.state.comfortScore,
        totalPowerW: Math.round(r.state.totalPowerKw * 1000),
      })),
      timestamp: new Date().toISOString(),
    };
  });
}
