import { roundTo } from '../../utils/math.js';

export interface CalibrationSessionState {
  roomId: string;
  status: 'IDLE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  startedAt: string | null;
  completedAt: string | null;
  samples: number[];
  calibratedBaselineW: number;
}

export class CalibrationEngine {
  private sessions: Map<string, CalibrationSessionState> = new Map();

  startCalibration(roomId: string): CalibrationSessionState {
    const session: CalibrationSessionState = {
      roomId,
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      completedAt: null,
      samples: [],
      calibratedBaselineW: 0,
    };
    this.sessions.set(roomId, session);
    return session;
  }

  addSample(roomId: string, powerW: number): CalibrationSessionState | undefined {
    const session = this.sessions.get(roomId);
    if (!session || session.status !== 'IN_PROGRESS') return undefined;

    session.samples.push(powerW);

    // After 10 samples (~10 ticks), complete calibration
    if (session.samples.length >= 10) {
      const avg = session.samples.reduce((a, b) => a + b, 0) / session.samples.length;
      session.calibratedBaselineW = roundTo(avg, 1);
      session.status = 'COMPLETED';
      session.completedAt = new Date().toISOString();
    }

    return session;
  }

  getSession(roomId: string): CalibrationSessionState | undefined {
    return this.sessions.get(roomId);
  }
}

export const calibrationEngine = new CalibrationEngine();
