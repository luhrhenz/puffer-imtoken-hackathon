import { LlmConfig } from '@/common/lib/llm-config';
import { buildFormattedAdvisorContext } from '@/services/advisor-insight';

export interface AdvisorContext {
  address: string;
  pufETHBalance: string;
  rate: { pufEthPerEth: string; ethPerPufEth: string };
  metrics: any;
  vaultsAPY: any;
  vaultsTVL: any;
  protocolTVL: any;
  locale?: 'en' | 'zh' | 'es';
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

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  zh: 'Simplified Chinese (简体中文)',
  es: 'Spanish (Español)',
};

export function buildSystemPrompt(context: AdvisorContext): string {
  const { address, pufETHBalance, rate, protocolTVL, vaultsAPY, vaultsTVL, locale = 'en' } =
    context;
  const language = LANGUAGE_NAMES[locale] ?? LANGUAGE_NAMES.en;

  const formatted = buildFormattedAdvisorContext({
    address,
    pufETHBalance,
    rate,
    protocolTVL,
    vaultsAPY,
    vaultsTVL,
  });

  return `You are a DeFi staking advisor for Puffer Finance, embedded inside the imToken mobile wallet.
You help users understand Puffer staking, pufETH, UniFi vaults, APY, risks, and how to stake when they choose to.

IMPORTANT: Always respond in ${language}. The user may write in any language; match their language or the app locale above.
Action button "label" fields inside <action> JSON must also be in ${language}.

Answer educational questions fully (what is Puffer staking, how pufETH works, vault differences, etc.) using the live data below.
Be concise — this is a mobile interface. Keep responses under 4 sentences unless the user asks for detail.
Never use markdown headers or bullet points. Write in plain conversational sentences.
Always be specific — use the real numbers from the context below.

LIVE PROTOCOL DATA (fetched just now):
- pufETH/ETH rate: ${formatted.ethPerPufEth} ETH per pufETH (${formatted.pufEthPerEth} pufETH per 1 ETH)
- Protocol TVL: ${formatted.protocolTvl} (pufETH staking TVL: ${formatted.stakingTvl})
- pufETH staking APY: ${formatted.stakingApy}
- Best vault right now: ${formatted.bestVaultName} at ${formatted.bestVaultApy}

UNIFI VAULT OPPORTUNITIES:
${formatted.vaultsTable}
${formatted.vaultTvlLines ? `\nVAULT TVL: ${formatted.vaultTvlLines}` : ''}

USER:
- Address: ${address.slice(0, 6)}...${address.slice(-4)}
- pufETH balance: ${formatted.pufEthBalance} pufETH (≈ ${formatted.pufEthBalanceInEth} ETH)

Only when the user clearly wants to stake or deposit NOW (not for general questions), end your message with an XML action tag:
<action>{"type":"stake_eth","amount":"1.0","label":"Stake 1 ETH → pufETH"}</action>

Do NOT include an action tag for greetings, explanations, comparisons, or questions starting with what/how/why/explain/tell me — answer in text only.
Only include one action tag when the user explicitly wants to stake or deposit now (e.g. "stake 2 ETH", "deposit into unifiETH"). Use amounts they mentioned.
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
