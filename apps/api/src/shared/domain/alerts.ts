export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertType =
  | 'VACANCY_ENERGY_WASTE'
  | 'ENERGY_ANOMALY'
  | 'UNACCOUNTED_CONSUMPTION'
  | 'COMFORT_RISK'
  | 'CO2_HIGH';

export interface AlertDto {
  id: string;
  roomId: string;
  type: AlertType;
  severity: AlertSeverity;
  score: number;
  status: string;
  reason: string;
  actualPowerKw: number | null;
  expectedPowerKw: number | null;
  deviationPct: number | null;
  durationSec: number | null;
  createdAt: string;
}

export type RecommendationStatus = 'PENDING' | 'SIMULATED' | 'APPLIED' | 'REJECTED' | 'EXPIRED';

export interface RecommendationDto {
  id: string;
  roomId: string;
  alertId?: string | null;
  title?: string;
  description?: string;
  actionType: string;
  status: RecommendationStatus;
  estimatedEnergyKwh?: number | null;
  estimatedCostInr?: number | null;
  estimatedCo2Kg?: number | null;
  potentialSavingsKwh?: number;
  potentialSavingsInr?: number;
  createdAt?: string;
}
