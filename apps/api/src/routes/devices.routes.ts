import { FastifyInstance } from 'fastify';
import { simulationState } from '../modules/simulation/simulation-state.js';
import { publish } from '../websocket/event-publisher.js';
import { EventTypes, DeviceState } from '@intellisave/shared';

function findDeviceAndRoom(deviceId: string, preferredRoomId?: string) {
  if (preferredRoomId) {
    const d = simulationState.getDevice(preferredRoomId, deviceId);
    if (d) return { device: d, roomId: preferredRoomId };
  }
  for (const r of simulationState.getAllRooms()) {
    const d = simulationState.getDevice(r.roomId, deviceId);
    if (d) return { device: d, roomId: r.roomId };
  }
  return null;
}

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/devices/room/:roomId
  app.get<{ Params: { roomId: string } }>('/room/:roomId', async (request) => {
    const devices = simulationState.getDevices(request.params.roomId);
    return { devices, total: devices.length };
  });

  // PATCH /api/devices/:id — configure device properties (Correction §25, §26)
  app.patch<{
    Params: { id: string };
    Body: {
      roomId?: string;
      name?: string;
      ratedPowerW?: number;
      standbyPowerW?: number;
      acSetpointC?: number;
    };
  }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const { roomId: reqRoomId, name, ratedPowerW, standbyPowerW, acSetpointC } = request.body || {};

    const found = findDeviceAndRoom(id, reqRoomId);
    if (!found) {
      return reply.status(404).send({ error: 'Device not found' });
    }

    const { device, roomId } = found;

    // AC Setpoint validation: 18°C to 28°C (Correction §26)
    if (acSetpointC !== undefined) {
      if (acSetpointC < 18 || acSetpointC > 28) {
        return reply.status(400).send({
          error: 'ValidationError',
          message: 'AC setpoint must be between 18°C and 28°C',
        });
      }
      simulationState.updateRoomState(roomId, { acSetpointC });
      publish(EventTypes.DEVICE_UPDATED, roomId, {
        deviceId: id,
        acSetpointC,
      });
    }

    const updates: Partial<typeof device> = {};
    if (name !== undefined) updates.name = name.trim();
    if (ratedPowerW !== undefined && ratedPowerW > 0) updates.ratedPowerW = ratedPowerW;
    if (standbyPowerW !== undefined && standbyPowerW >= 0) updates.standbyPowerW = standbyPowerW;

    const updated = simulationState.updateDevice(roomId, id, updates);

    publish(EventTypes.DEVICE_UPDATED, roomId, {
      deviceId: id,
      ...updates,
    });

    // Persist to PostgreSQL asynchronously
    import('../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.device.update({
          where: { id },
          data: {
            name: updates.name,
            ratedPowerW: updates.ratedPowerW,
            standbyPowerW: updates.standbyPowerW,
          },
        });
      } catch {
        // Non-blocking fallback
      }
    });

    return { success: true, device: updated };
  });

  // POST /api/devices/:id/on — turn device ON (Correction §31, §56)
  app.post<{
    Params: { id: string };
    Body?: { roomId?: string; reason?: string };
  }>('/:id/on', async (request, reply) => {
    const { id } = request.params;
    const { roomId: reqRoomId, reason = 'User switched ON' } = request.body || {};

    const found = findDeviceAndRoom(id, reqRoomId);
    if (!found) {
      return reply.status(404).send({ error: 'Device not found' });
    }

    const { device, roomId } = found;
    const room = simulationState.getRoom(roomId);

    if (room && !room.state.powerSupplyOn) {
      return reply.status(400).send({
        error: 'RoomPowerOff',
        message: 'Cannot turn ON device while room electrical power supply is OFF',
      });
    }

    const previousState = device.currentState;
    const newState: DeviceState =
      device.type === 'AC'
        ? (room && room.state.temperatureC > room.state.acSetpointC ? 'COMPRESSOR_ON' : 'COMPRESSOR_OFF')
        : device.type === 'FREEZER'
        ? 'COMPRESSOR_ON'
        : 'ON';

    const updated = simulationState.updateDevice(roomId, id, {
      currentState: newState,
      isPoweredOn: true,
      manualOverride: true,
    });

    publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
      deviceId: id,
      previousState,
      newState,
      source: 'USER',
      reason,
      powerW: updated?.currentPowerW,
    });

    publish(EventTypes.DEVICE_TURNED_ON, roomId, {
      deviceId: id,
      source: 'USER',
      state: newState,
    });

    // Persist to PostgreSQL
    import('../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.device.update({
          where: { id },
          data: {
            currentState: newState as any,
            isPoweredOn: true,
            currentPowerW: updated?.currentPowerW ?? device.currentPowerW,
            lastStateChange: new Date(),
          },
        });
      } catch {}
    });

    return { success: true, device: updated };
  });

  // POST /api/devices/:id/off — turn device OFF (Correction §31, §56)
  app.post<{
    Params: { id: string };
    Body?: { roomId?: string; reason?: string };
  }>('/:id/off', async (request, reply) => {
    const { id } = request.params;
    const { roomId: reqRoomId, reason = 'User switched OFF' } = request.body || {};

    const found = findDeviceAndRoom(id, reqRoomId);
    if (!found) {
      return reply.status(404).send({ error: 'Device not found' });
    }

    const { device, roomId } = found;

    if (device.isProtected) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `Device ${device.name} is a PROTECTED load and cannot be switched OFF directly`,
      });
    }

    const previousState = device.currentState;
    const updated = simulationState.updateDevice(roomId, id, {
      currentState: 'OFF',
      isPoweredOn: false,
      currentPowerW: 0,
      manualOverride: true,
    });

    publish(EventTypes.DEVICE_STATE_CHANGED, roomId, {
      deviceId: id,
      previousState,
      newState: 'OFF',
      source: 'USER',
      reason,
      powerW: 0,
    });

    publish(EventTypes.DEVICE_TURNED_OFF, roomId, {
      deviceId: id,
      source: 'USER',
    });

    // Persist to PostgreSQL
    import('../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.device.update({
          where: { id },
          data: {
            currentState: 'OFF' as any,
            isPoweredOn: false,
            currentPowerW: 0,
            lastStateChange: new Date(),
          },
        });
      } catch {}
    });

    return { success: true, device: updated };
  });

  // DELETE /api/devices/:id — delete device (Correction §56)
  app.delete<{
    Params: { id: string };
    Body?: { roomId?: string };
  }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const { roomId: reqRoomId } = request.body || {};

    const found = findDeviceAndRoom(id, reqRoomId);
    if (!found) {
      return reply.status(404).send({ error: 'Device not found' });
    }

    const { roomId } = found;
    simulationState.removeDevice(roomId, id);

    publish(EventTypes.DEVICE_REMOVED, roomId, {
      deviceId: id,
      roomId,
    });

    // Persist to PostgreSQL
    import('../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.device.delete({
          where: { id },
        });
      } catch {}
    });

    return { success: true, message: `Device ${id} deleted` };
  });

  // PATCH /api/devices/:id/state
  app.patch<{
    Params: { id: string };
    Body: { state: DeviceState; roomId?: string; reason?: string };
  }>('/:id/state', async (request, reply) => {
    const { id } = request.params;
    const { state, roomId: reqRoomId, reason = 'Manual user override' } = request.body || {};

    const found = findDeviceAndRoom(id, reqRoomId);
    if (!found) {
      return reply.status(404).send({ error: 'Device not found' });
    }

    const { device, roomId } = found;

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

    // Persist to PostgreSQL asynchronously
    import('../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.device.update({
          where: { id },
          data: {
            currentState: state as any,
            isPoweredOn,
            currentPowerW: updated?.currentPowerW ?? device.currentPowerW,
            lastStateChange: new Date(),
          },
        });

        await prisma.deviceStateEvent.create({
          data: {
            deviceId: id,
            previousState: previousState as any,
            newState: state as any,
            powerW: updated?.currentPowerW ?? device.currentPowerW,
            source: 'USER',
            reason,
          },
        });
      } catch {
        // Non-blocking fallback
      }
    });

    return { success: true, device: updated };
  });

  // PATCH /api/devices/:id/policy
  app.patch<{
    Params: { id: string };
    Body: { roomId?: string; turnOffOnVacancy?: boolean; allowPreCool?: boolean; priority?: number };
  }>('/:id/policy', async (request, reply) => {
    const { id } = request.params;
    const { roomId: reqRoomId, turnOffOnVacancy, allowPreCool, priority } = request.body || {};

    const found = findDeviceAndRoom(id, reqRoomId);
    if (!found) {
      return reply.status(404).send({ error: 'Device not found' });
    }

    const { device, roomId } = found;

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

    // Persist policy to PostgreSQL asynchronously
    import('../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.devicePolicy.upsert({
          where: { deviceId: id },
          update: {
            turnOffOnVacancy: updated?.policy?.turnOffOnVacancy ?? true,
            allowPreCool: updated?.policy?.allowPreCool ?? false,
            priority: updated?.policy?.priority ?? 1,
          },
          create: {
            deviceId: id,
            turnOffOnVacancy: updated?.policy?.turnOffOnVacancy ?? true,
            allowPreCool: updated?.policy?.allowPreCool ?? false,
            priority: updated?.policy?.priority ?? 1,
          },
        });
      } catch {
        // Non-blocking fallback
      }
    });

    return { success: true, device: updated };
  });
}
