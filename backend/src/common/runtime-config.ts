export type JwtExpiresIn = `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

export type RuntimeConfig = {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: JwtExpiresIn | number;
  corsOrigin: string[];
  serverBaseUrl?: string;
  sentryDsn?: string;
};

export function validateRuntimeConfig(input: Record<string, string | undefined>): RuntimeConfig {
  const nodeEnv = (input.NODE_ENV ?? 'development').toLowerCase();
  const normalizedNodeEnv = nodeEnv === 'production' || nodeEnv === 'test' ? nodeEnv : 'development';
  const databaseUrl = input.DATABASE_URL?.trim();
  const jwtSecret = input.JWT_SECRET?.trim();
  const port = Number(input.PORT ?? '3000');
  const jwtExpiresIn = (input.JWT_EXPIRES_IN?.trim() || '7d') as JwtExpiresIn;
  const corsOrigin = input.CORS_ORIGIN?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
  const serverBaseUrl = input.SERVER_BASE_URL?.trim() || undefined;
  const sentryDsn = input.SENTRY_DSN?.trim() || undefined;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }

  if (normalizedNodeEnv === 'production' && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  if (normalizedNodeEnv === 'production' && !sentryDsn) {
    throw new Error('SENTRY_DSN is required in production');
  }

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  return {
    nodeEnv: normalizedNodeEnv,
    port,
    databaseUrl,
    jwtSecret,
    jwtExpiresIn,
    corsOrigin,
    serverBaseUrl,
    sentryDsn,
  };
}
