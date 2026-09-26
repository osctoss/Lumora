import { FastifyInstance } from 'fastify';
import { simulationState } from '../modules/simulation/simulation-state.js';
import { savingsEngine } from '../modules/savings/savings-engine.js';
import { roundTo } from '../utils/math.js';
import { SIMULATION_DEFAULTS } from '../config/defaults.js';

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/dashboard/overview
  app.get('/overview', async (request) => {
    const rooms = simulationState.getAllRooms();
    const activeSessions = savingsEngine.getAllActiveSessions();

    // Building-level aggregation from room data (Correction §6.2, §38)
    const totalActivePowerW = rooms.reduce((sum, r) => sum + Math.round(r.state.totalPowerKw * 1000), 0);
    const expectedPowerW = rooms.reduce((sum, r) => sum + Math.round(r.state.expectedRegisteredPowerKw * 1000), 0);
    const instantaneousSavingsW = Math.max(0, expectedPowerW - totalActivePowerW);

    const todaySavingsKwh = roundTo(rooms.reduce((sum, r) => sum + r.cumulativeSavingsKwh, 0), 2);
    const todaySavingsInr = roundTo(rooms.reduce((sum, r) => sum + r.cumulativeCostSavedInr, 0), 2);
    const todayCo2AvoidedKg = roundTo(rooms.reduce((sum, r) => sum + r.cumulativeCo2SavedKg, 0), 2);

    // Occupancy aggregation (Correction §6.4)
    const totalOccupancy = rooms.reduce((sum, r) => sum + r.state.occupancyCount, 0);

    // Average CO₂ across rooms with valid readings (Correction §6.4)
    const roomsWithCo2 = rooms.filter(r => r.state.co2Ppm > 0);
    const averageCo2Ppm = roomsWithCo2.length > 0
      ? roundTo(roomsWithCo2.reduce((sum, r) => sum + r.state.co2Ppm, 0) / roomsWithCo2.length, 1)
      : null;

    // Average room temperature (Correction §6.4)
    const averageRoomTemperatureC = rooms.length > 0
      ? roundTo(rooms.reduce((sum, r) => sum + r.state.temperatureC, 0) / rooms.length, 1)
      : null;

    // Environmental temperature — separate from room temp (Correction §6.4)
    const environmentalTemperatureC = SIMULATION_DEFAULTS.OUTDOOR_TEMP_C;

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
        // New KPIs per Correction §6.4
        totalOccupancy,
        averageCo2Ppm,
        averageRoomTemperatureC,
        environmentalTemperatureC,
      },
      rooms: rooms.map((r) => ({
        id: r.roomId,
        name: r.name,
        floor: r.floor,
        capacity: r.capacity,
        powerSupplyOn: r.state.powerSupplyOn,
        occupancyState: r.state.occupancyState,
        occupancyCount: r.state.occupancyCount,
        temperatureC: r.state.temperatureC,
        humidityPct: r.state.humidityPct,
        co2Ppm: r.state.co2Ppm,
        comfortScore: r.state.comfortScore,
        totalPowerW: Math.round(r.state.totalPowerKw * 1000),
        energySavedKwh: roundTo(r.cumulativeSavingsKwh, 2),
        deviceCount: r.devices.size,
      })),
      timestamp: new Date().toISOString(),
    };
  });

  // GET /api/dashboard/building — building dashboard data contract (Correction §53)
  app.get<{ Querystring: { start?: string; end?: string } }>('/building', async (request) => {
    const rooms = simulationState.getAllRooms();

    const totalOccupancy = rooms.reduce((sum, r) => sum + r.state.occupancyCount, 0);
    const roomsWithCo2 = rooms.filter(r => r.state.co2Ppm > 0);
    const averageCo2Ppm = roomsWithCo2.length > 0
      ? roundTo(roomsWithCo2.reduce((sum, r) => sum + r.state.co2Ppm, 0) / roomsWithCo2.length, 1)
      : null;
    const averageRoomTemperatureC = rooms.length > 0
      ? roundTo(rooms.reduce((sum, r) => sum + r.state.temperatureC, 0) / rooms.length, 1)
      : null;

    const consumptionKwh = roundTo(rooms.reduce((sum, r) => sum + r.state.totalPowerKw, 0), 3);
    const savedKwh = roundTo(rooms.reduce((sum, r) => sum + r.cumulativeSavingsKwh, 0), 3);

    return {
      range: {
        start: request.query.start || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: request.query.end || new Date().toISOString(),
      },
      energy: {
        consumptionKwh,
        savedKwh,
      },
      current: {
        occupancy: totalOccupancy,
        averageCo2Ppm,
        averageRoomTemperatureC,
        environmentalTemperatureC: SIMULATION_DEFAULTS.OUTDOOR_TEMP_C,
      },
      rooms: rooms.map(r => ({
        id: r.roomId,
        name: r.name,
        powerSupplyOn: r.state.powerSupplyOn,
        occupancyCount: r.state.occupancyCount,
        temperatureC: r.state.temperatureC,
        co2Ppm: r.state.co2Ppm,
        totalPowerW: Math.round(r.state.totalPowerKw * 1000),
        energySavedKwh: roundTo(r.cumulativeSavingsKwh, 2),
        deviceCount: r.devices.size,
      })),
      timestamp: new Date().toISOString(),
    };
  });
}
