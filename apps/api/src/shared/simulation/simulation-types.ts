export type SimulationStatus = 'RUNNING' | 'PAUSED' | 'STOPPED';

export type SimulationScenario =
  | 'ROOM_EMPTY'
  | 'HIGH_HEAT'
  | 'HIGH_CO2'
  | 'UNREGISTERED_LOAD'
  | 'RESET_ROOM';

export interface SimulationClockState {
  status: SimulationStatus;
  speedMultiplier: number;
  simulatedTime: string; // ISO string
  realTimeStartedAt: string;
  ticksElapsed: number;
}

export interface SimulationTickPayload {
  roomId: string;
  timestamp: string;
  tickNumber: number;
  metrics: {
    temperature: number;
    humidity: number;
    co2: number;
    ambientLight: number;
    occupancyDetected: boolean;
    peopleCount: number;
    totalActivePowerW: number;
    totalExpectedPowerW: number;
    unaccountedPowerW: number;
  };
}
