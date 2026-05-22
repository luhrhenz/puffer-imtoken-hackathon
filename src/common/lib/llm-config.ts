export type LlmProvider = 'groq' | 'gemini' | 'openai';

export interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  url: string;
  model: string;
}

const PROVIDER_DEFAULTS: Record<
  LlmProvider,
  { url: string; model: string; keyEnv: string[] }
> = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    keyEnv: ['GROQ_API_KEY'],
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.0-flash',
    keyEnv: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    keyEnv: ['LLM_API_KEY', 'OPENAI_API_KEY'],
  },
};

function readKey(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

function buildConfig(provider: LlmProvider): LlmConfig | null {
  const defaults = PROVIDER_DEFAULTS[provider];
  const apiKey = readKey(defaults.keyEnv);
  if (!apiKey) return null;

  const model = process.env.LLM_MODEL?.trim() || defaults.model;

  return {
    provider,
    apiKey,
    url: defaults.url,
    model,
  };
}

/** Prefer Groq/Gemini (free tiers) unless LLM_PROVIDER forces a specific backend. */
export function resolveLlmConfig(): LlmConfig | null {
  const requested = process.env.LLM_PROVIDER?.toLowerCase() as
    | LlmProvider
    | undefined;

  if (requested && requested in PROVIDER_DEFAULTS) {
    return buildConfig(requested);
  }

  return (
    buildConfig('groq') ?? buildConfig('gemini') ?? buildConfig('openai')
  );
}

export function llmStatus(config: LlmConfig | null) {
  if (!config) {
    return { configured: false, provider: null, model: null, freeTier: false };
  }

  return {
    configured: true,
    provider: config.provider,
    model: config.model,
    freeTier: config.provider === 'groq' || config.provider === 'gemini',
  };
}
