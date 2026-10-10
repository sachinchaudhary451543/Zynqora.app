import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';

describe('ChatService.getMessages', () => {
  it('loads only messages after a validated cursor', async () => {
    let query: Record<string, unknown> | undefined;
    const prisma = {
      conversationParticipant: { findFirst: async () => ({ userId: 'viewer' }) },
      message: {
        findFirst: async () => ({ id: 'message-1' }),
        findMany: async (args: Record<string, unknown>) => {
          query = args;
          return [{ id: 'message-2' }];
        },
      },
    };
    const service = new ChatService(prisma as any);

    const messages = await service.getMessages('conversation-1', 'viewer', 'message-1');

    assert.deepEqual(messages, [{ id: 'message-2' }]);
    assert.deepEqual(query, {
      where: { conversationId: 'conversation-1' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      cursor: { id: 'message-1' },
      skip: 1,
      take: 200,
      include: {
        sender: { select: { id: true, username: true, name: true, avatarUrl: true, profileImage: true } },
      },
    });
  });

  it('rejects a cursor that does not belong to the conversation', async () => {
    const prisma = {
      conversationParticipant: { findFirst: async () => ({ userId: 'viewer' }) },
      message: { findFirst: async () => null, findMany: async () => [] },
    };
    const service = new ChatService(prisma as any);

    await assert.rejects(
      service.getMessages('conversation-1', 'viewer', 'unknown-message'),
      NotFoundException,
    );
  });
});
