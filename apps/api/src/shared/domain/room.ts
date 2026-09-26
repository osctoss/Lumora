// ─── Room Domain Types ────────────────────────────────────

export type OccupancyState = 'OCCUPIED' | 'VACANCY_PENDING' | 'VACANT';

export interface RoomSimulationState {
  roomId: string;
  powerSupplyOn: boolean;
  occupancyCount: number;
  peoplePresent: string[];
  temperatureC: number;
  humidityPct: number;
  co2Ppm: number;
  ambientLightLux: number;
  outsideTemperatureC: number;
  acSetpointC: number;
  hvacDemand: number;
  comfortScore: number | null;
  occupancyState: OccupancyState;
  vacancyStartedAt: string | null;
  vacancyDelaySeconds: number;
  totalPowerKw: number;
  expectedRegisteredPowerKw: number;
  unaccountedPowerKw: number;
  simulationTimestamp: string;
}

export interface RoomDto {
  id: string;
  buildingId: string;
  name: string;
  type: string;
  floor: number | null;
  capacity: number | null;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomRequest {
  name: string;
  type: string;
  floor?: number;
  capacity?: number;
  notes?: string;
}
