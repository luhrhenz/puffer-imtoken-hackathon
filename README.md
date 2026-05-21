# StakeMind - AI-Powered Puffer Staking Advisor

An AI-powered Puffer staking advisor built natively for imToken's mobile wallet. Rather than a static form, StakeMind puts an intelligent staking assistant at the center of the experience — one that knows live on-chain data in real time and turns its recommendations into one-tap transactions.

## What It Does

Connect your imToken wallet and the advisor immediately greets you with your current pufETH balance, the live staking rate, and the best yield opportunity available right now across Puffer's UniFi vaults. 

Ask it anything:
- "which vault has the best APY?"
- "how much would I earn staking 2 ETH for 3 months?"
- "what's the difference between unifiETH and pufETHs?"

It answers with real numbers, not generic advice.

When it recommends an action, a confirmation button appears inline. Tap it, review the estimated output and gas, confirm — done. No tab-switching, no copy-pasting addresses, no guessing.

## Features

- **Conversational AI Interface** - Natural language staking advisor powered by real-time protocol data
- **One-Tap Transactions** - Inline action buttons turn recommendations into executable transactions
- **Multi-Token Support** - Stake ETH, stETH, and wstETH natively
- **Live Data** - Real-time pufETH rates, vault APYs, TVL, and user balances
- **UniFi Vault Integration** - Compare and deposit into all Puffer UniFi vaults
- **Advanced Mode** - DEX aggregator integration for any-token deposits (coming soon)

## Tech Stack

- **Frontend**: React + TypeScript
- **Blockchain**: Official Puffer SDK, viem
- **Data**: Live Puffer API
- **AI**: OpenAI GPT-4o-mini
- **Backend**: Express API proxy
- **Environment**: imToken WebView compatible

## API Reference

**Base URL:** `https://api-v2.puffer.fi/imtoken-hackathon`

All endpoints are public. Rate limited to 100 requests per 15 minutes per IP.

### Endpoints

| Endpoint                    | Method | Description                                       |
| --------------------------- | ------ | ------------------------------------------------- |
| `/pufeth/rate`              | GET    | pufETH/ETH exchange rate (live on-chain)          |
| `/pufeth/metrics`           | GET    | pufETH market cap, daily volume, holder count     |
| `/vaults/apy`               | GET    | APY for all UniFi vaults                          |
| `/vaults/tvl`               | GET    | TVL breakdown per UniFi vault                     |
| `/protocol/tvl`             | GET    | Protocol-wide TVL + pufETH staking APY            |
| `/tokens/prices?addresses=` | GET    | USD prices for token addresses (separated by `%`) |
| `/gauges/apr?identifier=`   | GET    | APR for a gauge/opportunity by contract address   |
| `/health`                   | GET    | Health check                                      |

Interactive API docs are available at `/docs` (Swagger UI).

### Example Request

```bash
curl https://api-v2.puffer.fi/imtoken-hackathon/pufeth/rate
```

```json
{
  "pufEthPerEth": "0.959",
  "ethPerPufEth": "1.042",
  "totalAssets": "450000.123",
  "totalSupply": "432000.456"
}
```

## Puffer SDK

