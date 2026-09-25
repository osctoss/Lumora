import type { RecommendationDto } from '@intellisave/shared';
import { roundTo } from '../../utils/math.js';

export class RecommendationEngine {
  generateRecommendations(
    roomId: string,
    currentTempC: number,
    lux: number,
    acPowerW: number,
    lightsPowerW: number,
    tariffRate: number = 8.0,
  ): RecommendationDto[] {
    const recs: RecommendationDto[] = [];

    // Recommendation 1: Thermostat 1°C Eco-Trim
    if (acPowerW > 500 && currentTempC < 24.0) {
      const savedWatts = acPowerW * 0.07; // ~7% reduction per 1°C
      const dailyKwh = (savedWatts * 8) / 1000;
      const dailyInr = dailyKwh * tariffRate;

      recs.push({
        id: `rec-temp-${roomId}`,
        roomId,
        title: 'Adjust AC Setpoint to 24°C',
        description: 'Room is currently over-cooled below comfort target. Raising setpoint by 1°C preserves ASHRAE comfort score while cutting continuous cooling load.',
        actionType: 'THERMOSTAT_TRIM',
        potentialSavingsKwh: roundTo(dailyKwh, 2),
        potentialSavingsInr: roundTo(dailyInr, 2),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
    }

    // Recommendation 2: Daylight Harvesting Lighting Trim
    if (lux > 600 && lightsPowerW > 50) {
      const savedWatts = lightsPowerW * 0.5;
      const dailyKwh = (savedWatts * 6) / 1000;
      const dailyInr = dailyKwh * tariffRate;

      recs.push({
        id: `rec-light-${roomId}`,
        roomId,
        title: 'Daylight Harvesting Lighting Trim',
        description: `Natural daylight is ${lux} lux (well above 500 lux target). Switching off secondary troffer lights saves energy with zero visual impact.`,
        actionType: 'LIGHTING_TRIM',
        potentialSavingsKwh: roundTo(dailyKwh, 2),
        potentialSavingsInr: roundTo(dailyInr, 2),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
    }

    return recs;
  }
}

export const recommendationEngine = new RecommendationEngine();
