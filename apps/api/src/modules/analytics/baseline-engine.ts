import { roundTo } from '../../utils/math.js';

export class BaselineEngine {
  private baselines: Map<string, number> = new Map();
  private alpha: number = 0.1; // Smoothing factor for 10-period EMA

  getBaseline(roomId: string, defaultWatts: number = 1600): number {
    if (!this.baselines.has(roomId)) {
      this.baselines.set(roomId, defaultWatts);
    }
    return this.baselines.get(roomId)!;
  }

  update(roomId: string, currentPowerW: number): number {
    const previous = this.getBaseline(roomId);
    const updated = this.alpha * currentPowerW + (1 - this.alpha) * previous;
    const rounded = roundTo(updated, 1);
    this.baselines.set(roomId, rounded);
    return rounded;
  }

  reset(roomId: string, watts: number = 1600): void {
    this.baselines.set(roomId, watts);
  }
}

export const baselineEngine = new BaselineEngine();
