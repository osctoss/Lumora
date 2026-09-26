import { randomUUID } from 'crypto';
import { roundTo } from '../../utils/math.js';
import { logger } from '../../utils/logger.js';
import { publish } from '../../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import type { DeviceDto } from '@intellisave/shared';

export interface DeviceOperatingTracker {
  deviceId: string;
  onSince: Date | null;
  accumulatedRuntimeMinutes: number;
  totalRuntimeMinutes: number;
}

export interface RoomMeterInterval {
  id: string;
  roomId: string;
  intervalStart: string;
  intervalEnd: string;
  energyKwh: number;
  cumulativeKwh: number;
  averagePowerW: number;
}

export interface BuildingMeterInterval {
  intervalStart: string;
  intervalEnd: string;
  energyKwh: number;
  cumulativeKwh: number;
  averagePowerW: number;
  roomBreakdown: Array<{
    roomId: string;
    energyKwh: number;
  }>;
}

export interface RoomMeterState {
  roomId: string;
  currentIntervalStart: Date;
  accumulatedEnergyKwh: number;
  cumulativeKwh: number;
  powerSamples: number[];
  deviceTrackers: Map<string, DeviceOperatingTracker>;
  history: RoomMeterInterval[];
}

export class MeterEngine {
  private roomMeters = new Map<string, RoomMeterState>();
  private buildingCumulativeKwh: number = 0;
  private readonly INTERVAL_DURATION_MS = 5 * 60 * 1000; // 5 simulation minutes

  /**
   * Initialize or get the meter state for a given room.
   */
  public getOrCreateRoomMeter(roomId: string, initialSimTime?: Date): RoomMeterState {
    let state = this.roomMeters.get(roomId);
    if (!state) {
      const startTime = initialSimTime || new Date();
      state = {
        roomId,
        currentIntervalStart: new Date(startTime),
        accumulatedEnergyKwh: 0,
        cumulativeKwh: 0,
        powerSamples: [],
        deviceTrackers: new Map(),
        history: [],
      };
      this.roomMeters.set(roomId, state);
    }
    return state;
  }

  /**
   * Process a single simulation tick for a room.
   * Calculates partial-interval device runtimes and energy consumption per Correction §34, §35, §36, §37.
   */
  public processTick(params: {
    roomId: string;
    powerSupplyOn: boolean;
    devices: DeviceDto[];
    unregisteredLoadW: number;
    dtSeconds: number;
    simTime: Date;
  }): void {
    const { roomId, powerSupplyOn, devices, unregisteredLoadW, dtSeconds, simTime } = params;
    const state = this.getOrCreateRoomMeter(roomId, simTime);
    const dtMinutes = dtSeconds / 60;

    if (!powerSupplyOn) {
      // Room power is OFF: zero meter consumption (Correction §13, §34)
      state.powerSamples.push(0);

      // Any device operating periods are halted
      for (const tracker of state.deviceTrackers.values()) {
        if (tracker.onSince !== null) {
          const runMinutes = roundTo((simTime.getTime() - tracker.onSince.getTime()) / 60000, 1);
          tracker.totalRuntimeMinutes = roundTo(tracker.totalRuntimeMinutes + runMinutes, 1);
          tracker.onSince = null;
        }
      }
    } else {
      // Room power is ON: compute per-device energy consumption & runtime (Correction §34, §35)
      let roomActivePowerW = 0;

      for (const device of devices) {
        let tracker = state.deviceTrackers.get(device.id);
        if (!tracker) {
          tracker = {
            deviceId: device.id,
            onSince: null,
            accumulatedRuntimeMinutes: 0,
            totalRuntimeMinutes: 0,
          };
          state.deviceTrackers.set(device.id, tracker);
        }

        const isOperating = device.isPoweredOn && device.currentState !== 'OFF';

        if (isOperating) {
          // Device is ON
          if (tracker.onSince === null) {
            tracker.onSince = new Date(simTime);
          }
          tracker.accumulatedRuntimeMinutes += dtMinutes;

          // Energy formula (Correction §34): kWh = ratedPowerW × minutes / 60000
          // Uses current device power which accounts for AC/Freezer compressor mode
          const devicePowerW = device.currentPowerW;
          const devEnergyKwh = (devicePowerW * dtMinutes) / 60000;
          state.accumulatedEnergyKwh += devEnergyKwh;
          roomActivePowerW += devicePowerW;
        } else {
          // Device is OFF
          if (tracker.onSince !== null) {
            const runMinutes = roundTo((simTime.getTime() - tracker.onSince.getTime()) / 60000, 1);
            tracker.totalRuntimeMinutes = roundTo(tracker.totalRuntimeMinutes + runMinutes, 1);
            tracker.onSince = null;
          }
        }
      }

      // Add unregistered load energy if present
      if (unregisteredLoadW > 0) {
        const unregEnergyKwh = (unregisteredLoadW * dtMinutes) / 60000;
        state.accumulatedEnergyKwh += unregEnergyKwh;
        roomActivePowerW += unregisteredLoadW;
      }

      state.powerSamples.push(roomActivePowerW);
    }

    // Check if 5 simulation minutes have elapsed for this room meter
    const elapsedMs = simTime.getTime() - state.currentIntervalStart.getTime();
    if (elapsedMs >= this.INTERVAL_DURATION_MS) {
      this.flushInterval(roomId, simTime);
    }
  }

