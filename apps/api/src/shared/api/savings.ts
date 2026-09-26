import type { SavingsSessionDto } from '../domain/savings.js';

export interface SavingsSummaryResponse {
  totalSavingsKwh: number;
  totalCostSavedInr: number;
  totalCo2SavedKg: number;
  activeSessionsCount: number;
  sessions: SavingsSessionDto[];
}

export interface CounterfactualComparisonResponse {
  roomId: string;
  period: string;
  actualEnergyKwh: number;
  counterfactualEnergyKwh: number;
  baselineEnergyKwh: number;
  netSavingsKwh: number;
  costSavedInr: number;
  emissionsAvoidedKg: number;
}
