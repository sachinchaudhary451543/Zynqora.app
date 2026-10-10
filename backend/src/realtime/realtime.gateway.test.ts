import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RealtimeGateway } from './realtime.gateway';

describe('RealtimeGateway authorization', () => {
  it('rejects request to join a call as a different user', () => {
    const gateway = new RealtimeGateway({ verify: () => ({ sub: 'user-1' }) } as any);
    const server = { emit: () => undefined, to: () => ({ emit: () => undefined }) };
    (gateway as any).server = server;
    (gateway as any).callParticipants = new Map([['call-1', { callerId: 'user-2', targetUserId: 'user-3' }]]);
    (gateway as any).pendingSignals = new Map([['call-1', [{ fromUserId: 'user-2', targetUserId: 'user-3', signal: { offer: 'abc' } }]]]);
    const socket = { data: { userId: 'user-4' }, emit: () => undefined } as any;

    assert.throws(() => gateway.join(socket, { callId: 'call-1' }), /Unauthorized/);
  });

  it('only relays signaling between participants in the invited call', () => {
    const gateway = new RealtimeGateway({ verify: () => ({ sub: 'user-1' }) } as any);
    const server = { emit: () => undefined, to: () => ({ emit: () => undefined }) };
    (gateway as any).server = server;
    gateway.invite({ data: { userId: 'caller' } } as any, {
      targetUserId: 'callee',
      callId: 'call-1',
      callType: 'audio',
    });

    assert.throws(() => gateway.signal(
      { data: { userId: 'intruder' } } as any,
      { targetUserId: 'callee', callId: 'call-1', signal: { candidate: 'fake' } },
    ), /Unauthorized/);
    assert.throws(() => gateway.signal(
      { data: { userId: 'caller' } } as any,
      { targetUserId: 'intruder', callId: 'call-1', signal: { candidate: 'fake' } },
    ), /Unauthorized/);
  });

  it('only replays pending call signals to their intended recipient', () => {
    const gateway = new RealtimeGateway({ verify: () => ({ sub: 'user-1' }) } as any);
    const delivered: Array<{ targetUserId: string; signal: unknown }> = [];
    const server = { emit: () => undefined, to: () => ({ emit: () => undefined }) };
    (gateway as any).server = server;
    gateway.invite({ data: { userId: 'caller' } } as any, {
      targetUserId: 'callee',
      callId: 'call-1',
      callType: 'audio',
    });
    gateway.signal({ data: { userId: 'caller' } } as any, {
      targetUserId: 'callee',
      callId: 'call-1',
      signal: { description: { type: 'offer' } },
    });

    gateway.join({ data: { userId: 'caller' }, emit: () => undefined } as any, { callId: 'call-1' });
    const calleeSocket = {
      data: { userId: 'callee' },
      emit: (_event: string, payload: { targetUserId: string; signal: unknown }) => delivered.push(payload),
    };
    gateway.join(calleeSocket as any, { callId: 'call-1' });

    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].targetUserId, 'callee');
    assert.deepEqual(delivered[0].signal, { description: { type: 'offer' } });
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
