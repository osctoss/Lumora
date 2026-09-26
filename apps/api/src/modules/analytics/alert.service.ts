import { randomUUID } from 'crypto';
import { publish } from '../../websocket/event-publisher.js';
import { EventTypes } from '@intellisave/shared';
import { roundTo } from '../../utils/math.js';
import { logger } from '../../utils/logger.js';

export interface AlertItem {
  id: string;
  roomId: string;
  roomName: string;
  alertType: 'HIGH_CONSUMPTION' | 'VACANCY_ENERGY_WASTE' | 'UNACCOUNTED_CONSUMPTION' | 'CO2_HIGH' | 'COMFORT_RISK';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  reason: string;
  timestamp: string;
  isResolved: boolean;
  resolvedAt?: string | null;
  currentState: Record<string, any>;
}

export class AlertService {
  private activeAlerts = new Map<string, AlertItem>(); // key: `${roomId}:${alertType}`
  private alertHistory: AlertItem[] = [];

  /**
   * Evaluate conditions for a room and trigger or resolve alerts (Correction §51).
   */
  public evaluateRoom(params: {
    roomId: string;
    roomName: string;
    isOccupied: boolean;
    occupancyCount: number;
    powerSupplyOn: boolean;
    activePowerW: number;
    expectedPowerW: number;
    unaccountedPowerW: number;
    temperatureC: number;
    co2Ppm: number;
    simTime: Date;
  }): void {
    const {
      roomId,
      roomName,
      isOccupied,
      occupancyCount,
      powerSupplyOn,
      activePowerW,
      expectedPowerW,
      unaccountedPowerW,
      temperatureC,
      co2Ppm,
      simTime,
    } = params;

    const timestamp = simTime.toISOString();

    // 1. UNACCOUNTED CONSUMPTION Alert (Correction §50: Use "Unaccounted consumption", not "waste")
    if (powerSupplyOn && unaccountedPowerW >= 50.0) {
      const severity = unaccountedPowerW > 500 ? 'CRITICAL' : unaccountedPowerW > 200 ? 'HIGH' : 'MEDIUM';
      this.triggerAlert({
        roomId,
        roomName,
        alertType: 'UNACCOUNTED_CONSUMPTION',
        severity,
        message: `Unaccounted consumption: ${Math.round(unaccountedPowerW)}W drawing with no registered device model`,
        reason: 'Meter active power exceeds registered device expected power by >= 50W',
        timestamp,
        currentState: { activePowerW, expectedPowerW, unaccountedPowerW },
      });
    } else {
      this.resolveAlert(roomId, 'UNACCOUNTED_CONSUMPTION', timestamp);
    }

    // 2. VACANCY ENERGY WASTE Alert (Room vacant but drawing significant non-protected power)
    if (!isOccupied && powerSupplyOn && activePowerW > 100.0) {
      const severity = activePowerW > 1500 ? 'CRITICAL' : activePowerW > 500 ? 'HIGH' : 'MEDIUM';
      this.triggerAlert({
        roomId,
        roomName,
        alertType: 'VACANCY_ENERGY_WASTE',
        severity,
        message: `Vacant room consuming ${Math.round(activePowerW)}W power with 0 occupants`,
        reason: 'Room has 0 occupants but non-essential electrical loads remain active',
        timestamp,
        currentState: { activePowerW, occupancyCount: 0 },
      });
    } else {
      this.resolveAlert(roomId, 'VACANCY_ENERGY_WASTE', timestamp);
    }

    // 3. HIGH CONSUMPTION Alert
    if (activePowerW > 3000.0) {
      this.triggerAlert({
        roomId,
        roomName,
        alertType: 'HIGH_CONSUMPTION',
        severity: 'HIGH',
        message: `High consumption surge: ${Math.round(activePowerW)}W exceeds 3kW threshold`,
        reason: 'Total active load exceeds room electrical design envelope',
        timestamp,
        currentState: { activePowerW },
      });
    } else {
      this.resolveAlert(roomId, 'HIGH_CONSUMPTION', timestamp);
    }

    // 4. HIGH CO2 Alert
    if (co2Ppm > 1200) {
      const severity = co2Ppm > 2000 ? 'CRITICAL' : co2Ppm > 1500 ? 'HIGH' : 'MEDIUM';
      this.triggerAlert({
        roomId,
        roomName,
        alertType: 'CO2_HIGH',
        severity,
        message: `Elevated CO2 level: ${Math.round(co2Ppm)} ppm indicates insufficient ventilation`,
        reason: 'Carbon dioxide concentration exceeds indoor air quality guidelines',
        timestamp,
        currentState: { co2Ppm, occupancyCount },
      });
    } else {
      this.resolveAlert(roomId, 'CO2_HIGH', timestamp);
    }

    // 5. COMFORT RISK Alert (occupied room temperature outside comfort 20-27°C)
    if (isOccupied && (temperatureC < 19.0 || temperatureC > 28.0)) {
      this.triggerAlert({
        roomId,
        roomName,
        alertType: 'COMFORT_RISK',
        severity: 'MEDIUM',
        message: `Comfort risk: Room temperature is ${roundTo(temperatureC, 1)}°C outside optimal 20-27°C range`,
        reason: 'Occupied space thermal comfort violation',
        timestamp,
        currentState: { temperatureC, occupancyCount },
      });
    } else {
      this.resolveAlert(roomId, 'COMFORT_RISK', timestamp);
    }
  }

