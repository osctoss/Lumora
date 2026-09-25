import { FastifyInstance } from 'fastify';
import { simulationState } from '../modules/simulation/simulation-state.js';
import { publish } from '../websocket/event-publisher.js';
import { EventTypes, DeviceState } from '@intellisave/shared';

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/devices/room/:roomId
  app.get<{ Params: { roomId: string } }>('/room/:roomId', async (request) => {
    const devices = simulationState.getDevices(request.params.roomId);
    return { devices, total: devices.length };
  });

  // PATCH /api/devices/:id/state
  app.patch<{
    Params: { id: string };
    Body: { state: DeviceState; roomId?: string; reason?: string };
  }>('/:id/state', async (request, reply) => {
    const { id } = request.params;
    const { state, roomId = 'room-101', reason = 'Manual user override' } = request.body || {};

    const device = simulationState.getDevice(roomId, id);
    if (!device) {
      return reply.status(404).send({ error: 'Device not found' });
    }

    // Safety constraint: Protected devices cannot be manually powered off via simple toggle
    if (device.isProtected && state === 'OFF') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Device ${device.name} is a PROTECTED load and cannot be switched OFF directly`,
      });
    }

    const isPoweredOn = state !== 'OFF';
    const previousState = device.currentState;

    const updated = simulationState.updateDevice(roomId, id, {
      currentState: state,
      isPoweredOn,
      manualOverride: true,
    });

    publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
      deviceId: id,
      previousState,
      newState: state,
      source: 'USER',
      reason,
      powerW: updated?.currentPowerW,
    });

    return { success: true, device: updated };
  });

  // PATCH /api/devices/:id/policy
  app.patch<{
    Params: { id: string };
    Body: { roomId?: string; turnOffOnVacancy?: boolean; allowPreCool?: boolean; priority?: number };
  }>('/:id/policy', async (request, reply) => {
    const { id } = request.params;
    const { roomId = 'room-101', turnOffOnVacancy, allowPreCool, priority } = request.body || {};

    const device = simulationState.getDevice(roomId, id);
    if (!device) {
      return reply.status(404).send({ error: 'Device not found' });
    }

    const updated = simulationState.updateDevice(roomId, id, {
      policy: {
        ...device.policy,
        turnOffOnVacancy: turnOffOnVacancy ?? device.policy?.turnOffOnVacancy ?? true,
        allowPreCool: allowPreCool ?? device.policy?.allowPreCool ?? false,
        priority: priority ?? device.policy?.priority ?? 1,
      },
    });

    publish(EventTypes.DEVICE_UPDATED, roomId, {
      deviceId: id,
      policy: updated?.policy,
    });

    return { success: true, device: updated };
  });
}
