import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import path from 'path';
import {
  healthRouter,
  pufethRouter,
  vaultsRouter,
  protocolRouter,
  tokensRouter,
  gaugesRouter,
  swapRouter,
  advisorRouter,
} from './api';
import { env } from './common/lib/environment';
import { logger } from './common/lib/logger';
import { swaggerRouter } from './common/lib/swagger';
import { errorMiddleware } from './middleware/error-middleware';
import { requestLoggingMiddleware } from './middleware/request-logging-middleware';
import { rateLimitMiddleware } from './middleware/rate-limit-middleware';

const app = express();

// Configuration
app.set('port', env.PORT);
app.set('trust proxy', 1);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        connectSrc: [
          "'self'",
          'https://api.openai.com',
          'https://api.groq.com',
          'https://generativelanguage.googleapis.com',
          'https://api.1inch.dev',
        ],
      },
    },
  }),
);
app.use(pinoHttp({ logger }));
app.use(requestLoggingMiddleware);
app.use(rateLimitMiddleware);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Serve index.html for root path
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Create a base router to handle the BASE_URL prefix.
const baseRouter = express.Router();

// Routes
baseRouter.use('/health', healthRouter);
baseRouter.use('/docs', swaggerRouter);
baseRouter.use('/pufeth', pufethRouter);
baseRouter.use('/vaults', vaultsRouter);
baseRouter.use('/protocol', protocolRouter);
baseRouter.use('/tokens', tokensRouter);
baseRouter.use('/gauges', gaugesRouter);
baseRouter.use('/swap', swapRouter);
baseRouter.use('/advisor', advisorRouter);

// Mount the base router with the BASE_URL prefix.
app.use(env.BASE_URL, baseRouter);

// Error handling middlewares need to be at the end.
app.use(errorMiddleware);

export { app };
