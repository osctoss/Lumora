import type { DeviceDto } from '@intellisave/shared';
import type { IDeviceModel, DeviceModelContext, DeviceModelResult } from './base-device-model.js';
import { roundTo } from '../../../utils/math.js';

export class FreezerDeviceModel implements IDeviceModel {
  private cycleTimerSec: number = 0;
  // Typical commercial freezer: 20 mins ON, 20 mins OFF
  private cyclePeriodSec: number = 1200;

  calculate(device: DeviceDto, context: DeviceModelContext): DeviceModelResult {
    if (!device.isPoweredOn || device.currentState === 'OFF') {
      return {
        newState: 'OFF',
        isPoweredOn: false,
        powerW: 0,
        stateChanged: device.currentState !== 'OFF',
      };
    }

    this.cycleTimerSec = (this.cycleTimerSec + context.dtSeconds) % this.cyclePeriodSec;
    const isCompressorOn = this.cycleTimerSec < this.cyclePeriodSec * 0.6; // 60% duty cycle

    const newState = isCompressorOn ? 'COMPRESSOR_ON' : 'COMPRESSOR_OFF';
    // Two power ratings per Correction §26: compressor-on (ratedPowerW) & compressor-off (standbyPowerW)
    const powerW = isCompressorOn
      ? device.ratedPowerW
      : (device.standbyPowerW > 0 ? device.standbyPowerW : 15.0);

    return {
      newState,
      isPoweredOn: true,
      powerW: roundTo(powerW, 1),
      stateChanged: newState !== device.currentState,
    };
  }
}
