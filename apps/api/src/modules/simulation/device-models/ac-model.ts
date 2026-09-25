import type { DeviceDto, DeviceState } from '@intellisave/shared';
import type { IDeviceModel, DeviceModelContext, DeviceModelResult } from './base-device-model.js';
import { clamp, roundTo } from '../../../utils/math.js';

export class AcDeviceModel implements IDeviceModel {
  calculate(device: DeviceDto, context: DeviceModelContext): DeviceModelResult {
    if (device.currentState === 'OFF') {
      return {
        newState: 'OFF',
        isPoweredOn: false,
        powerW: device.standbyPowerW,
        stateChanged: false,
      };
    }

    const tempDelta = context.roomTempC - context.targetTempC;
    let powerW = device.ratedPowerW;
    let newState: DeviceState = 'COOLING';

    if (tempDelta > 2.0) {
      // Room is hot: Compressor runs at maximum inverter capacity
      powerW = device.ratedPowerW * 1.0;
      newState = 'COOLING';
    } else if (tempDelta > 0.5) {
      // Near setpoint: Inverter ramps down smoothly
      const fraction = 0.5 + (tempDelta / 2.0) * 0.45;
      powerW = device.ratedPowerW * fraction;
      newState = 'COOLING';
    } else if (tempDelta > -0.5) {
      // At setpoint: Low-speed maintenance cooling
      powerW = device.ratedPowerW * 0.35;
      newState = 'COOLING';
    } else {
      // Overcooled: Compressor cuts off, fan circulating only
      powerW = 45.0; // Fan only
      newState = 'STANDBY';
    }

    return {
      newState,
      isPoweredOn: true,
      powerW: roundTo(clamp(powerW, device.standbyPowerW, device.ratedPowerW), 1),
      stateChanged: newState !== device.currentState,
    };
  }
}
