import { randomUUID } from 'crypto';
import { simulationState } from '../simulation/simulation-state.js';
import { simulationClock } from '../simulation/simulation-clock.js';
import { publish } from '../../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import { AUTOMATION_DEFAULTS } from '../../config/defaults.js';
import { roundTo } from '../../utils/math.js';
import { logger } from '../../utils/logger.js';

export interface CounterfactualDevice {
  id: string;
  name: string;
  type: string;
  currentState: string;
  isPoweredOn: boolean;
  ratedPowerW: number;
  standbyPowerW: number;
  currentPowerW: number;
}

export interface CopyRoomSimulation {
  roomId: string;
  temperatureC: number;
  acSetpointC: number;
  devices: Map<string, CounterfactualDevice>;
}

export interface ActiveSavingsSession {
  id: string;
  roomId: string;
  status: 'OPEN' | 'CLOSED';
  triggerType: 'VACANCY_AUTO_SHUTOFF' | 'MANUAL_ECO_MODE';
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  baselinePowerW: number;
  counterfactualEnergyKwh: number;
  actualEnergyKwh: number;
  energySavedKwh: number;
  costSavedInr: number;
  co2SavedKg: number;
  copyRoom: CopyRoomSimulation | null;
}

export class SavingsEngine {
  private activeSessions: Map<string, ActiveSavingsSession> = new Map();

  /**
   * Determine if a copy room is needed upon room vacancy (Correction §40, §41).
   * Returns true if there are active controllable loads that would behave differently.
   */
  private shouldCreateCopyRoom(roomId: string): boolean {
    const devices = simulationState.getDevices(roomId);
    // Find any non-protected controllable loads currently ON
    const activeControllableLoads = devices.filter(
      (d) => !d.isProtected && d.type !== 'FREEZER' && d.isPoweredOn && d.currentState !== 'OFF',
    );
    return activeControllableLoads.length > 0;
  }

  /**
   * Snapshot active device states into an in-memory copy room (Correction §40, §43).
   */
  private createCopyRoom(roomId: string): CopyRoomSimulation | null {
    const room = simulationState.getRoom(roomId);
    if (!room) return null;

    const devices = simulationState.getDevices(roomId);
    const copyDevices = new Map<string, CounterfactualDevice>();

    for (const d of devices) {
      copyDevices.set(d.id, {
        id: d.id,
        name: d.name,
        type: d.type,
        currentState: d.currentState,
        isPoweredOn: d.isPoweredOn,
        ratedPowerW: d.ratedPowerW,
        standbyPowerW: d.standbyPowerW,
        currentPowerW: d.currentPowerW,
      });
    }

    return {
      roomId,
      temperatureC: room.state.temperatureC,
      acSetpointC: room.state.acSetpointC || 24.0,
      devices: copyDevices,
    };
  }

