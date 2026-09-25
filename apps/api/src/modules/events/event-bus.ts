import { EventEmitter } from 'events';
import type { EventType, IntelliSaveEvent } from '@intellisave/shared';
import { logger } from '../../utils/logger.js';

class TypedEventBus extends EventEmitter {
  emitEvent<T = Record<string, unknown>>(type: EventType, event: IntelliSaveEvent<T>): boolean {
    logger.debug(`[EventBus] Emitting ${type} for room ${event.roomId || 'global'}`);
    return this.emit(type, event);
  }

  onEvent<T = Record<string, unknown>>(type: EventType, handler: (event: IntelliSaveEvent<T>) => void): this {
    return this.on(type, handler as (...args: unknown[]) => void);
  }
}

export const eventBus = new TypedEventBus();
