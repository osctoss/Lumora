import type { DeviceDto } from '@intellisave/shared';
import type { IDeviceModel, DeviceModelContext, DeviceModelResult } from './base-device-model.js';

export class FreezerDeviceModel implements IDeviceModel {
  private cycleTimerSec: number = 0;
  // Typical commercial freezer: 20 mins ON, 20 mins OFF
  private cyclePeriodSec: number = 1200;

  calculate(device: DeviceDto, context: DeviceModelContext): DeviceModelResult {
    this.cycleTimerSec = (this.cycleTimerSec + context.dtSeconds) % this.cyclePeriodSec;
    const isCompressorOn = this.cycleTimerSec < this.cyclePeriodSec * 0.6; // 60% duty cycle

    const newState = isCompressorOn ? 'COMPRESSOR_ON' : 'COMPRESSOR_OFF';
    const powerW = isCompressorOn ? device.ratedPowerW : device.standbyPowerW;

    return {
      newState,
      isPoweredOn: true,
      powerW,
      stateChanged: newState !== device.currentState,
    };
  }
}
