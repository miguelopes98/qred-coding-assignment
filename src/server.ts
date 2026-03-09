import express, { Application } from 'express';
import { createLogger } from './utils/logger';
import { v1Router } from './routes';
import { timingMiddleware } from './middlewares';

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

    this.expressApp.get('/', (req, res) => {
      res.send(`Hello World! Made a request to URL: ${req.url}`);
    });

    this.expressApp.use('/v1', v1Router);
  }

  listen() {
    this.expressApp.listen(this.port, () => {
      logger.info(`Example app listening on port ${this.port}`);
    });
  }
}
