import type { DeviceDto, DeviceState } from '@intellisave/shared';

export interface DeviceModelContext {
  dtSeconds: number;
  roomTempC: number;
  targetTempC: number;
  occupancyCount: number;
  roomLux: number;
}

export interface DeviceModelResult {
  newState: DeviceState;
  isPoweredOn: boolean;
  powerW: number;
  stateChanged: boolean;
}

export interface IDeviceModel {
  calculate(device: DeviceDto, context: DeviceModelContext): DeviceModelResult;
}
