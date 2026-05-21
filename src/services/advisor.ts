export interface AdvisorContext {
  address: string;
  pufETHBalance: string;
  rate: { pufEthPerEth: string; ethPerPufEth: string };
  metrics: any;
  vaultsAPY: any;
  vaultsTVL: any;
  protocolTVL: any;
}

export interface Action {
  type:
    | 'stake_eth'
    | 'stake_steth'
    | 'stake_wsteth'
    | 'deposit_vault'
    | 'swap_and_stake';
  amount: string;
  vault?: string;
  inputToken?: string;
  label: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const LLM_API_URL = 'https://api.openai.com/v1/chat/completions';

export function buildSystemPrompt(context: AdvisorContext): string {
  const { address, pufETHBalance, rate, protocolTVL, vaultsAPY } = context;

  const vaultData = [
    { name: 'unifiETH', apy: 0, tvl: '0' },
    { name: 'unifiUSD', apy: 0, tvl: '0' },
    { name: 'unifiBTC', apy: 0, tvl: '0' },
    { name: 'pufETHs', apy: 0, tvl: '0' },
  ];

  vaultsAPY.data.forEach((v: any) => {
    const key = v.token_address.toLowerCase();
    if (key.includes('196ead47')) vaultData[0].apy = v.apy;
    else if (key.includes('82c40e07')) vaultData[1].apy = v.apy;
    else if (key.includes('170d847a')) vaultData[2].apy = v.apy;
    else if (key.includes('62a4ce07')) vaultData[3].apy = v.apy;
  });

  return `You are a Puffer staking advisor AI. You help users stake ETH, stETH, wstETH to get pufETH, and deposit into UniFi vaults.

Current data:
- pufETH/ETH rate: ${rate.pufEthPerEth} pufETH per ETH
- pufETH staking APY: ${protocolTVL.apy}%
- User's pufETH balance: ${pufETHBalance}
- Wallet: ${address.slice(0, 6)}...${address.slice(-4)}

UniFi Vaults:
${vaultData.map((v) => `- ${v.name}: ${v.apy}% APY`).join('\n')}

Vault addresses:
- unifiETH: 0x196ead472583bc1e9af7a05f860d9857e1bd3dcc
- unifiUSD: 0x82c40e07277eBb92935f79cE92268F80dDc7caB4
- unifiBTC: 0x170d847a8320f3b6a77ee15b0cae430e3ec933a0
- pufETHs: 0x62a4ce0722ee65635c0f8339dd814d549b6f6735

When recommending transactions, include a JSON action in <action> tags at the end of your message. Example:
<action>{"type":"stake_eth","amount":"1","label":"Stake 1 ETH → pufETH"}</action>

For swap_and_stake, include inputToken: <action>{"type":"swap_and_stake","amount":"100","inputToken":"USDC","label":"Swap 100 USDC → pufETH"}</action>

Be conversational but concise. Always end with a question or prompt.`;
}

export async function sendMessage(
  messages: Message[],
  context: AdvisorContext,
  apiKey: string,
): Promise<{ reply: string; action?: Action }> {
  const systemPrompt = buildSystemPrompt(context);

  const response = await fetch(LLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get AI response');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  const actionMatch = content.match(/<action>(.*?)<\/action>/s);
  let action: Action | undefined;

  if (actionMatch) {
    try {
      action = JSON.parse(actionMatch[1]);
    } catch {
      // Invalid JSON, ignore
    }
  }

  return { reply: content.replace(actionMatch?.[0] || '', '').trim(), action };
}
