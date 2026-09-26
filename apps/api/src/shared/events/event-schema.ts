import type { EventType } from './event-types.js';

export type EventSource = 'USER' | 'SIMULATION' | 'AUTOMATION' | 'SYSTEM' | 'AI';

export interface IntelliSaveEvent<T = Record<string, unknown>> {
  eventId: string;
  timestamp: string;
  buildingId: string;
  roomId?: string;
  source: EventSource;
  eventType: EventType;
  payload: T;
}
