import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeGateway authorization', () => {
  it('rejects request to join a call as a different user', () => {
    const gateway = new RealtimeGateway({ verify: () => ({ sub: 'user-1' }) } as any);
    const server = { emit: () => undefined, to: () => ({ emit: () => undefined }) };
    (gateway as any).server = server;
    (gateway as any).pendingSignals = new Map([['call-1', [{ fromUserId: 'user-2', signal: { offer: 'abc' } }]]]);
    const socket = { data: { userId: 'user-3' }, emit: () => undefined } as any;

    assert.throws(() => gateway.join(socket, { callId: 'call-1', targetUserId: 'user-2' }), /Unauthorized/);
  });

  it('refuses live room joins for unauthorised broadcasters', () => {
    const gateway = new RealtimeGateway({ verify: () => ({ sub: 'user-1' }) } as any);
    const server = { emit: () => undefined, to: () => ({ emit: () => undefined }) };
    (gateway as any).server = server;
    (gateway as any).liveRooms = new Map([['user-2', { broadcasterId: 'user-2', title: 'Live', startedAt: new Date().toISOString() }]]);
    const socket = { data: { userId: 'user-3' }, join: () => undefined } as any;

    assert.doesNotThrow(() => gateway.joinLive(socket, { broadcasterId: 'user-2' }));
    assert.equal((socket as any).joinedRoom, undefined);
  });
});
