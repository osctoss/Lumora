import type { DeviceDto } from '@intellisave/shared';
import type { IDeviceModel, DeviceModelContext, DeviceModelResult } from './base-device-model.js';

export class LaptopPortDeviceModel implements IDeviceModel {
  calculate(device: DeviceDto, context: DeviceModelContext): DeviceModelResult {
    // If people are present, laptops draw active charging power (~45W-65W)
    const isOccupied = context.occupancyCount > 0;
    const powerW = isOccupied ? 45.0 : device.standbyPowerW;

    return {
      newState: isOccupied ? 'ON' : 'STANDBY',
      isPoweredOn: isOccupied,
      powerW,
      stateChanged: false,
    };
  }
}
