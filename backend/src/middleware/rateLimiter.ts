import type { Request, Response, NextFunction } from 'express';
import { rateLimit, type Options } from 'express-rate-limit';
import { AppError } from './errorHandler.js';

/** Shared handler that routes 429 errors through the global errorHandler. */
function rateLimitHandler(
  _req: Request,
  _res: Response,
  next: NextFunction,
  _options: Options,
): void {
  next(new AppError(429, 'Too many requests — please try again later'));
}

/**
 * Global limiter — 100 requests per 15 minutes per IP.
 * Apply to all routes: `app.use(globalLimiter)`
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Message limiter — 30 requests per 1 minute per IP.
 * Apply to message send endpoints.
 */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rateLimitHandler,
});
