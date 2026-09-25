import type { DeviceDto } from '@intellisave/shared';
import type { IDeviceModel, DeviceModelContext, DeviceModelResult } from './base-device-model.js';

export class FanDeviceModel implements IDeviceModel {
  calculate(device: DeviceDto, _context: DeviceModelContext): DeviceModelResult {
    let powerW = device.standbyPowerW;
    let isPoweredOn = false;

    switch (device.currentState) {
      case 'SPEED_1':
        powerW = device.ratedPowerW * 0.5;
        isPoweredOn = true;
        break;
      case 'SPEED_2':
        powerW = device.ratedPowerW * 0.7;
        isPoweredOn = true;
        break;
      case 'SPEED_3':
      case 'ON':
        powerW = device.ratedPowerW;
        isPoweredOn = true;
        break;
      case 'OFF':
      default:
        powerW = device.standbyPowerW;
        isPoweredOn = false;
        break;
    }

    return {
      newState: device.currentState,
      isPoweredOn,
      powerW: Math.round(powerW),
      stateChanged: false,
    };
  }
}
