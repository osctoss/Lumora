import { simulationState } from '../simulation/simulation-state.js';
import { simulationClock } from '../simulation/simulation-clock.js';
import { publish } from '../../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import { AUTOMATION_DEFAULTS } from '../../config/defaults.js';
import { roundTo } from '../../utils/math.js';

export interface ActiveSavingsSession {
  id: string;
  roomId: string;
  status: 'OPEN' | 'CLOSED';
  triggerType: 'VACANCY_AUTO_SHUTOFF' | 'MANUAL_ECO_MODE';
  startedAt: string;
  endedAt: string | null;
  baselinePowerW: number;
  energySavedKwh: number;
  costSavedInr: number;
  co2SavedKg: number;
}

class SavingsEngine {
  private activeSessions: Map<string, ActiveSavingsSession> = new Map();

  startSession(roomId: string, baselinePowerW: number): ActiveSavingsSession {
    const nowIso = simulationClock.getSimulatedTime().toISOString();
    const sessionId = `session-${Date.now()}`;

    const session: ActiveSavingsSession = {
      id: sessionId,
      roomId,
      status: 'OPEN',
      triggerType: 'VACANCY_AUTO_SHUTOFF',
      startedAt: nowIso,
      endedAt: null,
      baselinePowerW,
      energySavedKwh: 0,
      costSavedInr: 0,
      co2SavedKg: 0,
    };

    this.activeSessions.set(roomId, session);

    publish(EventTypes.SAVINGS_SESSION_STARTED, roomId, {
      sessionId,
      startedAt: nowIso,
      baselinePowerW,
      reason: 'Room vacant; autonomous energy shutdown initiated',
    });

    // Persist to PostgreSQL asynchronously
    import('../../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.savingsSession.create({
          data: {
            id: sessionId,
            roomId,
            status: 'OPEN',
            triggerType: 'VACANCY_AUTO_SHUTOFF',
            startedAt: new Date(nowIso),
            baselinePowerW: baselinePowerW,
            energySavedKwh: 0,
            costSavedInr: 0,
            co2SavedKg: 0,
          },
        });
      } catch {
        // Non-blocking fallback
      }
    });

    return session;
  }

  updateSession(roomId: string, actualPowerW: number, dtSeconds: number): void {
    let session = this.activeSessions.get(roomId);
    const room = simulationState.getRoom(roomId);
    if (!room) return;

    const isVacant = room.state.occupancyState === 'VACANT';

    // If vacant and no active session, start one with prior registered baseline
    if (isVacant && !session) {
      const baseline = room.state.expectedRegisteredPowerKw * 1000 || 1600;
      session = this.startSession(roomId, baseline);
    }

    if (!session || session.status !== 'OPEN') return;

    // If room became occupied again, close the session
    if (!isVacant) {
      this.closeSession(roomId);
      return;
    }

    // Counterfactual savings: power baseline minus actual metered power
    const counterfactualW = session.baselinePowerW;
    const instantaneousSavingsW = Math.max(0, counterfactualW - actualPowerW);

    // Delta kWh in dtSeconds
    const deltaKwh = (instantaneousSavingsW * dtSeconds) / (3600 * 1000);
    const deltaInr = deltaKwh * AUTOMATION_DEFAULTS.TARIFF_INR_PER_KWH;
    const deltaCo2 = deltaKwh * AUTOMATION_DEFAULTS.GRID_CO2_KG_PER_KWH;

    session.energySavedKwh += deltaKwh;
    session.costSavedInr += deltaInr;
    session.co2SavedKg += deltaCo2;

    // Update room totals
    simulationState.addSavings(roomId, deltaKwh, deltaInr, deltaCo2);
  }

  closeSession(roomId: string): void {
    const session = this.activeSessions.get(roomId);
    if (!session || session.status !== 'OPEN') return;

    const nowIso = simulationClock.getSimulatedTime().toISOString();
    session.status = 'CLOSED';
    session.endedAt = nowIso;

    publish(EventTypes.SAVINGS_SESSION_CLOSED, roomId, {
      sessionId: session.id,
      startedAt: session.startedAt,
      endedAt: nowIso,
      totalEnergySavedKwh: roundTo(session.energySavedKwh, 3),
      totalCostSavedInr: roundTo(session.costSavedInr, 2),
      totalCo2SavedKg: roundTo(session.co2SavedKg, 3),
      reason: 'Room occupancy resumed',
    });

    // Persist session to PostgreSQL asynchronously
    import('../../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.savingsSession.upsert({
          where: { id: session.id },
          update: {
            status: 'CLOSED',
            endedAt: new Date(nowIso),
            energySavedKwh: roundTo(session.energySavedKwh, 3),
            costSavedInr: roundTo(session.costSavedInr, 2),
            co2SavedKg: roundTo(session.co2SavedKg, 3),
          },
          create: {
            id: session.id,
            roomId,
            status: 'CLOSED',
            triggerType: session.triggerType,
            startedAt: new Date(session.startedAt),
            endedAt: new Date(nowIso),
            baselinePowerW: session.baselinePowerW,
            energySavedKwh: roundTo(session.energySavedKwh, 3),
            costSavedInr: roundTo(session.costSavedInr, 2),
            co2SavedKg: roundTo(session.co2SavedKg, 3),
          },
        });
      } catch {
        // Non-blocking fallback
      }
    });

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