The [`@pufferfinance/puffer-sdk`](https://www.npmjs.com/package/@pufferfinance/puffer-sdk) handles all on-chain interactions - staking, vault deposits, balance checks, and more.

```bash
npm install @pufferfinance/puffer-sdk
```

Full SDK docs: [pufferfinance.github.io/puffer-sdk](https://pufferfinance.github.io/puffer-sdk/)

### Quick Examples

**Stake ETH to get pufETH:**

```typescript
import {
  PufferClientHelpers,
  PufferClient,
  Chain,
} from '@pufferfinance/puffer-sdk';

const walletClient = PufferClientHelpers.createWalletClient({
  chain: Chain.Mainnet,
  provider: window.ethereum,
});
const publicClient = PufferClientHelpers.createPublicClient({
  chain: Chain.Mainnet,
  rpcUrls: ['https://your-rpc-url'],
});

const pufferClient = new PufferClient(
  Chain.Mainnet,
  walletClient,
  publicClient,
);

// Deposit ETH → receive pufETH
const [walletAddress] = await pufferClient.requestAddresses();
const { transact, estimate } = pufferClient.vault.depositETH(walletAddress);
const gasEstimate = await estimate();
const txHash = await transact(BigInt(1e18)); // 1 ETH
```

**Get pufETH exchange rate:**

```typescript
const rate = await pufferClient.vault.getPufETHRate();
// Returns BigInt: amount of pufETH per 1 ETH (18 decimals)
```

**Check pufETH balance:**

```typescript
const balance = await pufferClient.vault.balanceOf('0xYourAddress');
```

**Deposit into a UniFi vault (e.g., unifiETH):**

```typescript
import { UnifiToken, Token } from '@pufferfinance/puffer-sdk';

const { transact } = await pufferClient.nucleusTeller
  .withToken(UnifiToken.unifiETH)
  .deposit({
    account: walletAddress,
    token: Token.WETH,
    unifiToken: UnifiToken.unifiETH,
    amount: BigInt(1e18),
    minimumMint: BigInt(0),
    isPreapproved: false,
  });

const txHash = await transact();
```

## Contract Addresses (Ethereum Mainnet)

### Core

| Contract             | Address                                      |
| -------------------- | -------------------------------------------- |
| PufferVault (pufETH) | `0xD9A442856C234a39a81a089C06451EBAa4306a72` |

### Tokens

| Token  | Address                                      |
| ------ | -------------------------------------------- |
| pufETH | `0xd9a442856c234a39a81a089c06451ebaa4306a72` |
| PUFFER | `0x4d1c297d39c5c1277964d0e3f8aa901493664530` |
| WETH   | `0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2` |
| stETH  | `0xae7ab96520de3a18e5e111b5eaab095312d7fe84` |
| wstETH | `0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0` |

### UniFi Vaults

| Vault    | Vault Address                                | Teller Address                               |
| -------- | -------------------------------------------- | -------------------------------------------- |
| unifiETH | `0x196ead472583bc1e9af7a05f860d9857e1bd3dcc` | `0x08eb2eccdf6ebd7aba601791f23ec5b5f68a1d53` |
| unifiUSD | `0x82c40e07277eBb92935f79cE92268F80dDc7caB4` | `0x5d3Fb47FE7f3F4Ce8fe55518f7E4F7D6061B54DD` |
| unifiBTC | `0x170d847a8320f3b6a77ee15b0cae430e3ec933a0` | `0x0743647a607822781f9d0a639454e76289182f0b` |
| pufETHs  | `0x62a4ce0722ee65635c0f8339dd814d549b6f6735` | `0xd049ebeaa59b75ba8ee38f9f6830db7293320236` |

## APY Calculation

**pufETH staking APY** is derived from the pufETH/ETH exchange rate growth over time. As validators earn rewards, `totalAssets` in the PufferVault increases while `totalSupply` of pufETH stays the same, causing the rate to appreciate.

**UniFi vault APYs** are calculated by the Nucleus protocol based on vault share price changes over configurable lookback periods (7, 14, 30, 60 days), annualized.

## Running the API Locally

```bash
git clone <this-repo>
cd puffer-imtoken-hackathon
pnpm install
cp .env.example .env
# Fill in .env values
pnpm dev
```

Server starts at `http://localhost:8080`. Swagger docs at `http://localhost:8080/docs`.

## Docker

```bash
docker build -t puffer-imtoken-hackathon .
docker run -p 8080:8080 --env-file .env puffer-imtoken-hackathon
```

## Links

- [Puffer SDK (npm)](https://www.npmjs.com/package/@pufferfinance/puffer-sdk)
- [Puffer SDK Docs](https://pufferfinance.github.io/puffer-sdk/)
- [imToken Co-Creation Campaign](https://10.token.im/#cocreation)
- [Puffer Finance](https://www.puffer.fi)
