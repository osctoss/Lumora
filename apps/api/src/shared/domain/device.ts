// ─── Device Domain Types ──────────────────────────────────

export type DeviceType =
  | 'AC'
  | 'FAN'
  | 'LED'
  | 'FREEZER'
  | 'LAPTOP_PORT'
  | 'TUBE_LIGHT'
  | 'DESKTOP'
  | 'PROJECTOR'
  | 'GENERIC';

export type DeviceState =
  | 'OFF'
  | 'STARTING'
  | 'COOLING'
  | 'IDLE'
  | 'ON'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'SPEED_1'
  | 'SPEED_2'
  | 'SPEED_3'
  | 'STANDBY'
  | 'COMPRESSOR_ON'
  | 'COMPRESSOR_OFF'
  | 'FAULT';

export interface DeviceDto {
  id: string;
  roomId: string;
  name: string;
  type: DeviceType;
  ratedPowerW: number;
  standbyPowerW: number;
  ratedVoltageV?: number;
  quantity?: number;
  isControllable: boolean;
  isProtected: boolean;
  controllable?: boolean;
  protected?: boolean;
  isPoweredOn: boolean;
  currentState: DeviceState;
  currentPowerW: number;
  cumulativeEnergyKwh?: number;
  priority?: number;
  lastStateChange?: string;
  manualOverride?: boolean;
  policy?: {
    id?: string;
    deviceId?: string;
    turnOffOnVacancy: boolean;
    allowPreCool: boolean;
    priority: number;
    tempThresholdC?: number;
    luxThreshold?: number;
  };
  wallX?: number;
  wallY?: number;
}

export interface DevicePolicyDto {
  id?: string;
  deviceId?: string;
  turnOnWhenOccupied?: boolean;
  turnOffWhenVacant?: boolean;
  turnOffOnVacancy?: boolean;
  allowPreCool?: boolean;
  priority?: number;
  vacancyDelaySec?: number;
  minOnSec?: number;
  minOffSec?: number;
  tempThresholdC?: number;
  luxThreshold?: number;
  temperatureRule?: { enabled: boolean; minC?: number; maxC?: number };
  humidityRule?: { enabled: boolean; minPct?: number; maxPct?: number };
  co2Rule?: { enabled: boolean; maxPpm?: number };
  ambientLightRule?: { enabled: boolean; minLux?: number };
  protected?: boolean;
  allowManualOverride?: boolean;
}
