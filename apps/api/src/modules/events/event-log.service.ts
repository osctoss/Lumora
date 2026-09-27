import type { IntelliSaveEvent } from '@intellisave/shared';
import { prisma, checkDatabaseConnection } from '../../db/prisma.js';

class EventLogService {
  private recentEvents: IntelliSaveEvent[] = [];
  private readonly maxEvents = 20;
  private lastDbCheckTime = 0;
  private isDbAvailable = false;

  async initializeFromDb(): Promise<void> {
    try {
      this.isDbAvailable = await checkDatabaseConnection();
      if (!this.isDbAvailable) return;

      // Prune any existing records beyond the latest 20 to save database space
      const total = await prisma.eventLog.count();
      if (total > this.maxEvents) {
        const excess = total - this.maxEvents;
        const oldest = await prisma.eventLog.findMany({
          take: excess,
          orderBy: { timestamp: 'asc' },
          select: { id: true },
        });
        if (oldest.length > 0) {
          await prisma.eventLog.deleteMany({
            where: { id: { in: oldest.map((r) => r.id) } },
          });
        }
      }

      // Load the latest 20 events into memory buffer
      const rows = await prisma.eventLog.findMany({
        take: this.maxEvents,
        orderBy: { timestamp: 'desc' },
      });

      if (rows.length > 0) {
        this.recentEvents = rows.map((r) => ({
          eventId: r.eventId,
          timestamp: r.timestamp.toISOString(),
          buildingId: 'building-demo-01',
          eventType: r.eventType as any,
          source: r.source as any,
          payload: (r.payload as any) || {},
        }));
      }
    } catch {
      // Non-blocking fallback
    }
  }

  async logEvent(event: IntelliSaveEvent): Promise<void> {
    // Keep in-memory rolling buffer (max 20)
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > this.maxEvents) {
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
        // 1. Persist the new event
        await prisma.eventLog.create({
          data: {
            eventId: event.eventId,
            eventType: event.eventType,
            source: event.source as any,
            timestamp: new Date(event.timestamp),
            payload: event.payload as any,
          },
        });

        // 2. Space optimization: Keep only the latest 20 events in database (FIFO)
        // If a 21st event is recorded, delete the oldest one
        const total = await prisma.eventLog.count();
        if (total > this.maxEvents) {
          const excess = total - this.maxEvents;
          const oldestRecords = await prisma.eventLog.findMany({
            take: excess,
            orderBy: { timestamp: 'asc' },
            select: { id: true },
          });
          if (oldestRecords.length > 0) {
            await prisma.eventLog.deleteMany({
              where: { id: { in: oldestRecords.map((r) => r.id) } },
            });
          }
        }
      } catch {
        this.isDbAvailable = false;
      }
    }
  }

  getRecentEvents(limit: number = 20, roomId?: string): IntelliSaveEvent[] {
    const effectiveLimit = Math.min(limit, this.maxEvents);
    if (roomId) {
      return this.recentEvents.filter((e) => e.roomId === roomId).slice(0, effectiveLimit);
    }
    return this.recentEvents.slice(0, effectiveLimit);
  }

  async getEventsPaginated(params: {
    limit?: number;
    offset?: number;
    roomId?: string;
  }): Promise<{ events: IntelliSaveEvent[]; total: number; limit: number; offset: number }> {
    const limit = Math.min(this.maxEvents, Math.max(1, params.limit || this.maxEvents));
    const offset = Math.max(0, params.offset || 0);

    // Filter in-memory buffer
    let filtered = this.recentEvents;
    if (params.roomId) {
      filtered = filtered.filter((e) => e.roomId === params.roomId);
    }

    const total = filtered.length;
    const events = filtered.slice(offset, offset + limit);
    return { events, total, limit, offset };
  }
}

export const eventLogService = new EventLogService();
