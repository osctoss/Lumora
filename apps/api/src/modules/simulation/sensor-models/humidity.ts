import { boundedNoise, roundTo } from '../../../utils/math.js';

export function readHumiditySensor(roomHumidityPct: number): number {
  return roundTo(roomHumidityPct + boundedNoise(0.5), 1);
}