  /**
   * Flush the 5-minute interval reading for a room (Correction §36).
   */
  private flushInterval(roomId: string, simTime: Date): void {
    const state = this.roomMeters.get(roomId);
    if (!state) return;

    const intervalStart = new Date(state.currentIntervalStart);
    const intervalEnd = new Date(simTime);
    const energyKwh = roundTo(state.accumulatedEnergyKwh, 4);
    state.cumulativeKwh = roundTo(state.cumulativeKwh + energyKwh, 4);

    const avgPowerW =
      state.powerSamples.length > 0
        ? roundTo(state.powerSamples.reduce((a, b) => a + b, 0) / state.powerSamples.length, 1)
        : 0;

    const intervalData: RoomMeterInterval = {
      id: randomUUID(),
      roomId,
      intervalStart: intervalStart.toISOString(),
      intervalEnd: intervalEnd.toISOString(),
      energyKwh,
      cumulativeKwh: state.cumulativeKwh,
      averagePowerW: avgPowerW,
    };

    state.history.push(intervalData);
    if (state.history.length > 1000) {
      state.history.shift();
    }

    // Update building cumulative energy (Correction §38)
    this.buildingCumulativeKwh = roundTo(this.buildingCumulativeKwh + energyKwh, 4);

    // Publish METER_READING event via WebSocket (Correction §51)
    publish(
      EventTypes.METER_READING,
      roomId,
      {
        roomId,
        timestamp: intervalEnd.toISOString(),
        intervalStart: intervalData.intervalStart,
        intervalEnd: intervalData.intervalEnd,
        energyKwh: intervalData.energyKwh,
        cumulativeKwh: intervalData.cumulativeKwh,
        averagePowerW: intervalData.averagePowerW,
      },
      'SIMULATION',
    );

    // Persist to PostgreSQL MeterReading table
    import('../../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.meterReading.create({
          data: {
            id: intervalData.id,
            roomId,
            intervalStart: new Date(intervalData.intervalStart),
            intervalEnd: new Date(intervalData.intervalEnd),
            energyKwh: intervalData.energyKwh,
            cumulativeKwh: intervalData.cumulativeKwh,
            averagePowerW: intervalData.averagePowerW,
          },
        });
      } catch (err) {
        logger.warn(`Could not persist MeterReading for room ${roomId}:`, err);
      }
    });

    // Reset accumulator for next 5-minute interval
    state.currentIntervalStart = new Date(simTime);
    state.accumulatedEnergyKwh = 0;
    state.powerSamples = [];
  }

  /**
   * Get device operating runtime information (Correction §35).
   */
  public getDeviceRuntimeMinutes(roomId: string, deviceId: string, currentSimTime?: Date): number {
    const state = this.roomMeters.get(roomId);
    if (!state) return 0;
    const tracker = state.deviceTrackers.get(deviceId);
    if (!tracker) return 0;

    let activeMinutes = 0;
    if (tracker.onSince && currentSimTime) {
      activeMinutes = Math.max(0, (currentSimTime.getTime() - tracker.onSince.getTime()) / 60000);
    }
    return roundTo(tracker.totalRuntimeMinutes + activeMinutes, 1);
  }

  /**
   * Get room energy readings over a time range (Correction §38, §56).
   */
  public async getRoomEnergy(roomId: string, start?: Date, end?: Date): Promise<{
    roomId: string;
    range: { start: string; end: string };
    consumptionKwh: number;
    cumulativeKwh: number;
    intervals: RoomMeterInterval[];
  }> {
    const state = this.getOrCreateRoomMeter(roomId);
    const startDate = start || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = end || new Date();

    // Try database first for complete persistence
    try {
      const { prisma, checkDatabaseConnection } = await import('../../db/prisma.js');
      if (await checkDatabaseConnection()) {
        const dbReadings = await prisma.meterReading.findMany({
          where: {
            roomId,
            intervalStart: { gte: startDate },
            intervalEnd: { lte: endDate },
          },
          orderBy: { intervalStart: 'asc' },
        });

        if (dbReadings.length > 0) {
          const intervals: RoomMeterInterval[] = dbReadings.map((r) => ({
            id: r.id,
            roomId: r.roomId,
            intervalStart: r.intervalStart.toISOString(),
            intervalEnd: r.intervalEnd.toISOString(),
            energyKwh: roundTo(r.energyKwh, 4),
            cumulativeKwh: roundTo(r.cumulativeKwh, 4),
            averagePowerW: roundTo(r.averagePowerW, 1),
          }));

          const consumptionKwh = roundTo(
            intervals.reduce((sum, item) => sum + item.energyKwh, 0),
            4,
          );
          const cumulativeKwh = intervals[intervals.length - 1]?.cumulativeKwh || state.cumulativeKwh;

          return {
            roomId,
            range: { start: startDate.toISOString(), end: endDate.toISOString() },
            consumptionKwh,
            cumulativeKwh,
            intervals,
          };
        }
      }
    } catch {
      // Fallback to in-memory history
    }

    // In-memory fallback
    const filteredIntervals = state.history.filter((item) => {
      const itemStart = new Date(item.intervalStart).getTime();
      return itemStart >= startDate.getTime() && itemStart <= endDate.getTime();
    });

    const consumptionKwh = roundTo(
      filteredIntervals.reduce((sum, item) => sum + item.energyKwh, 0),
      4,
    );

    return {
      roomId,
      range: { start: startDate.toISOString(), end: endDate.toISOString() },
      consumptionKwh,
      cumulativeKwh: state.cumulativeKwh,
      intervals: filteredIntervals,
    };
  }

  /**
   * Get aggregated building energy readings over a time range (Correction §38, §53).
   * Building interval energy = Σ(all room meter intervals)
   */
  public async getBuildingEnergy(start?: Date, end?: Date): Promise<{
    range: { start: string; end: string };
    totalConsumptionKwh: number;
    cumulativeKwh: number;
    intervals: BuildingMeterInterval[];
    roomBreakdown: Array<{ roomId: string; consumptionKwh: number }>;
  }> {
    const startDate = start || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = end || new Date();

    // Try database first
    try {
      const { prisma, checkDatabaseConnection } = await import('../../db/prisma.js');
      if (await checkDatabaseConnection()) {
        const dbReadings = await prisma.meterReading.findMany({
          where: {
            intervalStart: { gte: startDate },
            intervalEnd: { lte: endDate },
          },
          orderBy: { intervalStart: 'asc' },
        });

        if (dbReadings.length > 0) {
          // Group by intervalStart
          const intervalMap = new Map<string, {
            intervalStart: string;
            intervalEnd: string;
            energyKwh: number;
            powerSamples: number[];
            roomBreakdown: Map<string, number>;
          }>();

          for (const reading of dbReadings) {
            const key = reading.intervalStart.toISOString();
            let bucket = intervalMap.get(key);
            if (!bucket) {
              bucket = {
                intervalStart: key,
                intervalEnd: reading.intervalEnd.toISOString(),
                energyKwh: 0,
                powerSamples: [],
                roomBreakdown: new Map(),
              };
              intervalMap.set(key, bucket);
            }
            bucket.energyKwh += reading.energyKwh;
            bucket.powerSamples.push(reading.averagePowerW);
            bucket.roomBreakdown.set(
              reading.roomId,
              (bucket.roomBreakdown.get(reading.roomId) || 0) + reading.energyKwh,
            );
          }

          let runCumulative = 0;
          const intervals: BuildingMeterInterval[] = [];
          for (const bucket of intervalMap.values()) {
            const bucketKwh = roundTo(bucket.energyKwh, 4);
            runCumulative = roundTo(runCumulative + bucketKwh, 4);
            const avgPower =
              bucket.powerSamples.length > 0
                ? roundTo(
                    bucket.powerSamples.reduce((a, b) => a + b, 0) / bucket.powerSamples.length,
                    1,
                  )
                : 0;

            const breakdown = Array.from(bucket.roomBreakdown.entries()).map(([rId, kwh]) => ({
              roomId: rId,
              energyKwh: roundTo(kwh, 4),
            }));

            intervals.push({
              intervalStart: bucket.intervalStart,
              intervalEnd: bucket.intervalEnd,
              energyKwh: bucketKwh,
              cumulativeKwh: runCumulative,
              averagePowerW: avgPower,
              roomBreakdown: breakdown,
            });
          }

          // Compute room breakdown
          const roomTotals = new Map<string, number>();
          for (const reading of dbReadings) {
            roomTotals.set(
              reading.roomId,
              (roomTotals.get(reading.roomId) || 0) + reading.energyKwh,
            );
          }

          return {
            range: { start: startDate.toISOString(), end: endDate.toISOString() },
            totalConsumptionKwh: roundTo(
              Array.from(roomTotals.values()).reduce((a, b) => a + b, 0),
              4,
            ),
            cumulativeKwh: runCumulative,
            intervals,
            roomBreakdown: Array.from(roomTotals.entries()).map(([roomId, consumptionKwh]) => ({
              roomId,
              consumptionKwh: roundTo(consumptionKwh, 4),
            })),
          };
        }
      }
    } catch {
      // In-memory fallback below
    }

    // In-memory fallback
    const intervalMap = new Map<string, {
      intervalStart: string;
      intervalEnd: string;
      energyKwh: number;
      powerSamples: number[];
      roomBreakdown: Map<string, number>;
    }>();

    const roomTotals = new Map<string, number>();

    for (const [roomId, state] of this.roomMeters.entries()) {
      for (const item of state.history) {
        const itemStartTime = new Date(item.intervalStart).getTime();
        if (itemStartTime >= startDate.getTime() && itemStartTime <= endDate.getTime()) {
          const key = item.intervalStart;
          let bucket = intervalMap.get(key);
          if (!bucket) {
            bucket = {
              intervalStart: key,
              intervalEnd: item.intervalEnd,
              energyKwh: 0,
              powerSamples: [],
              roomBreakdown: new Map(),
            };
            intervalMap.set(key, bucket);
          }
          bucket.energyKwh += item.energyKwh;
          bucket.powerSamples.push(item.averagePowerW);
          bucket.roomBreakdown.set(roomId, (bucket.roomBreakdown.get(roomId) || 0) + item.energyKwh);

          roomTotals.set(roomId, (roomTotals.get(roomId) || 0) + item.energyKwh);
        }
      }
    }

    let runCumulative = 0;
    const intervals: BuildingMeterInterval[] = [];
    for (const bucket of intervalMap.values()) {
      const bucketKwh = roundTo(bucket.energyKwh, 4);
      runCumulative = roundTo(runCumulative + bucketKwh, 4);
      const avgPower =
        bucket.powerSamples.length > 0
          ? roundTo(
              bucket.powerSamples.reduce((a, b) => a + b, 0) / bucket.powerSamples.length,
              1,
            )
          : 0;

      const breakdown = Array.from(bucket.roomBreakdown.entries()).map(([rId, kwh]) => ({
        roomId: rId,
        energyKwh: roundTo(kwh, 4),
      }));

      intervals.push({
        intervalStart: bucket.intervalStart,
        intervalEnd: bucket.intervalEnd,
        energyKwh: bucketKwh,
        cumulativeKwh: runCumulative,
        averagePowerW: avgPower,
        roomBreakdown: breakdown,
      });
    }

    return {
      range: { start: startDate.toISOString(), end: endDate.toISOString() },
      totalConsumptionKwh: roundTo(
        Array.from(roomTotals.values()).reduce((a, b) => a + b, 0),
        4,
      ),
      cumulativeKwh: this.buildingCumulativeKwh,
      intervals,
      roomBreakdown: Array.from(roomTotals.entries()).map(([roomId, consumptionKwh]) => ({
        roomId,
        consumptionKwh: roundTo(consumptionKwh, 4),
      })),
    };
  }
}

export const meterEngine = new MeterEngine();
