import { FastifyInstance } from 'fastify';
import { simulationClock } from '../modules/simulation/simulation-clock.js';
import { triggerScenario } from '../modules/simulation/scenarios/index.js';

export async function simulationRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/simulation/state
  app.get('/state', async () => {
    return simulationClock.getState();
  });

  // POST /api/simulation/speed
  app.post<{ Body: { speed: number } }>('/speed', async (request, reply) => {
    const { speed } = request.body || {};
    if (![1, 2, 5, 10, 30, 60].includes(speed)) {
      return reply.status(400).send({ error: 'Invalid speed. Supported: 1, 2, 5, 10, 30, 60' });
    }
    simulationClock.setSpeed(speed);
    return simulationClock.getState();
  });

  // POST /api/simulation/pause
  app.post('/pause', async () => {
    simulationClock.pause();
    return simulationClock.getState();
  });

  // POST /api/simulation/resume
  app.post('/resume', async () => {
    simulationClock.resume();
    return simulationClock.getState();
  });

  // POST /api/simulation/reset
  app.post('/reset', async () => {
    simulationClock.reset();
    return simulationClock.getState();
  });

  // POST /api/simulation/scenario
  app.post<{ Body: { scenario: string; roomId?: string; params?: Record<string, unknown> } }>(
    '/scenario',
    async (request, reply) => {
      const { scenario, roomId = 'room-101', params } = request.body || {};
      if (!scenario) {
        return reply.status(400).send({ error: 'Scenario name is required' });
      }
      triggerScenario(scenario, roomId, params);
      return { success: true, scenario, roomId, timestamp: new Date().toISOString() };
    },
  );
}
