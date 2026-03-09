import nodeConfig from 'config';

interface Config {
  server: ServerConfig;
}

export interface ServerConfig {
  port: number;
  address: string;
  allowedOrigins: Array<string>;
}

const config: Config = {
  server: {
    port: nodeConfig.get<number>('server.port'),
    address: nodeConfig.get<string>('server.address'),
    allowedOrigins: nodeConfig.get<Array<string>>('server.allowedOrigins'),
  },
};

export default config;
