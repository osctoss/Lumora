import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    let wsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || window.location.origin;
    if (wsUrl && !wsUrl.startsWith('http://') && !wsUrl.startsWith('https://') && !wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://') && !wsUrl.startsWith('/')) {
      wsUrl = `https://${wsUrl}`;
    }
    socketInstance = io(wsUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    });
  }
  return socketInstance;
}
