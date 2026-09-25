import { FastifyInstance } from 'fastify';
import { savingsEngine } from '../modules/savings/savings-engine.js';
import { simulationState } from '../modules/simulation/simulation-state.js';
import { roundTo } from '../utils/math.js';

export async function savingsRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/savings
  app.get('/', async () => {
    const rooms = simulationState.getAllRooms();
    const activeSessions = savingsEngine.getAllActiveSessions();

    const totalSavingsKwh = roundTo(rooms.reduce((sum, r) => sum + r.cumulativeSavingsKwh, 0), 2);
    const totalCostSavedInr = roundTo(rooms.reduce((sum, r) => sum + r.cumulativeCostSavedInr, 0), 2);
    const totalCo2SavedKg = roundTo(rooms.reduce((sum, r) => sum + r.cumulativeCo2SavedKg, 0), 2);

    return {
      totalSavingsKwh,
      totalCostSavedInr,
      totalCo2SavedKg,
      activeSessionsCount: activeSessions.length,
      sessions: activeSessions,
    };
  });

  // GET /api/savings/sessions
  app.get('/sessions', async () => {
    return {
      activeSessions: savingsEngine.getAllActiveSessions(),
    };
  });
}
