import { Router, Request, Response, NextFunction } from 'express';
import { env } from '@/common/lib/environment';
import { sendResponse } from '@/common/lib/response';

const swapRouter = Router();
const ONE_INCH_BASE = 'https://api.1inch.dev/swap/v6.0/1';

swapRouter.get('/status', (_req: Request, res: Response) => {
  return sendResponse(res, 200, {
    proxyAvailable: Boolean(env.ONE_INCH_API_KEY),
  });
});

function oneInchHeaders() {
  return env.ONE_INCH_API_KEY
    ? { Authorization: `Bearer ${env.ONE_INCH_API_KEY}` }
    : {};
}

async function fetchOneInch(path: string, params: URLSearchParams) {
  if (!env.ONE_INCH_API_KEY) {
    throw new Error('ONE_INCH_API_KEY is not configured');
  }

  const response = await fetch(`${ONE_INCH_BASE}${path}?${params.toString()}`, {
    headers: oneInchHeaders(),
  });

  const data = await response.json();
  if (!response.ok) {
    const message =
      data?.description || data?.message || 'Failed to fetch 1inch route';
    throw new Error(message);
  }

  return data;
}

swapRouter.get(
  '/quote',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { src, dst, amount } = req.query;
      const params = new URLSearchParams({
        src: String(src || ''),
        dst: String(dst || ''),
        amount: String(amount || ''),
      });

      const quote = await fetchOneInch('/quote', params);
      return sendResponse(res, 200, quote);
    } catch (error) {
      next(error);
    }
  },
);

swapRouter.get(
  '/transaction',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { src, dst, amount, from, slippage } = req.query;
      const params = new URLSearchParams({
        src: String(src || ''),
        dst: String(dst || ''),
        amount: String(amount || ''),
        from: String(from || ''),
        slippage: String(slippage || '1'),
        disableEstimate: 'true',
      });

      const swap = await fetchOneInch('/swap', params);
      return sendResponse(res, 200, swap);
    } catch (error) {
      next(error);
    }
  },
);

export { swapRouter };
