import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger.js';
import { eventBus } from '../modules/events/event-bus.js';
import type { EventType, IntelliSaveEvent } from '@intellisave/shared';

let ioInstance: SocketIOServer | null = null;

export function initSocketServer(server: HttpServer): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`🔌 Socket client connected: ${socket.id}`);

    // Join room subscription
    socket.on('subscribe:room', (roomId: string) => {
      socket.join(`room:${roomId}`);
      logger.info(`Socket ${socket.id} subscribed to room:${roomId}`);
    });

    socket.on('unsubscribe:room', (roomId: string) => {
      socket.leave(`room:${roomId}`);
      logger.info(`Socket ${socket.id} unsubscribed from room:${roomId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket client disconnected: ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return ioInstance;
}

export function broadcastEvent<T = Record<string, unknown>>(
  eventType: EventType,
  roomId: string | undefined,
  event: IntelliSaveEvent<T>,
): void {
  if (!ioInstance) return;

  if (roomId) {
    ioInstance.to(`room:${roomId}`).emit(eventType, event);
  }
  // Also emit to global broadcast for dashboard listeners
  ioInstance.emit(eventType, event);
}
