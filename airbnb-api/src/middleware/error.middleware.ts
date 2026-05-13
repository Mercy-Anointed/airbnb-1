import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../config/logger';

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly errors?: Record<string, unknown> | unknown[]
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  logger.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);

  if (!env.IS_PRODUCTION) {
    logger.error(err.stack);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.flatten().fieldErrors as Record<string, unknown>,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A record with this value already exists',
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Database operation failed: ${err.code} - ${err.message}`,
    });
  }

  return res.status(500).json({
    success: false,
    message: env.IS_PRODUCTION ? 'Internal server error' : err.message,
  });
};