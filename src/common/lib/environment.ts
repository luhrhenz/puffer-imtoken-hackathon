import dotenv from 'dotenv';

// Override makes sure environment variables are loaded from .env file.
dotenv.config({ override: true });

export const env = {
  // Application
  PORT: process.env.PORT ?? 8080,
  BASE_URL: process.env.BASE_URL ?? '/',
  ENVIRONMENT: process.env.ENVIRONMENT ?? 'development',
  // Puffer BFF
  PUFFER_BFF_URL:
    process.env.PUFFER_BFF_URL ?? 'https://api-v2.puffer.fi/imtoken-hackathon',

  // Blockchain
  ETH_RPC_URL: process.env.ETH_RPC_URL ?? 'https://eth.llamarpc.com',

  // Integrations (OPENAI_API_KEY is accepted as an alias for LLM_API_KEY)
  LLM_API_KEY:
    process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? '',
  ONE_INCH_API_KEY: process.env.ONE_INCH_API_KEY ?? '',
} as const;

// Validate all env vars are defined
Object.entries(env).forEach(([key, value]) => {
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
});
