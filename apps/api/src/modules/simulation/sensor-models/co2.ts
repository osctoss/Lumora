import { boundedNoise, roundTo } from '../../../utils/math.js';

export function readCo2Sensor(roomCo2Ppm: number): number {
  return roundTo(roomCo2Ppm + boundedNoise(3.0), 0);
}