  /**
   * Start a counterfactual savings session upon vacancy (Correction §40).
   */
  startSession(roomId: string): ActiveSavingsSession | null {
    // Correction §41: If all controllable loads already OFF, no copy room needed
    if (!this.shouldCreateCopyRoom(roomId)) {
      logger.info(`ℹ️ [Savings] Room ${roomId} vacant but all controllable loads already OFF; copy-room not created.`);
      return null;
    }

    const room = simulationState.getRoom(roomId);
    if (!room) return null;

    const nowIso = simulationClock.getSimulatedTime().toISOString();
    const sessionId = randomUUID();
    const copyRoom = this.createCopyRoom(roomId);

    // Initial baseline power is total active power at vacancy
    const baselinePowerW = room.state.totalPowerKw * 1000;

    const session: ActiveSavingsSession = {
      id: sessionId,
      roomId,
      status: 'OPEN',
      triggerType: 'VACANCY_AUTO_SHUTOFF',
      startedAt: nowIso,
      endedAt: null,
      durationMinutes: 0,
      baselinePowerW,
      counterfactualEnergyKwh: 0,
      actualEnergyKwh: 0,
      energySavedKwh: 0,
      costSavedInr: 0,
      co2SavedKg: 0,
      copyRoom,
    };

    this.activeSessions.set(roomId, session);

    publish(EventTypes.SAVINGS_SESSION_STARTED, roomId, {
      sessionId,
      startedAt: nowIso,
      baselinePowerW,
      reason: 'Room vacant; counterfactual copy-room simulation initiated',
    });

    // Persist to PostgreSQL
    import('../../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        const roomExists = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
        if (!roomExists) return;

        await prisma.savingsSession.create({
          data: {
            id: sessionId,
            roomId,
            status: 'OPEN',
            triggerType: 'VACANCY_AUTO_SHUTOFF',
            startedAt: new Date(nowIso),
            baselinePowerW,
            counterfactualEnergyKwh: 0,
            actualEnergyKwh: 0,
            energySavedKwh: 0,
            costSavedInr: 0,
            co2SavedKg: 0,
          },
        });
      } catch (err) {
        logger.warn(`Could not persist SavingsSession:`, err);
      }
    });

    logger.info(`💡 [Savings] Started counterfactual session for room ${roomId} (Baseline: ${baselinePowerW}W)`);
    return session;
  }

  /**
   * Update savings session per simulation tick (Correction §43, §44, §48).
   * Runs copy room physics and computes actual vs counterfactual delta.
   */
  updateSession(roomId: string, actualPowerW: number, dtSeconds: number): void {
    const room = simulationState.getRoom(roomId);
    if (!room) return;

    const isVacant = room.state.occupancyCount === 0;
    let session = this.activeSessions.get(roomId);

    // If vacant and no session yet, attempt to start one
    if (isVacant && !session) {
      session = this.startSession(roomId) || undefined;
    }

    if (!session || session.status !== 'OPEN') return;

    // If room is occupied again, close session immediately (Correction §48)
    if (!isVacant) {
      this.closeSession(roomId);
      return;
    }

    // ─── Step 1: Simulate Copy Room Physics (Correction §43, §44) ─
    let copyRoomPowerW = 0;
    const copyRoom = session.copyRoom;

    if (copyRoom) {
      for (const dev of copyRoom.devices.values()) {
        if (!dev.isPoweredOn || dev.currentState === 'OFF') continue;

        if (dev.type === 'AC') {
          // Copy room AC continues cooling independently (§44)
          if (copyRoom.temperatureC > copyRoom.acSetpointC) {
            dev.currentState = 'COMPRESSOR_ON';
            dev.currentPowerW = dev.ratedPowerW;
            // 0.5°C/minute cooling
            const coolDrop = (0.5 / 60) * dtSeconds;
            copyRoom.temperatureC = Math.max(copyRoom.acSetpointC, copyRoom.temperatureC - coolDrop);
          } else {
            dev.currentState = 'COMPRESSOR_OFF';
            dev.currentPowerW = dev.standbyPowerW > 0 ? dev.standbyPowerW : 45.0;
          }
          copyRoomPowerW += dev.currentPowerW;
        } else if (dev.type === 'FREEZER') {
          copyRoomPowerW += dev.ratedPowerW;
        } else {
          // LED, Fan, and generic devices remain ON in copy room (§43)
          dev.currentPowerW = dev.ratedPowerW;
          copyRoomPowerW += dev.currentPowerW;
        }
      }
    } else {
      // Fallback to static baseline if no copy room
      copyRoomPowerW = session.baselinePowerW;
    }

    // ─── Step 2: Compute Energy Accounting (Correction §48) ────────
    const hours = dtSeconds / 3600;
    const copyIntervalKwh = (copyRoomPowerW * hours) / 1000;
    const realIntervalKwh = (actualPowerW * hours) / 1000;
    const intervalSavingsKwh = Math.max(0, copyIntervalKwh - realIntervalKwh);

    session.counterfactualEnergyKwh += copyIntervalKwh;
    session.actualEnergyKwh += realIntervalKwh;
    session.energySavedKwh += intervalSavingsKwh;
    session.durationMinutes += dtSeconds / 60;

    const deltaInr = intervalSavingsKwh * AUTOMATION_DEFAULTS.TARIFF_INR_PER_KWH;
    const deltaCo2 = intervalSavingsKwh * AUTOMATION_DEFAULTS.GRID_CO2_KG_PER_KWH;

    session.costSavedInr += deltaInr;
    session.co2SavedKg += deltaCo2;

    // Update room totals
    simulationState.addSavings(roomId, intervalSavingsKwh, deltaInr, deltaCo2);

    // Publish periodic update
    publish(EventTypes.SAVINGS_UPDATED, roomId, {
      sessionId: session.id,
      instantaneousSavingsW: Math.max(0, copyRoomPowerW - actualPowerW),
      cumulativeSavingsKwh: roundTo(session.energySavedKwh, 4),
      counterfactualPowerW: copyRoomPowerW,
      actualPowerW,
    });
  }

  /**
   * Close a savings session upon occupant return (Correction §48).
   */
  closeSession(roomId: string): void {
    const session = this.activeSessions.get(roomId);
    if (!session || session.status !== 'OPEN') return;

    const nowIso = simulationClock.getSimulatedTime().toISOString();
    session.status = 'CLOSED';
    session.endedAt = nowIso;
    session.copyRoom = null; // Clean up copy room

    const totalSavedKwh = roundTo(session.energySavedKwh, 4);
    const totalCostInr = roundTo(session.costSavedInr, 2);
    const totalCo2Kg = roundTo(session.co2SavedKg, 3);
    const durationMin = roundTo(session.durationMinutes, 1);

    publish(EventTypes.SAVINGS_SESSION_CLOSED, roomId, {
      sessionId: session.id,
      startedAt: session.startedAt,
      endedAt: nowIso,
      durationMinutes: durationMin,
      totalEnergySavedKwh: totalSavedKwh,
      totalCostSavedInr: totalCostInr,
      totalCo2SavedKg: totalCo2Kg,
      counterfactualEnergyKwh: roundTo(session.counterfactualEnergyKwh, 4),
      actualEnergyKwh: roundTo(session.actualEnergyKwh, 4),
      reason: 'Room occupancy resumed',
    });

    publish(EventTypes.SAVINGS_SESSION_ENDED, roomId, {
      sessionId: session.id,
      roomId,
      totalSavedKwh,
      durationMinutes: durationMin,
    });

    // Persist final session state to PostgreSQL
    import('../../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        const exists = await prisma.savingsSession.findUnique({ where: { id: session.id }, select: { id: true } });
        if (!exists) return;

        await prisma.savingsSession.update({
          where: { id: session.id },
          data: {
            status: 'CLOSED',
            endedAt: new Date(nowIso),
            durationMinutes: durationMin,
            counterfactualEnergyKwh: roundTo(session.counterfactualEnergyKwh, 4),
            actualEnergyKwh: roundTo(session.actualEnergyKwh, 4),
            energySavedKwh: totalSavedKwh,
            costSavedInr: totalCostInr,
            co2SavedKg: totalCo2Kg,
          },
        });
      } catch (err) {
        logger.warn(`Could not update SavingsSession:`, err);
      }
    });

    logger.info(`✨ [Savings] Closed session for room ${roomId}: Saved ${totalSavedKwh} kWh over ${durationMin} min`);
    this.activeSessions.delete(roomId);
  }

  getActiveSession(roomId: string): ActiveSavingsSession | undefined {
    return this.activeSessions.get(roomId);
  }

  getAllActiveSessions(): ActiveSavingsSession[] {
    return Array.from(this.activeSessions.values());
  }
}

export const savingsEngine = new SavingsEngine();
