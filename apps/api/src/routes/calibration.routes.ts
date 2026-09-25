import { FastifyInstance } from 'fastify';
import { calibrationEngine } from '../modules/calibration/calibration-engine.js';

export async function calibrationRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/calibration/start
  app.post<{ Body: { roomId?: string } }>('/start', async (request) => {
    const { roomId = 'room-101' } = request.body || {};
    const session = calibrationEngine.startCalibration(roomId);
    return { success: true, session };
  });

  // GET /api/calibration/:roomId
  app.get<{ Params: { roomId: string } }>('/:roomId', async (request) => {
    const session = calibrationEngine.getSession(request.params.roomId);
    return { session: session || { status: 'NOT_CALIBRATED' } };
  });
}
