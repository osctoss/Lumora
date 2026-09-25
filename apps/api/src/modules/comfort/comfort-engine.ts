import { clamp, roundTo } from '../../utils/math.js';
import { COMFORT_THRESHOLDS } from '@intellisave/shared';

export interface ComfortScoreBreakdown {
  overallScore: number;
  temperatureScore: number;
  humidityScore: number;
  co2Score: number;
  luxScore: number;
  issues: string[];
}

export function computeComfortScore(
  tempC: number,
  humidityPct: number,
  co2Ppm: number,
  lux: number,
): ComfortScoreBreakdown {
  const issues: string[] = [];

  // 1. Temperature (Weight: 40%) Ideal: 23°C - 26°C
  let tempScore = 100;
  if (tempC < COMFORT_THRESHOLDS.TEMPERATURE.MIN_IDEAL) {
    const diff = COMFORT_THRESHOLDS.TEMPERATURE.MIN_IDEAL - tempC;
    tempScore = Math.max(0, 100 - diff * 20);
    issues.push(`Temperature too cold (${tempC.toFixed(1)}°C)`);
  } else if (tempC > COMFORT_THRESHOLDS.TEMPERATURE.MAX_IDEAL) {
    const diff = tempC - COMFORT_THRESHOLDS.TEMPERATURE.MAX_IDEAL;
    tempScore = Math.max(0, 100 - diff * 20);
    issues.push(`Temperature too warm (${tempC.toFixed(1)}°C)`);
  }

  // 2. Humidity (Weight: 20%) Ideal: 35% - 60%
  let humidityScore = 100;
  if (humidityPct < COMFORT_THRESHOLDS.HUMIDITY.MIN_IDEAL) {
    humidityScore = Math.max(0, 100 - (COMFORT_THRESHOLDS.HUMIDITY.MIN_IDEAL - humidityPct) * 2.5);
    issues.push(`Air is dry (${humidityPct.toFixed(0)}%)`);
  } else if (humidityPct > COMFORT_THRESHOLDS.HUMIDITY.MAX_IDEAL) {
    humidityScore = Math.max(0, 100 - (humidityPct - COMFORT_THRESHOLDS.HUMIDITY.MAX_IDEAL) * 2.5);
    issues.push(`Air is humid (${humidityPct.toFixed(0)}%)`);
  }

  // 3. CO2 (Weight: 25%) Ideal: < 800 ppm
  let co2Score = 100;
  if (co2Ppm > COMFORT_THRESHOLDS.CO2.CRITICAL_THRESHOLD) {
    co2Score = 0;
    issues.push(`CO2 critical level (${co2Ppm.toFixed(0)} ppm)`);
  } else if (co2Ppm > COMFORT_THRESHOLDS.CO2.WARNING_THRESHOLD) {
    co2Score = 50 - ((co2Ppm - 1000) / 500) * 50;
    issues.push(`CO2 elevated (${co2Ppm.toFixed(0)} ppm)`);
  } else if (co2Ppm > COMFORT_THRESHOLDS.CO2.GOOD_MAX) {
    co2Score = 100 - ((co2Ppm - 800) / 200) * 50;
  }

  // 4. Lighting Lux (Weight: 15%) Ideal: 300 - 800 lux
  let luxScore = 100;
  if (lux < COMFORT_THRESHOLDS.LUX.MIN_DESK_WORK) {
    luxScore = Math.max(0, (lux / 300) * 100);
    issues.push(`Workspace under-lit (${lux} lux)`);
  } else if (lux > COMFORT_THRESHOLDS.LUX.OVERLIT_THRESHOLD) {
    luxScore = Math.max(50, 100 - ((lux - 1000) / 500) * 50);
  }

  const overallScore = roundTo(
    tempScore * 0.4 + humidityScore * 0.2 + co2Score * 0.25 + luxScore * 0.15,
    1,
  );

  return {
    overallScore: clamp(overallScore, 0, 100),
    temperatureScore: roundTo(tempScore, 1),
    humidityScore: roundTo(humidityScore, 1),
    co2Score: roundTo(co2Score, 1),
    luxScore: roundTo(luxScore, 1),
    issues,
  };
}
