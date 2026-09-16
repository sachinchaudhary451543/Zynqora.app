import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertAllowedUploadMime,
  assertSafeRemoteUrl,
  safeUploadPath,
  sanitizeUploadName,
} from './upload-safety';

describe('upload safety', () => {
  it('accepts supported media types and rejects unsupported types', () => {
    assert.doesNotThrow(() => assertAllowedUploadMime('image/png'));
    assert.throws(() => assertAllowedUploadMime('application/javascript'), /Unsupported upload type/);
  });

  it('sanitizes filenames and rejects empty names', () => {
    assert.equal(sanitizeUploadName('../family photo.png'), '.._family_photo.png');
    assert.throws(() => sanitizeUploadName(''), /Invalid filename/);
  });

  it('keeps resolved upload paths inside the upload directory', () => {
    assert.match(safeUploadPath('public/uploads', 'photo.png'), /public[\\/]uploads[\\/]photo\.png$/);
    assert.throws(() => safeUploadPath('public/uploads', '../secret.txt'), /Invalid upload path/);
  });

  it('rejects private and non-http remote URLs', () => {
    assert.throws(() => assertSafeRemoteUrl('http://127.0.0.1/image.png'), /URL host is not allowed/);
    assert.throws(() => assertSafeRemoteUrl('http://169.254.169.254/latest/meta-data'), /URL host is not allowed/);
    assert.throws(() => assertSafeRemoteUrl('file:///etc/passwd'), /Only HTTP\(S\) URLs are supported/);
  });

  it('accepts public HTTPS URLs', () => {
    assert.doesNotThrow(() => assertSafeRemoteUrl('https://cdn.example.com/image.png'));
  });
});
