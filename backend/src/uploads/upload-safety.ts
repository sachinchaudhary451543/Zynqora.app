import { BadRequestException } from '@nestjs/common';
import { resolve, sep } from 'path';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/webm',
]);

export function sanitizeUploadName(filename: string) {
  const clean = (filename || '').replace(/[^a-zA-Z0-9.\-]/g, '_').replace(/_+/g, '_');
  if (!clean || clean === '.' || clean === '..') {
    throw new BadRequestException('Invalid filename');
  }
  return clean.slice(0, 160);
}

export function assertAllowedUploadMime(contentType?: string | null) {
  if (!contentType || !ALLOWED_UPLOAD_MIME_TYPES.has(contentType.toLowerCase())) {
    throw new BadRequestException('Unsupported upload type');
  }
}

export function safeUploadPath(uploadsDir: string, key: string) {
  const base = resolve(uploadsDir);
  const target = resolve(base, key || '');
  if (target !== base && target.startsWith(`${base}${sep}`)) return target;
  throw new BadRequestException('Invalid upload path');
}

export function assertSafeRemoteUrl(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Invalid URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestException('Only HTTP(S) URLs are supported');
  }

  const host = parsed.hostname.toLowerCase();
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  const first = ipv4 ? Number(ipv4[1]) : null;
  const second = ipv4 ? Number(ipv4[2]) : null;
  const blocked =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '::1' ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80') ||
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 169 && second === 254) ||
    (first === 172 && second !== null && second >= 16 && second <= 31) ||
    (first === 192 && second === 168);

  if (blocked) throw new BadRequestException('URL host is not allowed');
}
