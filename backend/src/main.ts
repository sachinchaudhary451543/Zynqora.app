import 'reflect-metadata';
import { randomUUID } from 'crypto';
import * as Sentry from '@sentry/node';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { validateRuntimeConfig } from './common/runtime-config';
import { SanitizedHttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const runtimeConfig = validateRuntimeConfig(process.env as Record<string, string | undefined>);

  if (runtimeConfig.nodeEnv === 'production' && runtimeConfig.sentryDsn) {
    Sentry.init({
      dsn: runtimeConfig.sentryDsn,
      environment: runtimeConfig.nodeEnv,
      enabled: true,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
    logger.log('Sentry initialized');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use((request: Request, response: Response, next: NextFunction) => {
    const requestId = randomUUID();
    const startedAt = process.hrtime.bigint();
    response.setHeader('X-Request-Id', requestId);
    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const entry = JSON.stringify({
        requestId,
        method: request.method,
        path: request.originalUrl.split('?')[0],
        statusCode: response.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
      if (response.statusCode >= 500) logger.error(entry);
      else if (response.statusCode >= 400) logger.warn(entry);
      else logger.log(entry);
    });
    next();
  });

  const allowedOrigins = runtimeConfig.corsOrigin.length > 0
    ? runtimeConfig.corsOrigin
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

  if (runtimeConfig.nodeEnv !== 'production') {
    app.enableCors({ origin: true, credentials: true });
  } else {
    app.enableCors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = allowedOrigins.includes(origin);
        callback(null, allowed);
      },
      credentials: true,
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    }),
  );

  app.useGlobalFilters(new SanitizedHttpExceptionFilter());

  if (runtimeConfig.nodeEnv === 'production' && runtimeConfig.sentryDsn) {
    Sentry.setupExpressErrorHandler(app);
  }

  app.setGlobalPrefix('api');

  app.useStaticAssets(join(process.cwd(), 'public'));

  app.enableShutdownHooks();
  await app.listen(runtimeConfig.port);
  logger.log(`Backend running on http://localhost:${runtimeConfig.port}/api`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Application startup failed', error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
