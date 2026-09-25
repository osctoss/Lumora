import { randomUUID } from 'crypto';
import type { EventType, EventSource, IntelliSaveEvent } from '@intellisave/shared';
import { eventBus } from '../modules/events/event-bus.js';
import { eventLogService } from '../modules/events/event-log.service.js';
import { broadcastEvent } from './socket-server.js';

export function publish<T = Record<string, unknown>>(
  eventType: EventType,
  roomId: string | undefined,
  payload: T,
  source: EventSource = 'SIMULATION',
): IntelliSaveEvent<T> {
  const event: IntelliSaveEvent<T> = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    buildingId: 'building-demo-01',
    roomId,
    eventType,
    source,
    payload,
  };

  // 1. Emit on internal bus
  eventBus.emitEvent(eventType, event as any);

  // 2. Persist / buffer in log service
  eventLogService.logEvent(event as any);

  // 3. Broadcast to WebSocket clients
  broadcastEvent(eventType, roomId, event);

  return event;
}
