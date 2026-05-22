import { getPufEthRate } from '@/common/lib/eth-client';
import { cacheGet, cacheSet, cachedFetch } from '@/common/lib/bff-cache';

const rateHistory: Array<{ value: number; at: number }> = [];

export function trackPufEthRate(ethPerPufEth: string) {
  const value = Number(ethPerPufEth);
  if (!Number.isFinite(value) || value <= 0) return;

  rateHistory.push({ value, at: Date.now() });
  if (rateHistory.length > 64) rateHistory.shift();
}

export function estimateStakingApy(): string | null {
  if (rateHistory.length < 2) return null;

  const oldest = rateHistory[0];
  const latest = rateHistory[rateHistory.length - 1];
  const days = (latest.at - oldest.at) / (1000 * 60 * 60 * 24);
  if (days < 1) return null;

  const growth = latest.value / oldest.value - 1;
  const apy = (growth / days) * 365 * 100;
  if (!Number.isFinite(apy) || apy <= 0 || apy > 200) return null;

  return apy.toFixed(2);
}

async function getEthUsdPrice(): Promise<number> {
  return cachedFetch('eth-usd', async () => {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { headers: { accept: 'application/json' } },
    );
    if (!response.ok) throw new Error('ETH price unavailable');
    const json = await response.json();
    const price = Number(json?.ethereum?.usd);
    if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid ETH price');
    return price;
  });
}

export async function buildProtocolMetricsFallback() {
  const rate = await getPufEthRate();
  trackPufEthRate(rate.ethPerPufEth);

  const ethUsd = await getEthUsdPrice().catch(() => 3500);
  const tvlUsd = Number(rate.totalAssets) * ethUsd;

  const cached = cacheGet<{ apy: string }>('protocol/tvl');
  const cachedApy = cached?.data?.apy;
  const estimatedApy = estimateStakingApy();
  const apy = cachedApy ?? estimatedApy ?? '4.0';

  return {
    lrt_total_usd: String(tvlUsd),
    tvl_puffer_staking: String(tvlUsd),
    apy,
    timestamp: new Date().toISOString(),
    source: 'on-chain-estimate',
  };
}
