import { boundedNoise, roundTo } from '../../../utils/math.js';

export function readAmbientLightSensor(roomLux: number): number {
  return roundTo(Math.max(0, roomLux + boundedNoise(4.0)), 0);
}
