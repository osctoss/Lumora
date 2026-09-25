export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function roundTo(val: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

export function boundedNoise(amplitude: number): number {
  return (Math.random() * 2 - 1) * amplitude;
}

export function percentageDifference(a: number, b: number): number {
  if (b === 0) return a === 0 ? 0 : 100;
  return Math.abs((a - b) / b) * 100;
}
