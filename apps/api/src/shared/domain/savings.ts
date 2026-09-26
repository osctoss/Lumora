export type SavingsSessionStatus = 'OPEN' | 'CLOSED' | 'INTERRUPTED' | 'CANCELLED';

export interface SavingsSessionDto {
  id: string;
  roomId: string;
  status: SavingsSessionStatus;
  triggerType: string;
  startedAt: string;
  endedAt: string | null;
  counterfactualEnergyKwh: number;
  actualEnergyKwh: number;
  savedEnergyKwh: number;
  savedCostInr: number;
  avoidedCo2Kg: number;
  comfortBefore: number | null;
  comfortAfter: number | null;
}

export interface SavingsEventDto {
  id: string;
  sessionId: string;
  timestamp: string;
  counterfactualPowerKw: number;
  actualPowerKw: number;
  savedPowerKw: number;
}
