import type {
  RoomSimulationState,
  DeviceDto,
  PersonDto,
  SensorDto,
  OccupancyState,
  DeviceState,
} from '@intellisave/shared';
import { simulationClock } from './simulation-clock.js';

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

  constructor() {
    this.initDefaultDemoRoom();
  }

  private initDefaultDemoRoom(): void {
    const roomId = 'room-101';
    const nowIso = simulationClock.getSimulatedTime().toISOString();

    const state: RoomSimulationState = {
      roomId,
      occupancyCount: 15,
      peoplePresent: ['person-prof-sharma', 'person-student-01', 'person-student-02'],
      temperatureC: 24.2,
      humidityPct: 52.0,
      co2Ppm: 680.0,
      ambientLightLux: 520.0,
      outsideTemperatureC: 32.5,
      hvacDemand: 0.45,
      comfortScore: 94.0,
      occupancyState: 'OCCUPIED',
      vacancyStartedAt: null,
      vacancyDelaySeconds: 300,
      totalPowerKw: 1.62,
      expectedRegisteredPowerKw: 1.62,
      unaccountedPowerKw: 0.0,
      simulationTimestamp: nowIso,
    };

    const devices = new Map<string, DeviceDto>();
    devices.set('dev-ac-101', {
      id: 'dev-ac-101',
      roomId,
      name: 'Main Air Conditioner (1.5T)',
      type: 'AC',
      ratedPowerW: 1500,
      standbyPowerW: 8,
      currentState: 'COOLING',
      isPoweredOn: true,
      currentPowerW: 1450,
      cumulativeEnergyKwh: 12.4,
      isProtected: false,
      isControllable: true,
      priority: 1,
      lastStateChange: nowIso,
      policy: {
        id: 'pol-ac-101',
        deviceId: 'dev-ac-101',
        turnOffOnVacancy: true,
        allowPreCool: true,
        priority: 1,
        tempThresholdC: 24.0,
      },
    });

    devices.set('dev-led-1-101', {
      id: 'dev-led-1-101',
      roomId,
      name: 'Front Troffer Lights',
      type: 'LED',
      ratedPowerW: 36,
      standbyPowerW: 0.5,
      currentState: 'ON',
      isPoweredOn: true,
      currentPowerW: 36,
      cumulativeEnergyKwh: 0.6,
      isProtected: false,
      isControllable: true,
      priority: 3,
      lastStateChange: nowIso,
      policy: {
        id: 'pol-led-1',
        deviceId: 'dev-led-1-101',
        turnOffOnVacancy: true,
        allowPreCool: false,
        priority: 3,
        luxThreshold: 500,
      },
    });

    devices.set('dev-led-2-101', {
      id: 'dev-led-2-101',
      roomId,
      name: 'Rear Troffer Lights',
      type: 'LED',
      ratedPowerW: 36,
      standbyPowerW: 0.5,
      currentState: 'ON',
      isPoweredOn: true,
      currentPowerW: 36,
      cumulativeEnergyKwh: 0.6,
      isProtected: false,
      isControllable: true,
      priority: 3,
      lastStateChange: nowIso,
      policy: {
        id: 'pol-led-2',
        deviceId: 'dev-led-2-101',
        turnOffOnVacancy: true,
        allowPreCool: false,
        priority: 3,
        luxThreshold: 500,
      },
    });

    devices.set('dev-fan-101', {
      id: 'dev-fan-101',
      roomId,
      name: 'Ceiling BLDC Fan',
      type: 'FAN',
      ratedPowerW: 60,
      standbyPowerW: 1.5,
      currentState: 'SPEED_2',
      isPoweredOn: true,
      currentPowerW: 42,
      cumulativeEnergyKwh: 0.35,
      isProtected: false,
      isControllable: true,
      priority: 2,
      lastStateChange: nowIso,
      policy: {
        id: 'pol-fan-101',
        deviceId: 'dev-fan-101',
        turnOffOnVacancy: true,
        allowPreCool: false,
        priority: 2,
      },
    });

    devices.set('dev-freezer-101', {
      id: 'dev-freezer-101',
      roomId,
      name: 'Lab Deep Freezer [PROTECTED]',
      type: 'FREEZER',
      ratedPowerW: 250,
      standbyPowerW: 12,
      currentState: 'COMPRESSOR_ON',
      isPoweredOn: true,
      currentPowerW: 245,
      cumulativeEnergyKwh: 4.8,
      isProtected: true,
      isControllable: false,
      priority: 10,
      lastStateChange: nowIso,
      policy: {
        id: 'pol-freezer',
        deviceId: 'dev-freezer-101',
        turnOffOnVacancy: false,
        allowPreCool: false,
        priority: 10,
      },
    });

    devices.set('dev-laptop-101', {
      id: 'dev-laptop-101',
      roomId,
      name: 'Instructor Workstation PD [PROTECTED]',
      type: 'LAPTOP_PORT',
      ratedPowerW: 65,
      standbyPowerW: 0.3,
      currentState: 'ON',
      isPoweredOn: true,
      currentPowerW: 45,
      cumulativeEnergyKwh: 0.5,
      isProtected: true,
      isControllable: false,
      priority: 9,
      lastStateChange: nowIso,
      policy: {
        id: 'pol-laptop',
        deviceId: 'dev-laptop-101',
        turnOffOnVacancy: false,
        allowPreCool: false,
        priority: 9,
      },
    });

    const people = new Map<string, PersonDto>();
    people.set('person-prof-sharma', {
      id: 'person-prof-sharma',
      roomId,
      displayName: 'Prof. Sharma',
      active: true,
      heatGainW: 110,
      co2GenerationPpmPerHour: 40000,
    });
    people.set('person-student-01', {
      id: 'person-student-01',
      roomId,
      displayName: 'Student Alpha',
      active: true,
      heatGainW: 95,
      co2GenerationPpmPerHour: 36000,
    });
    people.set('person-student-02', {
      id: 'person-student-02',
      roomId,
      displayName: 'Student Beta',
      active: true,
      heatGainW: 95,
      co2GenerationPpmPerHour: 36000,
    });

    const sensors = new Map<string, SensorDto>();
    sensors.set('sensor-pir-101', { id: 'sensor-pir-101', roomId, name: 'PIR Motion Sensor', type: 'OCCUPANCY_PIR', unit: 'boolean', sampleIntervalSec: 5, lastValue: 1, lastUpdatedAt: nowIso });
    sensors.set('sensor-mmwave-101', { id: 'sensor-mmwave-101', roomId, name: 'mmWave Micro-Presence', type: 'OCCUPANCY_MMWAVE', unit: 'boolean', sampleIntervalSec: 2, lastValue: 1, lastUpdatedAt: nowIso });
    sensors.set('sensor-temp-101', { id: 'sensor-temp-101', roomId, name: 'Temperature Sensor', type: 'TEMPERATURE', unit: '°C', sampleIntervalSec: 10, lastValue: 24.2, lastUpdatedAt: nowIso });
    sensors.set('sensor-humidity-101', { id: 'sensor-humidity-101', roomId, name: 'Humidity Sensor', type: 'HUMIDITY', unit: '%', sampleIntervalSec: 10, lastValue: 52.0, lastUpdatedAt: nowIso });
    sensors.set('sensor-co2-101', { id: 'sensor-co2-101', roomId, name: 'CO2 Air Quality Sensor', type: 'CO2', unit: 'ppm', sampleIntervalSec: 10, lastValue: 680.0, lastUpdatedAt: nowIso });
    sensors.set('sensor-light-101', { id: 'sensor-light-101', roomId, name: 'Ambient Light Sensor', type: 'AMBIENT_LIGHT', unit: 'lux', sampleIntervalSec: 10, lastValue: 520.0, lastUpdatedAt: nowIso });
    sensors.set('sensor-meter-101', { id: 'sensor-meter-101', roomId, name: 'Smart Submeter Panel', type: 'ENERGY_METER', unit: 'W', sampleIntervalSec: 5, lastValue: 1809.0, lastUpdatedAt: nowIso });

    this.rooms.set(roomId, {
      roomId,
      name: 'Room 101 - Smart Classroom',
      floor: 1,
      capacity: 30,
      areaSqMeters: 45.0,
      state,
      devices,
      people,
      sensors,
      unregisteredLoadW: 0,
      unregisteredLoadStartedAt: null,
      cumulativeSavingsKwh: 23.4,
      cumulativeCostSavedInr: 187.2,
      cumulativeCo2SavedKg: 19.18,
    });
  }

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

  setUnregisteredLoad(roomId: string, watts: number): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.unregisteredLoadW = watts;
      room.unregisteredLoadStartedAt = watts > 0 ? simulationClock.getSimulatedTime().toISOString() : null;
    }
  }

  addSavings(roomId: string, kwh: number, inr: number, co2: number): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.cumulativeSavingsKwh += kwh;
      room.cumulativeCostSavedInr += inr;
      room.cumulativeCo2SavedKg += co2;
    }
  }
}

export const simulationState = new SimulationStateManager();
