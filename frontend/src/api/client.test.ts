import { describe, expect, it } from 'vitest';
import { getDefaultAvatar, normalizeConnectionUsers, resolveMediaUrl } from './client';

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
});
