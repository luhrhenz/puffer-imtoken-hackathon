import { LlmConfig } from '@/common/lib/llm-config';

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

function parseActionFromContent(content: string): {
  reply: string;
  action?: Action;
} {
  const actionMatch = content.match(/<action>(.*?)<\/action>/s);
  let action: Action | undefined;

  if (actionMatch) {
    try {
      action = JSON.parse(actionMatch[1]);
    } catch {
      // Invalid JSON, ignore
    }
  }

  return {
    reply: content.replace(actionMatch?.[0] || '', '').trim(),
    action,
  };
}

export function buildSystemPrompt(context: AdvisorContext): string {
  const { address, pufETHBalance, rate, protocolTVL, vaultsAPY } = context;

  const vaultData = [
    {
      name: 'unifiETH',
      apy: 0,
      address: '0x196ead472583bc1e9af7a05f860d9857e1bd3dcc',
    },
    {
      name: 'unifiUSD',
      apy: 0,
      address: '0x82c40e07277eBb92935f79cE92268F80dDc7caB4',
    },
    {
      name: 'unifiBTC',
      apy: 0,
      address: '0x170d847a8320f3b6a77ee15b0cae430e3ec933a0',
    },
    {
      name: 'pufETHs',
      apy: 0,
      address: '0x62a4ce0722ee65635c0f8339dd814d549b6f6735',
    },
  ];

  vaultsAPY.data.forEach((v: any) => {
    const key = v.token_address.toLowerCase();
    if (key.includes('196ead47')) vaultData[0].apy = v.apy;
    else if (key.includes('82c40e07')) vaultData[1].apy = v.apy;
    else if (key.includes('170d847a')) vaultData[2].apy = v.apy;
    else if (key.includes('62a4ce07')) vaultData[3].apy = v.apy;
  });

  const pufEthBalanceInEth = (
    Number(pufETHBalance) * Number(rate.ethPerPufEth)
  ).toFixed(4);
  const vaultsTable = vaultData
    .map((v) => `${v.name}: ${v.apy}% APY`)
    .join(', ');

  return `You are a DeFi staking advisor for Puffer Finance, embedded inside the imToken mobile wallet.
You help users stake ETH and earn yield through Puffer's liquid restaking protocol.

Be concise — this is a mobile interface. Keep responses under 4 sentences unless the user asks for detail.
Never use markdown headers or bullet points. Write in plain conversational sentences.
Always be specific — use the real numbers from the context below.

LIVE PROTOCOL DATA (fetched just now):
- pufETH/ETH rate: ${rate.ethPerPufEth} ETH per pufETH (rate appreciation = staking yield)
- Protocol TVL: $${(Number(protocolTVL.lrt_total_usd) / 1e9).toFixed(2)}B
- pufETH staking APY: ${protocolTVL.apy}%

UNIFI VAULT OPPORTUNITIES:
${vaultsTable}

USER:
- Address: ${address.slice(0, 6)}...${address.slice(-4)}
- pufETH balance: ${pufETHBalance} pufETH (≈ ${pufEthBalanceInEth} ETH)

When you recommend a specific action (stake, deposit into a vault), end your message with an XML action tag:
<action>{"type":"stake_eth","amount":"1.0","label":"Stake 1 ETH → pufETH"}</action>

Only include one action tag per message. Only recommend amounts the user mentioned or that make sense from context.
If the user wants to stake a token other than ETH/stETH/wstETH, use type "swap_and_stake" and set inputToken.`;
}

async function sendOpenAiCompatible(
  config: LlmConfig,
  messages: Message[],
  systemPrompt: string,
): Promise<string> {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM request failed (${config.provider}): ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
}

async function sendGemini(
  config: LlmConfig,
  messages: Message[],
  systemPrompt: string,
): Promise<string> {
  const url = `${config.url}/${config.model}:generateContent?key=${config.apiKey}`;
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM request failed (gemini): ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

export async function sendMessage(
  messages: Message[],
  context: AdvisorContext,
  config: LlmConfig,
): Promise<{ reply: string; action?: Action }> {
  const systemPrompt = buildSystemPrompt(context);

  const content =
    config.provider === 'gemini'
      ? await sendGemini(config, messages, systemPrompt)
      : await sendOpenAiCompatible(config, messages, systemPrompt);

  return parseActionFromContent(content);
}
