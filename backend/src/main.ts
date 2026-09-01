import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://192.168.31.191:5173,http://192.168.31.191:5174,http://192.168.31.191:5175')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    // during local development allow any origin for convenience
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
    }),
  );

  app.setGlobalPrefix('api');

  // Serve uploaded files locally for development at /uploads/*
  app.useStaticAssets(join(process.cwd(), 'public'));

  const port = process.env.PORT ?? 3000;
  app.enableShutdownHooks();
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api`);
}
bootstrap();
