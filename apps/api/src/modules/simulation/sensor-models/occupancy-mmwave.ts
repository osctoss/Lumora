export function readMmWaveSensor(peopleCount: number): number {
  if (peopleCount <= 0) return 0;
  // mmWave detects micro-vibrations and chest expansion with near-perfect reliability (99.8%)
  return Math.random() < 0.998 ? 1 : 0;
}
