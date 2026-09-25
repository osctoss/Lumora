import { boundedNoise } from '../../../utils/math.js';

export function readPirSensor(peopleCount: number): number {
  if (peopleCount <= 0) return 0;
  // With people in room, high probability of motion detection (95%)
  return Math.random() < 0.95 ? 1 : 0;
}
