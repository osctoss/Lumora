import type { SimulationClockState, SimulationStatus } from '@intellisave/shared';

export class SimulationClock {
  private status: SimulationStatus = 'RUNNING';
  private speedMultiplier: number = 1;
  private simulatedTime: Date;
  private realTimeStartedAt: Date;
  private ticksElapsed: number = 0;

  constructor() {
    this.realTimeStartedAt = new Date();
    // Default simulated start time: today at 09:00 AM
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    this.simulatedTime = start;
  }

  getState(): SimulationClockState {
    return {
      status: this.status,
      speedMultiplier: this.speedMultiplier,
      simulatedTime: this.simulatedTime.toISOString(),
      realTimeStartedAt: this.realTimeStartedAt.toISOString(),
      ticksElapsed: this.ticksElapsed,
    };
  }

  advance(dtSeconds: number = 1): Date {
    if (this.status !== 'RUNNING') return this.simulatedTime;
    this.simulatedTime = new Date(this.simulatedTime.getTime() + dtSeconds * this.speedMultiplier * 1000);
    this.ticksElapsed++;
    return this.simulatedTime;
  }

  setSpeed(speed: number): void {
    if ([1, 2, 5, 10, 30, 60].includes(speed)) {
      this.speedMultiplier = speed;
    }
  }

  pause(): void {
    this.status = 'PAUSED';
  }

  resume(): void {
    this.status = 'RUNNING';
  }

  toggle(): boolean {
    if (this.status === 'RUNNING') {
      this.pause();
      return false;
    } else {
      this.resume();
      return true;
    }
  }

  reset(): void {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    this.simulatedTime = start;
    this.ticksElapsed = 0;
    this.status = 'RUNNING';
  }

  getSimulatedTime(): Date {
    return this.simulatedTime;
  }

  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  getStatus(): SimulationStatus {
    return this.status;
  }

  getTicksElapsed(): number {
    return this.ticksElapsed;
  }
}

export const simulationClock = new SimulationClock();
