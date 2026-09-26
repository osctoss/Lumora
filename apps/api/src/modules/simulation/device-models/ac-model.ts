import type { DeviceDto, DeviceState } from '@intellisave/shared';
import type { IDeviceModel, DeviceModelContext, DeviceModelResult } from './base-device-model.js';
import { roundTo } from '../../../utils/math.js';

export class AcDeviceModel implements IDeviceModel {
  calculate(device: DeviceDto, context: DeviceModelContext): DeviceModelResult {
    if (!device.isPoweredOn || device.currentState === 'OFF') {
      return {
        newState: 'OFF',
        isPoweredOn: false,
        powerW: 0,
        stateChanged: device.currentState !== 'OFF',
      };
    }

    // Setpoint comes from context (room.state.acSetpointC), default 24°C
    const setpointC = context.targetTempC || 24.0;
    const roomTempC = context.roomTempC;

    let newState: DeviceState;
    let powerW: number;

    // Correction §27: While roomTemperature > AC_setpoint, COMPRESSOR_ON (uses ratedPowerW)
    // When roomTemperature <= AC_setpoint, COMPRESSOR_OFF (uses compressor-off / standbyPowerW)
    if (roomTempC > setpointC) {
      newState = 'COMPRESSOR_ON';
      powerW = device.ratedPowerW;
    } else {
      newState = 'COMPRESSOR_OFF';
      // Compressor-off rated power: standbyPowerW if configured (>0), else 45W fan circulation
      powerW = device.standbyPowerW > 0 ? device.standbyPowerW : 45.0;
    }

    return {
      newState,
      isPoweredOn: true,
      powerW: roundTo(powerW, 1),
      stateChanged: newState !== device.currentState,
    };
  }
}
