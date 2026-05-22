import pino from 'pino';
import { env } from './environment';

const isServerless = process.env.VERCEL === '1';
const isProd =
  env.ENVIRONMENT == 'production' ||
  env.ENVIRONMENT == 'staging' ||
  isServerless;

const baseLogger = {
  level: isProd ? 'info' : 'debug',
  formatters: {
    level: (label: string) => ({ level: label }),
    log: (object: any) => ({
      ...object,
      environment: env.ENVIRONMENT,
      service: 'puffer-backend-service',
    }),
  },
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
  messageKey: 'message',
};

const transport = !isProd
  ? pino.transport({
      targets: [
        {
          target: 'pino-pretty',
          level: 'debug',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'yyyy-mm-dd HH:MM:ss',
          },
        },
      ],
    })
  : undefined;

export const logger = pino(baseLogger, transport);
