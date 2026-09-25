import type { DeviceDto } from '@intellisave/shared';
import type { IDeviceModel, DeviceModelContext, DeviceModelResult } from './base-device-model.js';

export class GenericDeviceModel implements IDeviceModel {
  calculate(device: DeviceDto, _context: DeviceModelContext): DeviceModelResult {
    const isPoweredOn = device.currentState === 'ON';
    const powerW = isPoweredOn ? device.ratedPowerW : device.standbyPowerW;

    return {
      newState: device.currentState,
      isPoweredOn,
      powerW,
      stateChanged: false,
    };
  }
}
