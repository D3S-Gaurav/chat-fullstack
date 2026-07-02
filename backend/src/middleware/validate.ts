import type { Request, Response, NextFunction } from 'express';
import * as z from 'zod';
import { ValidationError } from './errorHandler.js';

export function validate(
  schema: z.ZodType,
  target: 'body' | 'params' | 'query' = 'body',
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(new ValidationError(result.error));
      return;
    }

    // Replace raw input with the parsed & coerced output
    switch (target) {
      case 'body':
        Object.defineProperty(req, 'body', { value: result.data, configurable: true, writable: true, enumerable: true });
        break;
      case 'params':
        Object.defineProperty(req, 'params', { value: result.data, configurable: true, writable: true, enumerable: true });
        break;
      case 'query':
        Object.defineProperty(req, 'query', { value: result.data, configurable: true, writable: true, enumerable: true });
        break;
    }

    next();
  };
}
