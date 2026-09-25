import { FastifyInstance } from 'fastify';
import { aiService } from '../modules/ai/ai.service.js';

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { alertType: string; details?: Record<string, unknown> } }>(
    '/explain',
    async (request, reply) => {
      const { alertType, details } = request.body || {};
      if (!alertType) {
        return reply.status(400).send({ error: 'alertType is required' });
      }

      const explanation = await aiService.explainAlert(alertType, details);
      return explanation;
    },
  );
}
