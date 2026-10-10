import { describe, expect, it, vi } from 'vitest';
import { api, getAvatarUrl, getDefaultAvatar, normalizeConnectionUsers, resolveMediaUrl } from './client';

describe('api client helpers', () => {
  it('resolves local upload paths against the API origin', () => {
    expect(resolveMediaUrl('/uploads/photo.png')).toBe('http://localhost:3000/uploads/photo.png');
    expect(resolveMediaUrl('https://cdn.example.com/photo.png')).toBe('https://cdn.example.com/photo.png');
  });

  it('normalizes follower and following relation records', () => {
    expect(normalizeConnectionUsers([
      { follower: { username: 'alex', name: 'Alex' } },
      { username: 'sam', name: 'Sam' },
      { follower: { username: '', name: 'Missing username' } },
    ], 'follower')).toEqual([
      { username: 'alex', name: 'Alex' },
      { username: 'sam', name: 'Sam' },
    ]);
  });

  it('creates a deterministic fallback avatar data URL', () => {
    const first = getDefaultAvatar('Alex');
    expect(first).toMatch(/^data:image\/svg\+xml;utf8,/);
    expect(getDefaultAvatar('Alex')).toBe(first);
  });

  it('uses a generated avatar for legacy uploads on ephemeral production hosts', () => {
    expect(getAvatarUrl({
      name: 'Alex',
      username: 'alex',
      avatarUrl: 'https://zynqora-api.onrender.com/uploads/old-photo.jpg',
    })).toBe(getDefaultAvatar('Alex'));
    expect(getAvatarUrl({
      name: 'Alex',
      username: 'alex',
      avatarUrl: 'https://cdn.example.com/uploads/photo.jpg',
    })).toBe('https://cdn.example.com/uploads/photo.jpg');
  });

  it('uploads media through the signed URL and rejects failed storage responses', async () => {
    const presign = vi.spyOn(api, 'presignUpload').mockResolvedValue({
      method: 'PUT',
      uploadUrl: 'https://storage.example/upload',
      publicUrl: 'https://cdn.example/photo.png',
      key: 'photo.png',
    });
    const uploadLocal = vi.spyOn(api, 'uploadLocal');
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    try {
      await expect(api.uploadMedia(new File(['image'], 'photo.png', { type: 'image/png' })))
        .resolves.toEqual({ key: 'photo.png', publicUrl: 'https://cdn.example/photo.png' });
      expect(fetchMock).toHaveBeenCalledWith('https://storage.example/upload', expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
      }));
      expect(uploadLocal).not.toHaveBeenCalled();

      fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
      await expect(api.uploadMedia(new File(['image'], 'photo.png', { type: 'image/png' })))
        .rejects.toThrow('Media upload failed (403)');
    } finally {
      presign.mockRestore();
      uploadLocal.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('requests a nonce and submits the Google ID token to the auth endpoints', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ nonce: 'one-time-nonce' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        token: 'session-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-1', email: 'person@example.com', username: 'person', name: 'Person' },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('fetch', fetchMock);

    try {
      await expect(api.getGoogleAuthChallenge()).resolves.toEqual({ nonce: 'one-time-nonce' });
      await expect(api.loginWithGoogle('signed-id-token')).resolves.toMatchObject({
        token: 'session-token',
        user: { username: 'person' },
      });
      expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/api/auth/google/challenge');
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
      expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:3000/api/auth/google');
      expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ idToken: 'signed-id-token' });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('refreshes an expired access token and retries the current-session request', async () => {
    const values = new Map<string, string>([
      ['token', 'expired-access-token'],
      ['refreshToken', 'valid-refresh-token'],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    const auth = {
      token: 'new-access-token',
      refreshToken: 'rotated-refresh-token',
      user: { id: 'user-1', email: 'person@example.com', username: 'person', name: 'Person' },
    };
    let sessionRequests = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        return new Response(JSON.stringify(auth), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      sessionRequests += 1;
      if (sessionRequests === 1) {
        return new Response(JSON.stringify({ message: 'Expired token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify(auth.user), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('CustomEvent', class extends Event {
      detail: unknown;
      constructor(type: string, init?: { detail?: unknown }) {
        super(type);
        this.detail = init?.detail;
      }
    });

    try {
      const user = await api.getCurrentUser();
      expect(user.username).toBe('person');
      expect(sessionRequests).toBe(2);
      expect(values.get('token')).toBe('new-access-token');
      expect(values.get('refreshToken')).toBe('rotated-refresh-token');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
