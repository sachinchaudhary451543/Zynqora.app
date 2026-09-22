import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';

describe('AuthService logout', () => {
  it('increments the token version and clears refresh session data', async () => {
    let updated = false;
    const service = new AuthService(
      { sign: () => 'signed-token' } as any,
      {
        user: {
          findUnique: async () => ({ id: 'user-1', tokenVersion: 2 }),
          update: async ({ where, data }) => {
            updated = true;
            assert.equal(where.id, 'user-1');
            assert.deepEqual(data, {
              refreshTokenHash: null,
              refreshTokenExpiresAt: null,
              tokenVersion: { increment: 1 },
            });
            return { id: 'user-1', tokenVersion: 3 };
          },
        },
      } as any,
    );

    const result = await service.logout('user-1');

    assert.equal(updated, true);
    assert.deepEqual(result, { message: 'Logged out successfully.' });
  });
});

describe('AuthService refreshSession', () => {
  it('rotates the refresh token for a valid session', async () => {
    const refreshToken = 'refresh-token-123';
    const refreshHash = createHash('sha256').update(refreshToken).digest('hex');

    const service = new AuthService(
      { sign: () => 'signed-token' } as any,
      {
        user: {
          findFirst: async () => ({
            id: 'user-1',
            email: 'user@example.com',
            username: 'user',
            name: 'User',
            avatarUrl: null,
            tokenVersion: 2,
            refreshTokenHash: refreshHash,
            refreshTokenExpiresAt: new Date(Date.now() + 60_000),
          }),
          update: async ({ data }) => {
            assert.ok(typeof data.refreshTokenHash === 'string');
            assert.notEqual(data.refreshTokenHash, refreshHash);
            assert.ok(data.refreshTokenExpiresAt instanceof Date);
            return {
              id: 'user-1',
              email: 'user@example.com',
              username: 'user',
              name: 'User',
              avatarUrl: null,
              tokenVersion: 2,
            };
          },
        },
      } as any,
    );

    const result = await (service as any).refreshSession(refreshToken);

    assert.equal(result.token, 'signed-token');
    assert.ok(typeof result.refreshToken === 'string' && result.refreshToken.length > 0);
    assert.equal(result.user.username, 'user');
  });
});
