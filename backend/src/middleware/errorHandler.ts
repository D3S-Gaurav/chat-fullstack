/** @module middleware/errorHandler — Custom error classes and global Express error handler. */

import type { Request, Response, NextFunction } from 'express';
import * as z from 'zod';
import { Prisma } from '../../generated/prisma/client.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

//Custom Error Classes

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean = true;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Validation error carrying Zod field-level details.
 * Always responds with 422 Unprocessable Entity.
 */
export class ValidationError extends AppError {
  public readonly fields: { formErrors: string[]; fieldErrors: Record<string, string[]> };

  constructor(zodError: z.ZodError) {
    super(422, 'Validation failed');
    this.fields = z.flattenError(zodError);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Expired JWT error. Carries `expired: true` so the client
 * can distinguish token-expiry from other 401s and trigger a refresh.
 */
export class ExpiredTokenError extends AppError {
  public readonly expired = true as const;

  constructor() {
    super(401, 'Token expired');
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

//Error Response Shape

interface ErrorResponseBody {
  success: false;
  statusCode: number;
  message: string;
  fields?: { formErrors: string[]; fieldErrors: Record<string, string[]> };
  expired?: true;
  stack?: string;
}

//Global Error Handler

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let fields: { formErrors: string[]; fieldErrors: Record<string, string[]> } | undefined;
  let expired: true | undefined;

  //AppError (includes ValidationError, ExpiredTokenError)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    if (err instanceof ValidationError) fields = err.fields;
    if (err instanceof ExpiredTokenError) expired = true;
  }
  //Raw ZodError (thrown outside validate middleware)
  else if (err instanceof z.ZodError) {
    statusCode = 422;
    message = 'Validation failed';
    fields = z.flattenError(err);
  }
  //Prisma known errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Resource already exists';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Resource not found';
        break;
      default:
        statusCode = 400;
        message = 'Database request error';
    }
  }

  // In production, never expose internal error messages for 500s
  if (statusCode === 500 && env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  // Log every error via structured async logger
  logger.error(
    { statusCode, method: req.method, path: req.path, err },
    `${req.method} ${req.path} → ${String(statusCode)}: ${err.message}`,
  );

  const body: ErrorResponseBody = {
    success: false,
    statusCode,
    message,
  };

  if (fields) body.fields = fields;
  if (expired) body.expired = expired;
  if (env.NODE_ENV !== 'production' && err.stack) body.stack = err.stack;

  res.status(statusCode).json(body);
}
