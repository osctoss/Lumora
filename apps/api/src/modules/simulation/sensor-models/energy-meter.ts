import { boundedNoise, roundTo } from '../../../utils/math.js';
import type { DeviceDto } from '@intellisave/shared';

export interface EnergyMeterReading {
  activePowerW: number;
  expectedPowerW: number;
  unaccountedPowerW: number;
  voltageV: number;
  currentA: number;
  powerFactor: number;
  reactivePowerVar: number;
  timestamp: string;
}

export function readEnergyMeter(
  devices: DeviceDto[],
  unregisteredLoadW: number,
  timestamp: string,
): EnergyMeterReading {
  // Expected registered active power from devices
  const expectedPowerW = devices.reduce((sum, d) => sum + (d.isPoweredOn ? d.currentPowerW : d.standbyPowerW), 0);

  // Metered total includes unregistered loads + minor 0.5% electrical noise
  const rawActivePower = expectedPowerW + unregisteredLoadW + boundedNoise(2.0);
  const activePowerW = roundTo(Math.max(0, rawActivePower), 1);
  const unaccountedPowerW = roundTo(Math.max(0, activePowerW - expectedPowerW), 1);

  // Electrical characteristics
  const voltageV = roundTo(230.0 + boundedNoise(1.5), 1);
  const powerFactor = roundTo(Math.min(0.99, Math.max(0.85, 0.94 + boundedNoise(0.02))), 2);
  const currentA = activePowerW > 0 ? roundTo(activePowerW / (voltageV * powerFactor), 2) : 0;
  const phi = Math.acos(powerFactor);
  const reactivePowerVar = roundTo(activePowerW * Math.tan(phi), 1);

  return {
    activePowerW,
    expectedPowerW: roundTo(expectedPowerW, 1),
    unaccountedPowerW,
    voltageV,
    currentA,
    powerFactor,
    reactivePowerVar,
    timestamp,
  };
}
