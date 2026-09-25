import { boundedNoise, roundTo } from '../../../utils/math.js';

export function readTemperatureSensor(roomTempC: number): number {
  // Sensor measurement error bounded within +/- 0.1°C
  return roundTo(roomTempC + boundedNoise(0.1), 2);
}
