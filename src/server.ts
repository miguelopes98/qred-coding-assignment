import express, { Application } from 'express';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';
import { createLogger } from './utils/logger';
import { v1Router } from './routes';
import { timingMiddleware, errorHandler } from './middlewares';

const logger = createLogger(module);

export class Server {
  expressApp: Application;
  port: number;

  constructor(port: number) {
    this.expressApp = express();
    this.port = port;

    this.expressApp.use(express.json());
    this.expressApp.use(timingMiddleware);

    this.expressApp.get('/_ping', (req, res) => res.send({ ok: true }));

    const swaggerDocument = yaml.load(
      fs.readFileSync(path.join(__dirname, '..', 'swagger.yaml'), 'utf8')
    ) as Record<string, unknown>;
    this.expressApp.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    this.expressApp.use('/v1', v1Router);

    this.expressApp.use(errorHandler);
  }

  listen() {
    this.expressApp.listen(this.port, () => {
      logger.info(`Example app listening on port ${this.port}`);
    });
  }
}
