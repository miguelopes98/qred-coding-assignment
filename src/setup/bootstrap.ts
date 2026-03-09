import { createLogger } from '../utils/logger';
import config from './config';
import { Server } from '../server';

const logger = createLogger(module);

const bootstrap = async () => {
  logger.info('Project is running successfully');

  // Register queue subscriber here
  try {
    const { server: serverConfig } = config;
    const server = new Server(serverConfig.port);
    await server.listen();
  } catch (err) {
    logger.error('failed in starting server ', err);
  }
};

export default bootstrap;
