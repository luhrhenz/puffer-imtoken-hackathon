import { env } from './common/lib/environment';
import { logger } from './common/lib/logger';
import { app } from './server';

const main = () => {
  // Only start server if not in serverless environment
  if (process.env.VERCEL !== '1') {
    app.listen(app.get('port'));
    const serverUrl = `http://localhost:${app.get('port')}${env.BASE_URL}`;
    logger.info([`Server: ${serverUrl}`, `Swagger: ${serverUrl}/docs`]);
  }
};

main();

// Export for Vercel serverless
export { app };
