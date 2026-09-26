import type {
  RoomSimulationState,
  DeviceDto,
  PersonDto,
  SensorDto,
  OccupancyState,
  DeviceState,
} from '@intellisave/shared';
import { simulationClock } from './simulation-clock.js';
import { SIMULATION_DEFAULTS } from '../../config/defaults.js';

export interface RoomSimulationInternal {
  roomId: string;
  name: string;
  floor: number;
  capacity: number;
  areaSqMeters: number;
  state: RoomSimulationState;
  devices: Map<string, DeviceDto>;
  people: Map<string, PersonDto>;
  sensors: Map<string, SensorDto>;
  unregisteredLoadW: number;
  unregisteredLoadStartedAt: string | null;
  cumulativeSavingsKwh: number;
  cumulativeCostSavedInr: number;
  cumulativeCo2SavedKg: number;
}

class SimulationStateManager {
  private rooms: Map<string, RoomSimulationInternal> = new Map();

  // ─── Room Creation ──────────────────────────────────────────
  createRoom(options: {
    id?: string;
    name: string;
    floor?: number;
    capacity?: number;
    areaSqMeters?: number;
  }): RoomSimulationInternal {
    const roomId = options.id || `room-${Date.now()}`;
    const nowIso = simulationClock.getSimulatedTime().toISOString();

    const state: RoomSimulationState = {
      roomId,
      powerSupplyOn: true,
      occupancyCount: 0,
      peoplePresent: [],
      temperatureC: 25.0, // Correction §67: default 25°C
      humidityPct: SIMULATION_DEFAULTS.INITIAL_ROOM_HUMIDITY_PCT,
      co2Ppm: SIMULATION_DEFAULTS.INITIAL_ROOM_CO2_PPM,
      ambientLightLux: SIMULATION_DEFAULTS.INITIAL_ROOM_LUX,
      outsideTemperatureC: SIMULATION_DEFAULTS.OUTDOOR_TEMP_C,
      acSetpointC: 24.0,
      hvacDemand: 0,
      comfortScore: 95.0,
      occupancyState: 'VACANT',
      vacancyStartedAt: null,
      vacancyDelaySeconds: 300,
      totalPowerKw: 0,
      expectedRegisteredPowerKw: 0,
      unaccountedPowerKw: 0,
      simulationTimestamp: nowIso,
    };

    // Auto-create virtual sensors (Correction §12: auto sensors)
    const sensors = new Map<string, SensorDto>();
    sensors.set(`sensor-pir-${roomId}`, { id: `sensor-pir-${roomId}`, roomId, name: 'PIR Motion Sensor', type: 'OCCUPANCY_PIR', unit: 'boolean', sampleIntervalSec: 5, lastValue: 0, lastUpdatedAt: nowIso });
    sensors.set(`sensor-mmwave-${roomId}`, { id: `sensor-mmwave-${roomId}`, roomId, name: 'mmWave Micro-Presence', type: 'OCCUPANCY_MMWAVE', unit: 'boolean', sampleIntervalSec: 2, lastValue: 0, lastUpdatedAt: nowIso });
    sensors.set(`sensor-temp-${roomId}`, { id: `sensor-temp-${roomId}`, roomId, name: 'Temperature Sensor', type: 'TEMPERATURE', unit: '°C', sampleIntervalSec: 10, lastValue: 25.0, lastUpdatedAt: nowIso });
    sensors.set(`sensor-humidity-${roomId}`, { id: `sensor-humidity-${roomId}`, roomId, name: 'Humidity Sensor', type: 'HUMIDITY', unit: '%', sampleIntervalSec: 10, lastValue: SIMULATION_DEFAULTS.INITIAL_ROOM_HUMIDITY_PCT, lastUpdatedAt: nowIso });
    sensors.set(`sensor-co2-${roomId}`, { id: `sensor-co2-${roomId}`, roomId, name: 'CO2 Air Quality Sensor', type: 'CO2', unit: 'ppm', sampleIntervalSec: 10, lastValue: SIMULATION_DEFAULTS.INITIAL_ROOM_CO2_PPM, lastUpdatedAt: nowIso });
    sensors.set(`sensor-light-${roomId}`, { id: `sensor-light-${roomId}`, roomId, name: 'Ambient Light Sensor', type: 'AMBIENT_LIGHT', unit: 'lux', sampleIntervalSec: 10, lastValue: SIMULATION_DEFAULTS.INITIAL_ROOM_LUX, lastUpdatedAt: nowIso });
    sensors.set(`sensor-meter-${roomId}`, { id: `sensor-meter-${roomId}`, roomId, name: 'Smart Submeter Panel', type: 'ENERGY_METER', unit: 'W', sampleIntervalSec: 5, lastValue: 0, lastUpdatedAt: nowIso });

    const room: RoomSimulationInternal = {
      roomId,
      name: options.name,
      floor: options.floor ?? 1,
      capacity: options.capacity ?? 30,
      areaSqMeters: options.areaSqMeters ?? 45.0,
      state,
      devices: new Map(), // Correction §12: zero devices initially
      people: new Map(),
      sensors,
      unregisteredLoadW: 0,
      unregisteredLoadStartedAt: null,
      cumulativeSavingsKwh: 0,
      cumulativeCostSavedInr: 0,
      cumulativeCo2SavedKg: 0,
    };

    this.rooms.set(roomId, room);
    return room;
  }

  deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  // ─── Room Power Supply ──────────────────────────────────────
  setRoomPowerSupply(roomId: string, on: boolean): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    room.state.powerSupplyOn = on;
    if (!on) {
      // When power OFF: all devices become electrically inactive
      for (const device of room.devices.values()) {
        device.currentPowerW = 0;
      }
      room.state.totalPowerKw = 0;
      room.state.expectedRegisteredPowerKw = 0;
      room.state.unaccountedPowerKw = 0;
    }
    return true;
  }

  // ─── Device Management ──────────────────────────────────────
  addDevice(roomId: string, device: DeviceDto | (Omit<DeviceDto, 'roomId'> & { roomId?: string })): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const fullDevice: DeviceDto = { ...device, roomId };
    room.devices.set(device.id, fullDevice);
    return true;
  }

  removeDevice(roomId: string, deviceId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    return room.devices.delete(deviceId);
  }

  // ─── Room Queries ───────────────────────────────────────────
  getRoom(roomId: string): RoomSimulationInternal | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): RoomSimulationInternal[] {
    return Array.from(this.rooms.values());
  }

  getRoomState(roomId: string): RoomSimulationState | undefined {
    return this.rooms.get(roomId)?.state;
  }

  updateRoomState(roomId: string, updates: Partial<RoomSimulationState>): RoomSimulationState | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.state = {
      ...room.state,
      ...updates,
      simulationTimestamp: simulationClock.getSimulatedTime().toISOString(),
    };
    return room.state;
  }

  // ─── Device Queries ─────────────────────────────────────────
  getDevices(roomId: string): DeviceDto[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.devices.values()) : [];
  }

  getDevice(roomId: string, deviceId: string): DeviceDto | undefined {
    return this.rooms.get(roomId)?.devices.get(deviceId);
  }

  updateDevice(roomId: string, deviceId: string, updates: Partial<DeviceDto>): DeviceDto | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const device = room.devices.get(deviceId);
    if (!device) return undefined;

    const updated = {
      ...device,
      ...updates,
      lastStateChange: simulationClock.getSimulatedTime().toISOString(),
    };
    room.devices.set(deviceId, updated);
    return updated;
  }

  // ─── People Queries ─────────────────────────────────────────
  getPeople(roomId: string): PersonDto[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.people.values()) : [];
  }

  addPerson(roomId: string, person: PersonDto): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.people.set(person.id, person);
    }
  }

  removePerson(roomId: string, personId: string): boolean {
    const room = this.rooms.get(roomId);
    return room ? room.people.delete(personId) : false;
  }

  clearPeople(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.people.clear();
    }
  }

  // ─── Sensor Queries ─────────────────────────────────────────
  getSensors(roomId: string): SensorDto[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.sensors.values()) : [];
  }

  updateSensorReading(roomId: string, sensorId: string, value: number): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const sensor = room.sensors.get(sensorId);
    if (sensor) {
      sensor.lastValue = value;
      sensor.lastUpdatedAt = simulationClock.getSimulatedTime().toISOString();
    }
  }

  // ─── Unregistered Load ──────────────────────────────────────
  setUnregisteredLoad(roomId: string, watts: number): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.unregisteredLoadW = watts;
      room.unregisteredLoadStartedAt = watts > 0 ? simulationClock.getSimulatedTime().toISOString() : null;
    }
  }

  // ─── Savings ────────────────────────────────────────────────
  addSavings(roomId: string, kwh: number, inr: number, co2: number): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.cumulativeSavingsKwh += kwh;
      room.cumulativeCostSavedInr += inr;
      room.cumulativeCo2SavedKg += co2;
    }
  }

  // ─── Database Hydration ─────────────────────────────────────
  async loadFromDatabase(): Promise<boolean> {
    try {
      const { prisma, checkDatabaseConnection } = await import('../../db/prisma.js');
      const isConnected = await checkDatabaseConnection();
      if (!isConnected) return false;

      const dbRooms = await prisma.room.findMany({
        include: {
          settings: true,
          devices: { include: { policy: true } },
          sensors: true,
          people: { where: { active: true } },
        },
      });

      if (!dbRooms || dbRooms.length === 0) return false;

      for (const r of dbRooms) {
        const devices = new Map<string, DeviceDto>();
        for (const d of r.devices) {
          devices.set(d.id, {
            id: d.id,
            roomId: d.roomId,
            name: d.name,
            type: d.type as any,
            ratedPowerW: d.ratedPowerW,
            standbyPowerW: d.standbyPowerW,
            currentState: d.currentState as any,
            isPoweredOn: d.currentState !== 'OFF',
            currentPowerW: d.currentPowerW,
            cumulativeEnergyKwh: d.cumulativeEnergyKwh,
            isProtected: d.isProtected,
            isControllable: d.isControllable,
            priority: d.priority,
            lastStateChange: d.lastStateChange?.toISOString() || new Date().toISOString(),
            policy: d.policy
              ? {
                  id: d.policy.id,
                  deviceId: d.policy.deviceId,
                  turnOffOnVacancy: d.policy.turnOffOnVacancy,
                  allowPreCool: d.policy.allowPreCool,
                  priority: d.policy.priority,
                  tempThresholdC: d.policy.tempThresholdC ?? undefined,
                  luxThreshold: d.policy.luxThreshold ?? undefined,
                }
              : undefined,
          });
        }

        const sensors = new Map<string, SensorDto>();
        for (const s of r.sensors) {
          sensors.set(s.id, {
            id: s.id,
            roomId: s.roomId,
            name: s.name,
            type: s.type as any,
            unit: s.unit,
            lastValue: s.lastValue ?? undefined,
            lastUpdatedAt: s.lastUpdatedAt?.toISOString() ?? undefined,
          });
        }

        const people = new Map<string, PersonDto>();
        for (const p of r.people) {
          if (p.active) {
            people.set(p.id, {
              id: p.id,
              roomId: p.roomId,
              displayName: p.displayName,
              active: p.active,
              heatGainW: p.heatGainW,
              co2GenerationPpmPerHour: p.co2GenerationPpmPerHour,
            });
          }
        }

        const activePeopleCount = people.size;

        const state: RoomSimulationState = {
          roomId: r.id,
          powerSupplyOn: r.powerSupplyOn,
          occupancyCount: activePeopleCount,
          peoplePresent: Array.from(people.keys()),
          temperatureC: r.currentTemperature,
          humidityPct: r.currentHumidity,
          co2Ppm: r.currentCo2,
          ambientLightLux: r.currentLux,
          outsideTemperatureC: SIMULATION_DEFAULTS.OUTDOOR_TEMP_C,
          acSetpointC: r.settings?.targetTempC ?? 24.0,
          hvacDemand: 0,
          comfortScore: r.currentComfortScore,
          occupancyState: r.currentOccupancyState as any,
          vacancyStartedAt: null,
          vacancyDelaySeconds: r.settings?.vacancyConfirmationTimeSec || 300,
          totalPowerKw: r.totalActivePowerW / 1000,
          expectedRegisteredPowerKw: r.totalExpectedPowerW / 1000,
          unaccountedPowerKw: r.unaccountedPowerW / 1000,
          simulationTimestamp: new Date().toISOString(),
        };

        this.rooms.set(r.id, {
          roomId: r.id,
          name: r.name,
          floor: r.floor,
          capacity: r.capacity,
          areaSqMeters: r.areaSqMeters,
          state,
          devices,
          people,
          sensors,
          unregisteredLoadW: 0,
          unregisteredLoadStartedAt: null,
          cumulativeSavingsKwh: 0,
          cumulativeCostSavedInr: 0,
          cumulativeCo2SavedKg: 0,
        });
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const simulationState = new SimulationStateManager();
