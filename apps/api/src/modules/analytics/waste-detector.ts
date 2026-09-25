import type { AlertSeverity } from '@intellisave/shared';
import { roundTo } from '../../utils/math.js';

export interface WasteAnalysis {
  isWasting: boolean;
  wastePowerW: number;
  wasteCostInrPerHour: number;
  severity: AlertSeverity;
  score: number; // 0 (clean) to 100 (severe waste)
  reason: string;
}

export function detectVacancyWaste(
  isVacant: boolean,
  activePowerW: number,
  protectedPowerW: number,
  tariffInrPerKwh: number = 8.0,
): WasteAnalysis {
  if (!isVacant) {
    return {
      isWasting: false,
      wastePowerW: 0,
      wasteCostInrPerHour: 0,
      severity: 'LOW',
      score: 0,
      reason: 'Room is occupied; active power is productive',
    };
  }

  // Permissible vacant baseline = protected loads + standby overhead
  const permissibleW = protectedPowerW + 25.0;
  const wastePowerW = Math.max(0, activePowerW - permissibleW);

  if (wastePowerW < 20.0) {
    return {
      isWasting: false,
      wastePowerW: 0,
      wasteCostInrPerHour: 0,
      severity: 'LOW',
      score: 0,
      reason: 'Vacant power within permissible standby envelope',
    };
  }

  const wasteCostInrPerHour = roundTo((wastePowerW / 1000) * tariffInrPerKwh, 2);

  let severity: AlertSeverity = 'LOW';
  let score = Math.min(100, Math.round((wastePowerW / 1500) * 100));

  if (wastePowerW > 1000) {
    severity = 'CRITICAL';
  } else if (wastePowerW > 500) {
    severity = 'HIGH';
  } else if (wastePowerW > 100) {
    severity = 'MEDIUM';
  }

  return {
    isWasting: true,
    wastePowerW: roundTo(wastePowerW, 1),
    wasteCostInrPerHour,
    severity,
    score,
    reason: `Room confirmed vacant but drawing ${Math.round(wastePowerW)}W of non-critical power (₹${wasteCostInrPerHour}/hr waste)`,
  };
}
