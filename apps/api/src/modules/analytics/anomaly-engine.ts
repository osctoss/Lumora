import type { AlertSeverity, AlertType } from '@intellisave/shared';
import { calculateDeviation } from './deviation.js';

export interface AnomalyReport {
  isAnomaly: boolean;
  type?: AlertType;
  severity?: AlertSeverity;
  message?: string;
  unaccountedWatts?: number;
  percentageDeviation?: number;
}

export class AnomalyEngine {
  evaluate(
    actualPowerW: number,
    expectedPowerW: number,
    unaccountedPowerW: number,
    co2Ppm: number,
  ): AnomalyReport {
    // Check 1: Unregistered load / Ghost power
    if (unaccountedPowerW >= 50.0) {
      let severity: AlertSeverity = 'MEDIUM';
      if (unaccountedPowerW > 500) severity = 'CRITICAL';
      else if (unaccountedPowerW > 200) severity = 'HIGH';

      return {
        isAnomaly: true,
        type: 'UNACCOUNTED_CONSUMPTION',
        severity,
        message: `Unregistered load detected: ${Math.round(unaccountedPowerW)}W drawing through meter with zero device attribution`,
        unaccountedWatts: unaccountedPowerW,
      };
    }

    // Check 2: Severe expected power deviation (> 25%)
    const deviation = calculateDeviation(actualPowerW, expectedPowerW);
    if (deviation.isSignificant && deviation.percentageDeviation > 25.0) {
      return {
        isAnomaly: true,
        type: 'ENERGY_ANOMALY',
        severity: 'MEDIUM',
        message: `Electrical deviation of ${deviation.percentageDeviation}% from expected device operation envelope`,
        percentageDeviation: deviation.percentageDeviation,
      };
    }

    // Check 3: Extreme CO2 buildup
    if (co2Ppm > 1500) {
      return {
        isAnomaly: true,
        type: 'CO2_HIGH',
        severity: 'HIGH',
        message: `Critical CO2 spike (${Math.round(co2Ppm)} ppm) indicates severe ventilation deficit`,
      };
    }

    return { isAnomaly: false };
  }
}

export const anomalyEngine = new AnomalyEngine();
