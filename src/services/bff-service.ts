import { bffClient } from '@/clients/bff-client';
import { cachedFetch, cacheGet, cacheSet } from '@/common/lib/bff-cache';
import { buildProtocolMetricsFallback } from '@/common/lib/metrics-fallback';

export async function getProtocolTvlSafe() {
  try {
    const data = await cachedFetch('protocol/tvl', () => bffClient.getProtocolTvl());
    cacheSet('protocol/tvl', data);
    return data;
  } catch {
    return buildProtocolMetricsFallback();
  }
}

export async function getVaultsApySafe() {
  try {
    return await cachedFetch('vaults/apy', () => bffClient.getAllVaultsApy());
  } catch {
    const hit = cacheGet<{ data: unknown[]; timestamp: string }>('vaults/apy');
    if (hit) return hit.data;
    return { data: [], timestamp: new Date().toISOString() };
  }
}

export async function getVaultsTvlSafe() {
  try {
    return await cachedFetch('vaults/tvl', () => bffClient.getVaultTvl());
  } catch {
    const hit = cacheGet<Record<string, string>>('vaults/tvl');
    if (hit) return hit.data;
    return {
      unifi_eth_vault: '0',
      unifi_usd_vault: '0',
      unifi_btc_vault: '0',
      pufeths_vault: '0',
    };
  }
}
