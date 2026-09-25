import { roundTo } from '../../utils/math.js';

export function calculateDeviation(actual: number, expected: number): {
  absoluteDeltaW: number;
  percentageDeviation: number;
  isSignificant: boolean;
} {
  const epsilon = 10.0; // avoid divide by zero or extreme sensitivity at near zero
  const denom = Math.max(expected, epsilon);
  const percentage = ((actual - expected) / denom) * 100.0;
  const absDelta = Math.abs(actual - expected);

  return {
    absoluteDeltaW: roundTo(absDelta, 1),
    percentageDeviation: roundTo(percentage, 1),
    isSignificant: percentage > 15.0 && absDelta > 50.0,
  };
}
