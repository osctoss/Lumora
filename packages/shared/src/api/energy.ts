export interface EnergyDataPoint {
  timestamp: string;
  actualPowerW: number;
  expectedPowerW: number;
  unaccountedPowerW: number;
  temperature: number;
  occupancyDetected: boolean;
}

export interface EnergyHistoryResponse {
  roomId: string;
  points: EnergyDataPoint[];
  totalActualKwh: number;
  totalExpectedKwh: number;
  totalSavedKwh: number;
}

export interface EnergyAccountingBreakdown {
  roomId: string;
  timestamp: string;
  meteredActivePowerW: number;
  expectedSumPowerW: number;
  unaccountedPowerW: number;
  discrepancyPercentage: number;
  isAnomaly: boolean;
  activeDevicesCount: number;
}