  private triggerAlert(item: Omit<AlertItem, 'id' | 'isResolved'>): void {
    const key = `${item.roomId}:${item.alertType}`;
    const existing = this.activeAlerts.get(key);

    if (existing) {
      // Update existing alert timestamp and state
      existing.currentState = item.currentState;
      existing.message = item.message;
      return;
    }

    const alert: AlertItem = {
      id: randomUUID(),
      ...item,
      isResolved: false,
    };

    this.activeAlerts.set(key, alert);
    this.alertHistory.unshift(alert);
    if (this.alertHistory.length > 500) this.alertHistory.pop();

    publish(EventTypes.ALERT_CREATED, item.roomId, {
      alertId: alert.id,
      roomId: item.roomId,
      alertType: alert.alertType,
      severity: alert.severity,
      message: alert.message,
      reason: alert.reason,
      timestamp: alert.timestamp,
    });

    // Persist to PostgreSQL
    import('../../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.alert.create({
          data: {
            id: alert.id,
            roomId: alert.roomId,
            alertType: alert.alertType as any,
            severity: alert.severity as any,
            message: alert.message,
            details: alert.currentState as any,
            isResolved: false,
            createdAt: new Date(alert.timestamp),
          },
        });
      } catch (err) {
        logger.warn('Could not persist alert:', err);
      }
    });
  }

  private resolveAlert(roomId: string, alertType: string, timestamp: string): void {
    const key = `${roomId}:${alertType}`;
    const existing = this.activeAlerts.get(key);
    if (!existing) return;

    existing.isResolved = true;
    existing.resolvedAt = timestamp;
    this.activeAlerts.delete(key);

    publish(EventTypes.ALERT_UPDATED, roomId, {
      alertId: existing.id,
      roomId,
      alertType,
      isResolved: true,
      resolvedAt: timestamp,
    });

    // Update in PostgreSQL
    import('../../db/prisma.js').then(async ({ prisma, checkDatabaseConnection }) => {
      const connected = await checkDatabaseConnection();
      if (!connected) return;
      try {
        await prisma.alert.update({
          where: { id: existing.id },
          data: {
            isResolved: true,
            resolvedAt: new Date(timestamp),
          },
        });
      } catch {}
    });
  }

  public getBuildingAlerts(unresolvedOnly: boolean = true): AlertItem[] {
    if (unresolvedOnly) {
      return Array.from(this.activeAlerts.values());
    }
    return this.alertHistory;
  }

  public getRoomAlerts(roomId: string, unresolvedOnly: boolean = true): AlertItem[] {
    if (unresolvedOnly) {
      return Array.from(this.activeAlerts.values()).filter((a) => a.roomId === roomId);
    }
    return this.alertHistory.filter((a) => a.roomId === roomId);
  }
}

export const alertService = new AlertService();
