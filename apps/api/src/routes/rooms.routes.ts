import { FastifyInstance } from 'fastify';
import { simulationState } from '../modules/simulation/simulation-state.js';
import { meterEngine } from '../modules/energy/meter-engine.js';
import { eventLogService } from '../modules/events/event-log.service.js';
import { alertService } from '../modules/analytics/alert.service.js';
import { publish } from '../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import { roundTo } from '../utils/math.js';
import { SIMULATION_DEFAULTS } from '../config/defaults.js';
import { randomUUID } from 'crypto';

export async function roomRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/rooms — list all rooms
  app.get('/', async () => {
    const rooms = simulationState.getAllRooms().map((r) => ({
      id: r.roomId,
      buildingId: 'building-demo-01',
      name: r.name,
      floor: r.floor,
      capacity: r.capacity,
      areaSqMeters: r.areaSqMeters,
      status: 'ACTIVE' as const,
      powerSupplyOn: r.state.powerSupplyOn,
      currentOccupancyState: r.state.occupancyState,
      occupancyCount: r.state.occupancyCount,
      currentTemperature: r.state.temperatureC,
      currentHumidity: r.state.humidityPct,
      currentCo2: r.state.co2Ppm,
      currentLux: r.state.ambientLightLux,
      currentComfortScore: r.state.comfortScore,
      totalActivePowerW: Math.round(r.state.totalPowerKw * 1000),
      totalExpectedPowerW: Math.round(r.state.expectedRegisteredPowerKw * 1000),
      unaccountedPowerW: Math.round(r.state.unaccountedPowerKw * 1000),
      energySavedKwh: r.cumulativeSavingsKwh,
      deviceCount: r.devices.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    return { rooms, total: rooms.length };
  });

  // POST /api/rooms — create a new room (Correction §12)
  app.post<{ Body: { name: string; floor?: number; capacity?: number } }>(
    '/',
    async (request, reply) => {
      const { name, floor, capacity } = request.body || {};

      if (!name || name.trim().length === 0) {
        return reply.status(400).send({ error: 'Room name is required' });
      }

      const roomId = randomUUID();
      const room = simulationState.createRoom({
        id: roomId,
        name: name.trim(),
        floor: floor ?? 1,
        capacity: capacity ?? 30,
      });

      publish(EventTypes.ROOM_CREATED, roomId, {
        roomId,
        name: room.name,
        floor: room.floor,
        capacity: room.capacity,
      });

      // Persist to PostgreSQL asynchronously
      import('../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
        const connected = await checkDatabaseConnection();
        if (!connected) return;
        try {
          // Find or create building
          let building = await prisma.building.findFirst();
          if (!building) {
            building = await prisma.building.create({
              data: { name: 'Smart Building', address: 'Demo Campus' },
            });
          }

          await prisma.room.create({
            data: {
              id: roomId,
              buildingId: building.id,
              name: room.name,
              floor: room.floor,
              capacity: room.capacity,
              areaSqMeters: room.areaSqMeters,
              status: 'ACTIVE',
              powerSupplyOn: true,
              currentOccupancyState: 'VACANT',
              currentTemperature: 25.0,
              currentHumidity: 50.0,
              currentCo2: 450.0,
              currentLux: 500.0,
              totalActivePowerW: 0,
              totalExpectedPowerW: 0,
              unaccountedPowerW: 0,
            },
          });

          // Create auto sensors in DB
          const sensorTypes = [
            { suffix: 'pir', name: 'PIR Motion Sensor', type: 'OCCUPANCY_PIR' as const, unit: 'boolean' },
            { suffix: 'mmwave', name: 'mmWave Micro-Presence', type: 'OCCUPANCY_MMWAVE' as const, unit: 'boolean' },
            { suffix: 'temp', name: 'Temperature Sensor', type: 'TEMPERATURE' as const, unit: '°C' },
            { suffix: 'humidity', name: 'Humidity Sensor', type: 'HUMIDITY' as const, unit: '%' },
            { suffix: 'co2', name: 'CO2 Air Quality Sensor', type: 'CO2' as const, unit: 'ppm' },
            { suffix: 'light', name: 'Ambient Light Sensor', type: 'AMBIENT_LIGHT' as const, unit: 'lux' },
            { suffix: 'meter', name: 'Smart Submeter Panel', type: 'ENERGY_METER' as const, unit: 'W' },
          ];

          for (const st of sensorTypes) {
            await prisma.sensor.create({
              data: {
                id: `sensor-${st.suffix}-${roomId}`,
                roomId,
                name: st.name,
                type: st.type,
                unit: st.unit,
              },
            });
          }

          // Create room settings
          await prisma.roomSettings.create({
            data: { roomId },
          });
        } catch {
          // Non-blocking fallback
        }
      });

      return {
        success: true,
        room: {
          id: roomId,
          name: room.name,
          floor: room.floor,
          capacity: room.capacity,
          powerSupplyOn: room.state.powerSupplyOn,
          deviceCount: 0,
          occupancyCount: 0,
        },
      };
    },
  );

  // GET /api/rooms/:id — get single room details
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
      energySavedKwh: room.cumulativeSavingsKwh,
    };
  });

  // POST /api/rooms/:id/power/on — turn room power ON (Correction §13)
  app.post<{ Params: { id: string } }>('/:id/power/on', async (request, reply) => {
    const room = simulationState.getRoom(request.params.id);
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    simulationState.setRoomPowerSupply(request.params.id, true);

    // Restore Freezer to ON automatically (Correction §13)
    for (const device of room.devices.values()) {
      if (device.type === 'FREEZER') {
        simulationState.updateDevice(room.roomId, device.id, {
          currentState: 'COMPRESSOR_ON',
          isPoweredOn: true,
          currentPowerW: device.ratedPowerW,
        });
      }
    }

    publish(EventTypes.ROOM_POWER_ON, room.roomId, {
      roomId: room.roomId,
      roomName: room.name,
      timestamp: new Date().toISOString(),
    });

    // Persist to PostgreSQL
    import('../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.room.update({
          where: { id: request.params.id },
          data: { powerSupplyOn: true },
        });
      } catch {}
    });

    return { success: true, powerSupplyOn: true };
  });

  // POST /api/rooms/:id/power/off — turn room power OFF (Correction §13)
  app.post<{ Params: { id: string } }>('/:id/power/off', async (request, reply) => {
    const room = simulationState.getRoom(request.params.id);
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    simulationState.setRoomPowerSupply(request.params.id, false);

    publish(EventTypes.ROOM_POWER_OFF, room.roomId, {
      roomId: room.roomId,
      roomName: room.name,
      timestamp: new Date().toISOString(),
    });

    // Persist to PostgreSQL
    import('../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.room.update({
          where: { id: request.params.id },
          data: { powerSupplyOn: false },
        });
      } catch {}
    });

    return { success: true, powerSupplyOn: false };
  });

  // POST /api/rooms/:id/people — add a person (Correction §20)
  app.post<{ Params: { id: string }; Body: { displayName?: string } }>(
    '/:id/people',
    async (request, reply) => {
      const room = simulationState.getRoom(request.params.id);
      if (!room) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      const personId = randomUUID();
      const displayName = request.body?.displayName || `Person ${room.people.size + 1}`;

      const person = {
        id: personId,
        roomId: room.roomId,
        displayName,
        active: true,
        heatGainW: 100,
        co2GenerationPpmPerHour: 38000,
      };

      simulationState.addPerson(room.roomId, person);

      const newCount = simulationState.getPeople(room.roomId).filter(p => p.active).length;

      // Update occupancy state
      simulationState.updateRoomState(room.roomId, {
        occupancyCount: newCount,
        occupancyState: 'OCCUPIED',
        vacancyStartedAt: null,
        peoplePresent: simulationState.getPeople(room.roomId).filter(p => p.active).map(p => p.id),
      });

      publish(EventTypes.PERSON_ADDED, room.roomId, {
        personId,
        displayName,
        roomId: room.roomId,
        newOccupancyCount: newCount,
      });

      publish(EventTypes.OCCUPANCY_CHANGED, room.roomId, {
        roomId: room.roomId,
        from: newCount - 1,
        to: newCount,
        reason: 'PERSON_ENTERED',
      });

      // Persist to PostgreSQL
      import('../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
        const connected = await checkDatabaseConnection();
        if (!connected) return;
        try {
          await prisma.person.create({
            data: {
              id: personId,
              roomId: room.roomId,
              displayName,
              active: true,
              heatGainW: 100,
              co2GenerationPpmPerHour: 38000,
            },
          });

          await prisma.occupancyEvent.create({
            data: {
              roomId: room.roomId,
              personId,
              eventType: 'PERSON_ENTERED',
              occupancyCount: newCount,
              state: 'OCCUPIED',
            },
          });
        } catch {}
      });

      return { success: true, person, occupancyCount: newCount };
    },
  );

  // DELETE /api/rooms/:id/people/:personId — remove a person (Correction §20)
  app.delete<{ Params: { id: string; personId: string } }>(
    '/:id/people/:personId',
    async (request, reply) => {
      const room = simulationState.getRoom(request.params.id);
      if (!room) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      const person = room.people.get(request.params.personId);
      if (!person) {
        return reply.status(404).send({ error: 'Person not found' });
      }

      const prevCount = simulationState.getPeople(room.roomId).filter(p => p.active).length;
      simulationState.removePerson(room.roomId, request.params.personId);
      const newCount = simulationState.getPeople(room.roomId).filter(p => p.active).length;

      // Update occupancy state
      const newState: any = {
        occupancyCount: newCount,
        peoplePresent: simulationState.getPeople(room.roomId).filter(p => p.active).map(p => p.id),
      };
      if (newCount === 0) {
        newState.occupancyState = 'VACANCY_PENDING';
        newState.vacancyStartedAt = new Date().toISOString();
      }

      simulationState.updateRoomState(room.roomId, newState);

      publish(EventTypes.PERSON_REMOVED, room.roomId, {
        personId: request.params.personId,
        displayName: person.displayName,
        roomId: room.roomId,
        newOccupancyCount: newCount,
      });

      publish(EventTypes.OCCUPANCY_CHANGED, room.roomId, {
        roomId: room.roomId,
        from: prevCount,
        to: newCount,
        reason: 'PERSON_EXITED',
      });

      // Persist to PostgreSQL
      import('../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
        const connected = await checkDatabaseConnection();
        if (!connected) return;
        try {
          await prisma.person.update({
            where: { id: request.params.personId },
            data: { active: false, leftAt: new Date() },
          });

          await prisma.occupancyEvent.create({
            data: {
              roomId: room.roomId,
              personId: request.params.personId,
              eventType: 'PERSON_EXITED',
              occupancyCount: newCount,
              state: newCount === 0 ? 'VACANCY_PENDING' : 'OCCUPIED',
            },
          });
        } catch {}
      });

      return { success: true, occupancyCount: newCount };
    },
  );

  // POST /api/rooms/:id/devices — add a device to room (Correction §22, §23)
  app.post<{
    Params: { id: string };
    Body: { name: string; type: string; ratedPowerW: number; compressorOffPowerW?: number };
  }>(
    '/:id/devices',
    async (request, reply) => {
      const room = simulationState.getRoom(request.params.id);
      if (!room) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      const { name, type, ratedPowerW, compressorOffPowerW } = request.body || {};

      if (!name || !type || !ratedPowerW || ratedPowerW <= 0) {
        return reply.status(400).send({ error: 'name, type, and ratedPowerW (>0) are required' });
      }

      const deviceId = randomUUID();
      const isProtected = type === 'FREEZER' || type === 'LAPTOP_PORT';
      const isControllable = !isProtected;
      const standbyPowerW = type === 'AC' || type === 'FREEZER' ? (compressorOffPowerW ?? ratedPowerW * 0.05) : 0;

      const device = {
        id: deviceId,
        roomId: room.roomId,
        name,
        type: type as any,
        ratedPowerW,
        standbyPowerW,
        currentState: 'OFF' as any,
        isPoweredOn: false,
        currentPowerW: 0,
        cumulativeEnergyKwh: 0,
        isProtected,
        isControllable,
        priority: isProtected ? 10 : 1,
        lastStateChange: new Date().toISOString(),
        policy: {
          turnOffOnVacancy: !isProtected,
          allowPreCool: type === 'AC',
          priority: isProtected ? 10 : 1,
        },
      };

      simulationState.addDevice(room.roomId, device);

      publish(EventTypes.DEVICE_ADDED, room.roomId, {
        deviceId,
        name,
        type,
        ratedPowerW,
        roomId: room.roomId,
      });

      // Persist to PostgreSQL
      import('../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
        const connected = await checkDatabaseConnection();
        if (!connected) return;
        try {
          await prisma.device.create({
            data: {
              id: deviceId,
              roomId: room.roomId,
              name,
              type: type as any,
              ratedPowerW,
              standbyPowerW,
              currentState: 'OFF',
              isPoweredOn: false,
              currentPowerW: 0,
              isProtected,
              isControllable,
              priority: isProtected ? 10 : 1,
            },
          });
          await prisma.devicePolicy.create({
            data: {
              deviceId,
              turnOffOnVacancy: !isProtected,
              allowPreCool: type === 'AC',
              priority: isProtected ? 10 : 1,
            },
          });
        } catch {}
      });

      return { success: true, device };
    },
  );

  // POST /api/rooms/:id/temperature — set room temperature manually (Correction §18)
  app.post<{ Params: { id: string }; Body: { temperatureC: number } }>(
    '/:id/temperature',
    async (request, reply) => {
      const room = simulationState.getRoom(request.params.id);
      if (!room) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      const { temperatureC } = request.body || {};
      if (temperatureC === undefined || temperatureC < 0 || temperatureC > 50) {
        return reply.status(400).send({ error: 'Temperature must be between 0 and 50°C' });
      }

      const prevTemp = room.state.temperatureC;
      simulationState.updateRoomState(room.roomId, { temperatureC });

      publish(EventTypes.TEMPERATURE_CHANGED, room.roomId, {
        roomId: room.roomId,
        from: prevTemp,
        to: temperatureC,
        source: 'MANUAL',
      });

      return { success: true, temperatureC };
    },
  );

  // GET /api/rooms/:id/energy — room energy consumption intervals & cumulative (Correction §38, §56)
  app.get<{ Params: { id: string }; Querystring: { start?: string; end?: string } }>(
    '/:id/energy',
    async (request, reply) => {
      const room = simulationState.getRoom(request.params.id);
      if (!room) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      const start = request.query.start ? new Date(request.query.start) : undefined;
      const end = request.query.end ? new Date(request.query.end) : undefined;

      const result = await meterEngine.getRoomEnergy(room.roomId, start, end);
      return result;
    },
  );

  // GET /api/rooms/:id/events — paginated events for a room (Correction §56)
  app.get<{ Params: { id: string }; Querystring: { limit?: number; offset?: number } }>(
    '/:id/events',
    async (request, reply) => {
      const room = simulationState.getRoom(request.params.id);
      if (!room) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      const limit = Number(request.query.limit) || 50;
      const offset = Number(request.query.offset) || 0;
      return await eventLogService.getEventsPaginated({ roomId: room.roomId, limit, offset });
    },
  );

  // GET /api/rooms/:id/alerts — active alerts for a room (Correction §56)
  app.get<{ Params: { id: string }; Querystring: { all?: boolean } }>(
    '/:id/alerts',
    async (request, reply) => {
      const room = simulationState.getRoom(request.params.id);
      if (!room) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      const unresolvedOnly = request.query.all !== true;
      const alerts = alertService.getRoomAlerts(room.roomId, unresolvedOnly);
      return { alerts, total: alerts.length };
    },
  );

  // GET /api/rooms/:id/dashboard — room dashboard data contract (Correction §54)
  app.get<{ Params: { id: string }; Querystring: { start?: string; end?: string } }>(
    '/:id/dashboard',
    async (request, reply) => {
      const room = simulationState.getRoom(request.params.id);
      if (!room) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      const startDate = request.query.start ? new Date(request.query.start) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = request.query.end ? new Date(request.query.end) : new Date();

      const roomEnergy = await meterEngine.getRoomEnergy(room.roomId, startDate, endDate);
      const devices = simulationState.getDevices(room.roomId);
      const totalPowerW = Math.round(room.state.totalPowerKw * 1000);
      const expectedPowerW = Math.round(room.state.expectedRegisteredPowerKw * 1000);
      const unaccountedPowerW = Math.max(0, totalPowerW - expectedPowerW);

      const alerts = alertService.getRoomAlerts(room.roomId, true);
      const recentEvents = eventLogService.getRecentEvents(15, room.roomId);

      return {
        room: {
          id: room.roomId,
          name: room.name,
          floor: room.floor,
          capacity: room.capacity,
          powerSupplyOn: room.state.powerSupplyOn,
          occupancyState: room.state.occupancyState,
          deviceCount: devices.length,
        },
        range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        energy: {
          consumptionKwh: roomEnergy.consumptionKwh,
          savedKwh: roundTo(room.cumulativeSavingsKwh, 3),
          expectedKwh: roundTo(room.state.expectedRegisteredPowerKw, 3),
          unaccountedKwh: roundTo(unaccountedPowerW / 1000, 3),
        },
        current: {
          occupancy: room.state.occupancyCount,
          temperatureC: room.state.temperatureC,
          humidityPercent: room.state.humidityPct,
          co2Ppm: room.state.co2Ppm,
          ambientLux: room.state.ambientLightLux,
          environmentalTemperatureC: room.state.outsideTemperatureC || SIMULATION_DEFAULTS.OUTDOOR_TEMP_C,
          currentPowerW: totalPowerW,
        },
        devices: devices.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          currentState: d.currentState,
          isPoweredOn: d.isPoweredOn,
          currentPowerW: d.currentPowerW,
          ratedPowerW: d.ratedPowerW,
          standbyPowerW: d.standbyPowerW,
          isProtected: d.isProtected,
        })),
        alerts: alerts.map((a) => ({
          id: a.id,
          roomId: a.roomId,
          type: a.alertType,
          severity: a.severity,
          message: a.message,
          reason: a.reason,
          timestamp: a.timestamp,
        })),
        recentEvents: recentEvents.map((e) => ({
          id: e.eventId,
          roomId: e.roomId,
          eventType: e.eventType,
          source: e.source,
          timestamp: e.timestamp,
          payload: e.payload,
        })),
        trend: roomEnergy.intervals.map((item) => ({
          timestamp: item.intervalEnd,
          consumptionKwh: item.energyKwh,
          averagePowerW: item.averagePowerW,
        })),
      };
    },
  );

  // GET /api/rooms/:id/virtual — virtual room state data contract (Correction §55)
  app.get<{ Params: { id: string } }>('/:id/virtual', async (request, reply) => {
    const room = simulationState.getRoom(request.params.id);
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    const devices = simulationState.getDevices(room.roomId);
    const people = simulationState.getPeople(room.roomId).filter((p) => p.active);

    return {
      room: {
        id: room.roomId,
        name: room.name,
        floor: room.floor,
        capacity: room.capacity,
        powerSupplyOn: room.state.powerSupplyOn,
        occupancyState: room.state.occupancyState,
        acSetpointC: room.state.acSetpointC || 24.0,
      },
      sensors: {
        temperatureC: room.state.temperatureC,
        humidityPercent: room.state.humidityPct,
        co2Ppm: room.state.co2Ppm,
        occupancy: room.state.occupancyCount,
        ambientLux: room.state.ambientLightLux,
        environmentalTemperatureC: room.state.outsideTemperatureC || SIMULATION_DEFAULTS.OUTDOOR_TEMP_C,
      },
      powerSupply: {
        isOn: room.state.powerSupplyOn,
      },
      people: people.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        active: p.active,
      })),
      devices: devices.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        currentState: d.currentState,
        isPoweredOn: d.isPoweredOn,
        currentPowerW: d.currentPowerW,
        ratedPowerW: d.ratedPowerW,
        standbyPowerW: d.standbyPowerW,
        isProtected: d.isProtected,
        isControllable: d.isControllable,
      })),
    };
  });
}
