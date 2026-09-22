import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const WINDOW_MS = 60_000;

type RateLimitConfig = {
  maxRequests: number;
  windowMs?: number;
};

const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/auth/login': { maxRequests: 5 },
  '/api/auth/forgot-password': { maxRequests: 3 },
  '/api/auth/reset-password': { maxRequests: 3 },
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private static readonly buckets = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const route = request.route?.path || request.originalUrl || request.url || '';
    const limit = ROUTE_LIMITS[route] ?? ROUTE_LIMITS[request.path];

    if (!limit) {
      return true;
    }

    const key = `${request.ip || 'unknown'}:${route}`;
    const now = Date.now();
    const bucket = AuthRateLimitGuard.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      AuthRateLimitGuard.buckets.set(key, { count: 1, resetAt: now + (limit.windowMs ?? WINDOW_MS) });
      return true;
    }

    if (bucket.count >= limit.maxRequests) {
      throw new HttpException('Too many requests. Please wait a moment and try again.', 429);
    }

    bucket.count += 1;
    return true;
  }
}
