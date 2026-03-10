import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { NotFoundError, ConflictError, ValidationError } from '../types/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger(module);

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (
    err instanceof NotFoundError ||
    err instanceof ConflictError ||
    err instanceof ValidationError
  ) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
    return;
  }

  logger.error('Unhandled error', { message: err.message });
  res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
}
