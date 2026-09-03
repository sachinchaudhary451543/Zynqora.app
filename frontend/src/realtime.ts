import { io, Socket } from 'socket.io-client';

export function createRealtimeSocket(): Socket {
  const configured = import.meta.env.VITE_API_BASE as string | undefined;
  const origin = configured
    ? new URL(configured, window.location.origin).origin
    : (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);
  return io(`${origin}/realtime`, {
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnectionAttempts: 5,
    auth: { token: localStorage.getItem('token') || '' },
  });
}
