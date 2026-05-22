import { Router, Request, Response, NextFunction } from 'express';
import { sendMessage } from '@/services/advisor';
import { resolveLlmConfig, llmStatus } from '@/common/lib/llm-config';
import { sendResponse } from '@/common/lib/response';

const advisorRouter = Router();

advisorRouter.get('/status', (_req: Request, res: Response) => {
  return sendResponse(res, 200, llmStatus(resolveLlmConfig()));
});

function fallbackAdvisor(messages: any[], context: any) {
  const latest = String(messages.at(-1)?.content || '').toLowerCase();
  const rate = Number(context?.rate?.pufEthPerEth || 0);
  const apy = context?.protocolTVL?.apy || '0';
  const balance = context?.pufETHBalance || '0';

  if (latest.includes('balance')) {
    return {
      reply: `Your connected wallet currently shows ${balance} pufETH. You can use the Home screen for the live pufETH balance and recent transaction link.`,
    };
  }

  if (
    latest.includes('stake') ||
    latest.includes('staking') ||
    latest.includes('deposit')
  ) {
    return {
      reply: `Current pufETH staking APY is ${apy}%. At the live rate, 1 ETH previews about ${rate.toFixed(4)} pufETH. Tap the button below when you are ready to stake.`,
      action: {
        type: 'stake_eth',
        amount: '1.0',
        label: 'Stake 1 ETH',
      },
    };
  }

  if (latest.includes('vault')) {
    return {
      reply:
        'The Vaults screen has live APY and TVL for all four UniFi vaults. Tap below to compare and deposit.',
      action: {
        type: 'deposit_vault',
        amount: '',
        label: 'Browse Vaults',
      },
    };
  }

  return {
    reply: `Current pufETH staking APY is ${apy}%. At the live rate, 1 ETH previews about ${rate.toFixed(4)} pufETH. Ask me to stake or compare vaults when you are ready.`,
  };
}

advisorRouter.post(
  '/chat',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messages, context } = req.body;

      const llm = resolveLlmConfig();
      if (!llm) {
        const fallback = fallbackAdvisor(messages, context);
        return sendResponse(res, 200, { ...fallback, aiEnabled: false });
      }

      let result;
      try {
        result = await sendMessage(messages, context, llm);
      } catch {
        result = fallbackAdvisor(messages, context);
      }

      return sendResponse(res, 200, { ...result, aiEnabled: true, ...llmStatus(llm) });
    } catch (error) {
      next(error);
    }
  },
);

export { advisorRouter };
