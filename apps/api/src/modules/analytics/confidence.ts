import { clamp, roundTo } from '../../utils/math.js';

export function computeConfidenceScore(
  samplesCount: number,
  readingVariance: number,
  hasMmWave: boolean,
): number {
  let score = 50.0;

  // More samples increase confidence
  score += Math.min(30.0, (samplesCount / 20.0) * 30.0);

  // mmWave sensor adds substantial presence confidence
  if (hasMmWave) {
    score += 15.0;
  }

  // High reading variance lowers confidence slightly
  if (readingVariance > 50) {
    score -= 10.0;
  }

  return roundTo(clamp(score, 10, 99), 1);
}
