import { io, Socket } from 'socket.io-client';
import { API_ORIGIN } from './api/config';

export function createRealtimeSocket(): Socket {
  return io(`${API_ORIGIN}/realtime`, {
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnectionAttempts: 5,
    auth: { token: localStorage.getItem('token') || '' },
  });
}
