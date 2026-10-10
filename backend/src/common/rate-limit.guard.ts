import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const WINDOW_MS = 60_000;

type RateLimitConfig = {
  maxRequests: number;
  windowMs?: number;
};

const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  '/auth/login': { maxRequests: 5 },
  '/auth/google/challenge': { maxRequests: 20 },
  '/auth/google': { maxRequests: 10 },
  '/auth/signup': { maxRequests: 5 },
  '/auth/refresh': { maxRequests: 15 },
  '/auth/username-availability': { maxRequests: 30 },
  '/auth/forgot-password': { maxRequests: 3 },
  '/auth/reset-password': { maxRequests: 3 },
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private static readonly buckets = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const route = (request.originalUrl || request.url || '').split('?')[0];
    const routeKey = Object.keys(ROUTE_LIMITS).find((path) => route.endsWith(path));
    const limit = routeKey ? ROUTE_LIMITS[routeKey] : undefined;

    if (!limit) {
      return true;
    }

    const key = `${request.ip || 'unknown'}:${routeKey}`;
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
