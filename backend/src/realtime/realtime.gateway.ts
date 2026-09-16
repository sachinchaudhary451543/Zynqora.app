import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

type SignalPayload = { targetUserId: string; signal: unknown; callId: string };
type LiveRoom = { broadcasterId: string; title: string; startedAt: string };

@WebSocketGateway({ namespace: '/realtime', cors: { origin: true, credentials: true } })
export class RealtimeGateway {
  @WebSocketServer() server!: Server;
  private readonly socketsByUser = new Map<string, Set<string>>();
  private readonly userBySocket = new Map<string, string>();
  private readonly pendingSignals = new Map<string, Array<{ fromUserId: string; signal: unknown }>>();
  private readonly liveRooms = new Map<string, LiveRoom>();

  constructor(private readonly jwt: JwtService) {}

  handleConnection(socket: Socket) {
    const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
    try {
      const payload = this.jwt.verify<{ sub?: string }>(token);
      if (!payload.sub) throw new Error('Missing subject');
      const sockets = this.socketsByUser.get(payload.sub) || new Set<string>();
      sockets.add(socket.id);
      this.socketsByUser.set(payload.sub, sockets);
      this.userBySocket.set(socket.id, payload.sub);
      socket.data.userId = payload.sub;
      this.server.emit('presence:online', { userId: payload.sub });
      socket.emit('live:list', Array.from(this.liveRooms.values()));
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = this.userBySocket.get(socket.id);
    if (!userId) return;
    const sockets = this.socketsByUser.get(userId);
    sockets?.delete(socket.id);
    if (!sockets?.size) this.socketsByUser.delete(userId);
    this.userBySocket.delete(socket.id);
    this.server.emit('presence:offline', { userId });
  }

  @SubscribeMessage('call:invite')
  invite(@ConnectedSocket() socket: Socket, @MessageBody() body: { targetUserId: string; callId: string; callType: 'audio' | 'video' }) {
    if (!socket.data.userId || body.targetUserId === socket.data.userId) {
      throw new Error('Unauthorized call invite');
    }
    this.emitToUser(body.targetUserId, 'call:incoming', { ...body, fromUserId: socket.data.userId });
  }

  @SubscribeMessage('call:signal')
  signal(@ConnectedSocket() socket: Socket, @MessageBody() body: SignalPayload) {
    if (!socket.data.userId) throw new Error('Unauthorized call signal');
    const queued = this.pendingSignals.get(body.callId) || [];
    queued.push({ fromUserId: socket.data.userId, signal: body.signal });
    this.pendingSignals.set(body.callId, queued.slice(-10));
    this.emitToUser(body.targetUserId, 'call:signal', { ...body, fromUserId: socket.data.userId });
  }

  @SubscribeMessage('call:join')
  join(@ConnectedSocket() socket: Socket, @MessageBody() body: { callId: string; targetUserId: string }) {
    if (!socket.data.userId) throw new Error('Unauthorized call join');
    if (body.targetUserId !== socket.data.userId && body.targetUserId !== undefined) {
      throw new Error('Unauthorized call join');
    }
    const queued = this.pendingSignals.get(body.callId) || [];
    for (const item of queued) {
      socket.emit('call:signal', { callId: body.callId, fromUserId: item.fromUserId, targetUserId: socket.data.userId, signal: item.signal });
    }
  }

  @SubscribeMessage('call:end')
  end(@ConnectedSocket() socket: Socket, @MessageBody() body: { targetUserId: string; callId: string }) {
    if (!socket.data.userId) throw new Error('Unauthorized call end');
    this.emitToUser(body.targetUserId, 'call:ended', { ...body, fromUserId: socket.data.userId });
    this.pendingSignals.delete(body.callId);
  }

  @SubscribeMessage('live:start')
  startLive(@ConnectedSocket() socket: Socket, @MessageBody() body: { title?: string }) {
    if (!socket.data.userId) throw new Error('Unauthorized live start');
    const room: LiveRoom = { broadcasterId: socket.data.userId, title: (body.title || 'Live Aura').trim().slice(0, 80), startedAt: new Date().toISOString() };
    this.liveRooms.set(room.broadcasterId, room);
    this.server.emit('live:list', Array.from(this.liveRooms.values()));
    return room;
  }

  @SubscribeMessage('live:join')
  joinLive(@ConnectedSocket() socket: Socket, @MessageBody() body: { broadcasterId: string }) {
    if (!socket.data.userId) throw new Error('Unauthorized live join');
    const room = this.liveRooms.get(body.broadcasterId);
    if (!room || room.broadcasterId === socket.data.userId) {
      return;
    }
    socket.join(`live:${body.broadcasterId}`);
    this.emitToUser(body.broadcasterId, 'live:viewer-joined', { viewerId: socket.data.userId });
  }

  @SubscribeMessage('live:signal')
  liveSignal(@ConnectedSocket() socket: Socket, @MessageBody() body: { targetUserId: string; signal: unknown }) {
    if (!socket.data.userId) throw new Error('Unauthorized live signal');
    this.emitToUser(body.targetUserId, 'live:signal', { fromUserId: socket.data.userId, signal: body.signal });
  }

  @SubscribeMessage('live:stop')
  stopLive(@ConnectedSocket() socket: Socket) {
    if (!socket.data.userId) throw new Error('Unauthorized live stop');
    if (!this.liveRooms.delete(socket.data.userId)) return;
    this.server.emit('live:ended', { broadcasterId: socket.data.userId });
    this.server.emit('live:list', Array.from(this.liveRooms.values()));
  }

  private emitToUser(userId: string, event: string, payload: unknown) {
    for (const socketId of this.socketsByUser.get(userId) || []) this.server.to(socketId).emit(event, payload);
  }
}
