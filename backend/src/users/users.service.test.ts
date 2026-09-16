import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UsersService } from './users.service';

describe('UsersService account deletion', () => {
  it('cleans linked records in a transaction before deleting the user', async () => {
    const calls: string[] = [];
    const tx = {
      comment: {
        deleteMany: async ({ where }: any) => calls.push(`comment:${JSON.stringify(where)}`),
      },
      like: {
        deleteMany: async ({ where }: any) => calls.push(`like:${JSON.stringify(where)}`),
      },
      story: {
        deleteMany: async ({ where }: any) => calls.push(`story:${JSON.stringify(where)}`),
      },
      message: {
        deleteMany: async ({ where }: any) => calls.push(`message:${JSON.stringify(where)}`),
      },
      conversationParticipant: {
        deleteMany: async ({ where }: any) => calls.push(`participant:${JSON.stringify(where)}`),
      },
      notification: {
        deleteMany: async ({ where }: any) => calls.push(`notification:${JSON.stringify(where)}`),
      },
      follow: {
        deleteMany: async ({ where }: any) => calls.push(`follow:${JSON.stringify(where)}`),
      },
      post: {
        findMany: async () => [{ id: 'post-1' }],
        deleteMany: async ({ where }: any) => calls.push(`post:${JSON.stringify(where)}`),
      },
      user: {
        delete: async ({ where }: any) => calls.push(`user:${JSON.stringify(where)}`),
      },
    };
    const prisma = {
      $transaction: async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx),
    };

    const service = new UsersService(prisma as any);
    const result = await service.deleteAccount('user-1');

    assert.deepEqual(result, { deleted: true });
    assert.equal(calls.at(-1), 'user:{"id":"user-1"}');
    assert.equal(calls.includes('post:{"id":{"in":["post-1"]}}'), true);
  });
});
