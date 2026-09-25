import type { IntelliSaveEvent } from '@intellisave/shared';
import { prisma, checkDatabaseConnection } from '../../db/prisma.js';

class EventLogService {
  private recentEvents: IntelliSaveEvent[] = [];
  private maxMemoryEvents = 500;
  private lastDbCheckTime = 0;
  private isDbAvailable = false;

  async logEvent(event: IntelliSaveEvent): Promise<void> {
    // Keep in-memory rolling buffer
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > this.maxMemoryEvents) {
      this.recentEvents.pop();
    }

    const now = Date.now();
    // Cache check every 60 seconds to prevent query spam when offline
    if (now - this.lastDbCheckTime > 60000) {
      this.lastDbCheckTime = now;
      this.isDbAvailable = await checkDatabaseConnection();
    }

    if (this.isDbAvailable) {
      try {
        await prisma.eventLog.create({
          data: {
            eventId: event.eventId,
            eventType: event.eventType,
            source: event.source as any,
            timestamp: new Date(event.timestamp),
            payload: event.payload as any,
          },
        });
      } catch {
        this.isDbAvailable = false;
      }
    }
  }

  getRecentEvents(limit: number = 50, roomId?: string): IntelliSaveEvent[] {
    if (roomId) {
      return this.recentEvents.filter((e) => e.roomId === roomId).slice(0, limit);
    }
    return this.recentEvents.slice(0, limit);
  }
}

export const eventLogService = new EventLogService();
