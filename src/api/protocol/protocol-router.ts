import { Router, Request, Response, NextFunction } from 'express';
import { sendResponse } from '@/common/lib/response';
import { getProtocolTvlSafe } from '@/services/bff-service';

const protocolRouter = Router();

/**
 * @openapi
 * /protocol/tvl:
 *   get:
 *     tags:
 *       - Protocol
 *     summary: Get protocol-wide TVL and pufETH staking APY
 *     description: Returns total value locked across the entire Puffer protocol, broken down by category, plus the current pufETH staking APY.
 *     responses:
 *       200:
 *         description: Protocol TVL data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lrt_total_usd:
 *                   type: string
 *                   description: Liquid Restaking Token TVL in USD
 *                   example: "1500000000"
 *                 avs_total_usd:
 *                   type: string
 *                   description: AVS TVL in USD
 *                   example: "800000000"
 *                 avs_eigen_total_usd:
 *                   type: string
 *                   description: EigenLayer AVS TVL in USD
 *                   example: "300000000"
 *                 unifi_total_usd:
 *                   type: string
 *                   description: Combined UniFi vault TVL in USD
 *                   example: "500000000"
 *                 tvl_puffer_staking:
 *                   type: string
 *                   description: pufETH staking TVL in USD
 *                   example: "2000000000"
 *                 apy:
 *                   type: string
 *                   description: Current pufETH staking APY (percentage)
 *                   example: "3.45"
 *                 timestamp:
 *                   type: string
 *                   example: "2026-05-15T10:30:00.000Z"
 *       500:
 *         description: Server error
 */
protocolRouter.get(
  '/tvl',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getProtocolTvlSafe();
      return sendResponse(res, 200, data);
    } catch (error) {
      next(error);
    }
  },
);

export { protocolRouter };
