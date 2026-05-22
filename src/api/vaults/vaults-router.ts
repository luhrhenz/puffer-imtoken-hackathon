import { Router, Request, Response, NextFunction } from 'express';
import { sendResponse } from '@/common/lib/response';
import { getVaultsApySafe, getVaultsTvlSafe } from '@/services/bff-service';

const vaultsRouter = Router();

/**
 * @openapi
 * /vaults/apy:
 *   get:
 *     tags:
 *       - Vaults
 *     summary: Get APY for all UniFi vaults
 *     description: Returns the highest APY for each UniFi vault (unifiETH, unifiUSD, unifiBTC, pufETHs).
 *     responses:
 *       200:
 *         description: Vault APY data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       token_address:
 *                         type: string
 *                         example: "0x196ead472583bc1e9af7a05f860d9857e1bd3dcc"
 *                       lookback_days:
 *                         type: number
 *                         example: 30
 *                       apy:
 *                         type: number
 *                         example: 5.2
 *                 timestamp:
 *                   type: string
 *                   example: "2026-05-15T10:30:00.000Z"
 *       500:
 *         description: Server error
 */
vaultsRouter.get(
  '/apy',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getVaultsApySafe();
      return sendResponse(res, 200, data);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @openapi
 * /vaults/tvl:
 *   get:
 *     tags:
 *       - Vaults
 *     summary: Get TVL for UniFi vaults
 *     description: Returns total value locked for each UniFi vault (unifiETH, unifiUSD, unifiBTC).
 *     responses:
 *       200:
 *         description: Vault TVL data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unifi_eth_vault:
 *                   type: string
 *                   description: unifiETH vault TVL in USD
 *                   example: "250000000.50"
 *                 unifi_usd_vault:
 *                   type: string
 *                   description: unifiUSD vault TVL in USD
 *                   example: "500000000.25"
 *                 unifi_btc_vault:
 *                   type: string
 *                   description: unifiBTC vault TVL in USD
 *                   example: "100000000.00"
 *       500:
 *         description: Server error
 */
vaultsRouter.get(
  '/tvl',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getVaultsTvlSafe();
      return sendResponse(res, 200, data);
    } catch (error) {
      next(error);
    }
  },
);

export { vaultsRouter };
