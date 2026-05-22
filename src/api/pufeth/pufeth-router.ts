import { Router, Request, Response, NextFunction } from 'express';
import { sendResponse } from '@/common/lib/response';
import { getPufEthRate, getPufEthBalance } from '@/common/lib/eth-client';
import { trackPufEthRate } from '@/common/lib/metrics-fallback';
import { bffClient } from '@/clients/bff-client';

const pufethRouter = Router();

/**
 * @openapi
 * /pufeth/rate:
 *   get:
 *     tags:
 *       - pufETH
 *     summary: Get pufETH/ETH exchange rate
 *     description: Returns the live pufETH/ETH exchange rate read directly from the PufferVault smart contract.
 *     responses:
 *       200:
 *         description: pufETH exchange rate data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pufEthPerEth:
 *                   type: string
 *                   description: How much pufETH you get for 1 ETH
 *                   example: "0.959"
 *                 ethPerPufEth:
 *                   type: string
 *                   description: How much ETH 1 pufETH is worth
 *                   example: "1.042"
 *                 totalAssets:
 *                   type: string
 *                   description: Total ETH held in the vault
 *                   example: "450000.123"
 *                 totalSupply:
 *                   type: string
 *                   description: Total pufETH in circulation
 *                   example: "432000.456"
 *       500:
 *         description: Server error
 */
pufethRouter.get(
  '/rate',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rate = await getPufEthRate();
      trackPufEthRate(rate.ethPerPufEth);
      return sendResponse(res, 200, rate);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @openapi
 * /pufeth/metrics:
 *   get:
 *     tags:
 *       - pufETH
 *     summary: Get pufETH market metrics
 *     description: Returns pufETH market cap, average daily trading volume, and holder count.
 *     responses:
 *       200:
 *         description: pufETH market metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lrtMarketCap:
 *                   type: number
 *                   description: pufETH market cap in USD
 *                   example: 1250000000
 *                 averageDailyVolume:
 *                   type: number
 *                   description: Average daily trading volume in USD
 *                   example: 5000000
 *                 holderCount:
 *                   type: number
 *                   description: Number of pufETH holders
 *                   example: 15234
 *       500:
 *         description: Server error
 */
pufethRouter.get(
  '/metrics',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await bffClient.getPufEthMetrics();
      return sendResponse(res, 200, metrics);
    } catch (error) {
      next(error);
    }
  },
);

pufethRouter.get(
  '/balance/:address',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const balance = await getPufEthBalance(req.params.address);
      return sendResponse(res, 200, { balance });
    } catch (error) {
      next(error);
    }
  },
);

export { pufethRouter };
