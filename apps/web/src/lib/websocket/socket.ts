import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    const wsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || window.location.origin;
    socketInstance = io(wsUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    });
  }
  return socketInstance;
}
