import type { DeviceDto, DevicePolicyDto, DeviceState, DeviceType } from '../domain/device.js';

export interface CreateDeviceRequest {
  roomId: string;
  name: string;
  type: DeviceType;
  ratedPowerW: number;
  standbyPowerW?: number;
  isProtected?: boolean;
  isControllable?: boolean;
  priority?: number;
  policy?: Partial<DevicePolicyDto>;
}

export interface SetDeviceStateRequest {
  state: DeviceState;
  reason?: string;
}

export interface UpdateDevicePolicyRequest {
  turnOffOnVacancy?: boolean;
  allowPreCool?: boolean;
  priority?: number;
  tempThresholdC?: number;
  luxThreshold?: number;
}

export interface DeviceListResponse {
  devices: DeviceDto[];
  total: number;
}
