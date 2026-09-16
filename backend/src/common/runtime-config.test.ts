import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateRuntimeConfig } from './runtime-config';

describe('validateRuntimeConfig', () => {
  it('rejects weak JWT secrets in production', () => {
    assert.throws(() =>
      validateRuntimeConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/family_app?schema=public',
        JWT_SECRET: 'too-short',
        PORT: '3000',
      }),
      /JWT_SECRET/,
    );
  });

  it('accepts a valid production config', () => {
    const config = validateRuntimeConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/family_app?schema=public',
      JWT_SECRET: 'abcdefghijklmnopqrstuvwxyz123456',
      JWT_EXPIRES_IN: '15m',
      PORT: '3000',
      CORS_ORIGIN: 'https://app.example.com',
      SERVER_BASE_URL: 'https://api.example.com',
      SENTRY_DSN: 'https://examplePublicKey@o0.ingest.sentry.io/0',
    });

    assert.equal(config.jwtExpiresIn, '15m');
    assert.deepEqual(config.corsOrigin, ['https://app.example.com']);
    assert.equal(config.port, 3000);
    assert.equal(config.sentryDsn, 'https://examplePublicKey@o0.ingest.sentry.io/0');
  });
});
