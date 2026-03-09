import express from 'express';
import { createLogger } from './../utils/logger';

const logger = createLogger(module);

export const timingMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  logger.info('Time of request: ', Date.now());
  next();
};
