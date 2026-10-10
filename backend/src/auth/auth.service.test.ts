import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
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

describe('AuthService login and session profile', () => {
  it('accepts an @username login and returns a signed session', async () => {
    const passwordHash = await bcrypt.hash('correct horse battery', 4);
    let lookup: any;
    const user = {
      id: 'user-2',
      email: 'user@example.com',
      username: 'member',
      name: 'Member',
      avatarUrl: null,
      passwordHash,
      tokenVersion: 0,
    };
    const service = new AuthService(
      { sign: () => 'signed-token' } as any,
      {
        user: {
          findFirst: async (args: any) => {
            lookup = args.where;
            return user;
          },
          update: async ({ data }: any) => ({ ...user, ...data }),
        },
      } as any,
    );

    const result = await service.login({ email: '@Member', password: 'correct horse battery' });

    assert.deepEqual(lookup, { OR: [{ email: 'member' }, { username: 'member' }] });
    assert.equal(result.token, 'signed-token');
    assert.equal(result.user.username, 'member');
    assert.equal(result.refreshToken.length, 64);
  });

  it('returns only safe account fields for the current session', async () => {
    let query: any;
    const service = new AuthService(
      { sign: () => 'unused' } as any,
      {
        user: {
          findUnique: async (args: any) => {
            query = args;
            return { id: 'user-3', email: 'member@example.com', username: 'member', name: 'Member' };
          },
        },
      } as any,
    );

    const result = await service.getCurrentUser('user-3');

    assert.equal(result.username, 'member');
    assert.ok(!('passwordHash' in result));
    assert.deepEqual(query.select, {
      id: true,
      email: true,
      username: true,
      name: true,
      avatarUrl: true,
      profileImage: true,
      bannerImage: true,
      bio: true,
      website: true,
      category: true,
      note: true,
      interests: true,
      notifySocialActivity: true,
      notifyCircleActivity: true,
      weeklyDigestEnabled: true,
      profileVisibility: true,
      followersVisibility: true,
      followingVisibility: true,
    });
  });

  describe('AuthService Google sign-in', () => {
    it('verifies the audience and one-time nonce before creating a linked account', async () => {
      const previousClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      process.env.GOOGLE_OAUTH_CLIENT_ID = 'web-client.apps.googleusercontent.com';
      const nonce = 'one-time-oauth-nonce';
      let createdData: any;
      let challengeQuery: any;
      let verifyArgs: any;
      let refreshData: any;
      const service = new AuthService(
        { sign: () => 'google-jwt' } as any,
        {
          googleAuthChallenge: {
            deleteMany: async (args: any) => {
              challengeQuery = args.where;
              return { count: 1 };
            },
          },
          user: {
            findUnique: async () => null,
            create: async ({ data }: any) => {
              createdData = data;
              return {
                ...data,
                id: 'google-user',
                tokenVersion: 0,
                interests: [],
              };
            },
            update: async ({ data }: any) => {
              refreshData = data;
              return {
                id: 'google-user',
                email: createdData.email,
                username: createdData.username,
                name: createdData.name,
                avatarUrl: createdData.avatarUrl,
                tokenVersion: 0,
                interests: [],
              };
            },
          },
        } as any,
      );
      (service as any).googleVerifier.verifyIdToken = async (args: any) => {
        verifyArgs = args;
        return {
          getPayload: () => ({
            sub: 'google-subject-1',
            email: 'person@example.com',
            email_verified: true,
            name: 'Person Example',
            picture: 'https://lh3.googleusercontent.com/avatar',
            nonce,
          }),
        };
      };

      try {
        const result = await service.loginWithGoogle('signed-google-id-token');

        assert.deepEqual(verifyArgs, {
          idToken: 'signed-google-id-token',
          audience: 'web-client.apps.googleusercontent.com',
        });
        assert.deepEqual(challengeQuery, {
          nonceHash: createHash('sha256').update(nonce).digest('hex'),
          expiresAt: { gt: challengeQuery.expiresAt.gt },
        });
        assert.ok(challengeQuery.expiresAt.gt instanceof Date);
        assert.equal(createdData.email, 'person@example.com');
        assert.match(createdData.username, /^person_[a-f0-9]{8}$/);
        assert.equal(createdData.googleSubject, 'google-subject-1');
        assert.equal(createdData.name, 'Person Example');
        assert.equal(createdData.avatarUrl, 'https://lh3.googleusercontent.com/avatar');
        assert.equal(result.token, 'google-jwt');
        assert.equal(result.user.id, 'google-user');
        assert.ok('recoveryCode' in result);
        assert.match(result.recoveryCode, /^[A-F0-9]{12}$/);
        assert.ok(typeof refreshData.refreshTokenHash === 'string');
      } finally {
        if (previousClientId === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
        else process.env.GOOGLE_OAUTH_CLIENT_ID = previousClientId;
      }
    });

    it('rejects a replayed or expired nonce', async () => {
      const previousClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      process.env.GOOGLE_OAUTH_CLIENT_ID = 'web-client.apps.googleusercontent.com';
      const service = new AuthService(
        { sign: () => 'unused' } as any,
        { googleAuthChallenge: { deleteMany: async () => ({ count: 0 }) } } as any,
      );
      (service as any).googleVerifier.verifyIdToken = async () => ({
        getPayload: () => ({
          sub: 'google-subject-1',
          email: 'person@example.com',
          email_verified: true,
          nonce: 'expired-nonce',
        }),
      });

      try {
        await assert.rejects(
          service.loginWithGoogle('signed-google-id-token'),
          /Google sign-in expired or was already used/,
        );
      } finally {
        if (previousClientId === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
        else process.env.GOOGLE_OAUTH_CLIENT_ID = previousClientId;
      }
    });

    it('links a verified matching email and reuses the linked Google identity', async () => {
      const previousClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      process.env.GOOGLE_OAUTH_CLIENT_ID = 'web-client.apps.googleusercontent.com';
      const existingUser: any = {
        id: 'existing-user',
        email: 'person@example.com',
        username: 'person',
        name: 'Person',
        avatarUrl: null,
        tokenVersion: 0,
        googleSubject: null,
        interests: [],
      };
      let sessionCount = 0;
      let nonceCount = 0;
      const service = new AuthService(
        { sign: () => 'google-jwt' } as any,
        {
          googleAuthChallenge: { deleteMany: async () => ({ count: 1 }) },
          user: {
            findUnique: async ({ where }: any) => {
              if (where.googleSubject) return existingUser.googleSubject === where.googleSubject ? existingUser : null;
              return where.email === existingUser.email ? existingUser : null;
            },
            update: async ({ data }: any) => {
              if (data.googleSubject) existingUser.googleSubject = data.googleSubject;
              else sessionCount += 1;
              return existingUser;
            },
          },
        } as any,
      );
      (service as any).googleVerifier.verifyIdToken = async () => ({
        getPayload: () => ({
          sub: 'google-subject-1',
          email: 'person@example.com',
          email_verified: true,
          nonce: `fresh-nonce-${nonceCount++}`,
        }),
      });

      try {
        const firstLogin = await service.loginWithGoogle('signed-google-id-token');
        const secondLogin = await service.loginWithGoogle('signed-google-id-token');

        assert.equal(existingUser.googleSubject, 'google-subject-1');
        assert.equal(firstLogin.user.id, 'existing-user');
        assert.equal(secondLogin.user.id, 'existing-user');
        assert.equal(sessionCount, 2);
        assert.ok(!('recoveryCode' in firstLogin));
      } finally {
        if (previousClientId === undefined) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
        else process.env.GOOGLE_OAUTH_CLIENT_ID = previousClientId;
      }
    });
  });
});
