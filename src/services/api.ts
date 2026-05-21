const API_BASE = 'https://api-v2.puffer.fi/imtoken-hackathon';

export interface PufEthRate {
  pufEthPerEth: string;
  ethPerPufEth: string;
  totalAssets: string;
  totalSupply: string;
}

export interface PufEthMetrics {
  lrtMarketCap: number;
  averageDailyVolume: number;
  holderCount: number;
}

export interface VaultApy {
  data: Array<{
    token_address: string;
    lookback_days: number;
    apy: number;
  }>;
  timestamp: string;
}

export interface VaultTvl {
  unifi_eth_vault: string;
  unifi_usd_vault: string;
  unifi_btc_vault: string;
  pufeths_vault?: string;
}

export interface ProtocolTvl {
  lrt_total_usd: string;
  tvl_puffer_staking: string;
  apy: string;
  timestamp: string;
}

export const api = {
  async getPufETHRate(): Promise<PufEthRate> {
    const res = await fetch(`${API_BASE}/pufeth/rate`);
    if (!res.ok) throw new Error('Failed to fetch pufETH rate');
    return res.json();
  },

  async getPufETHMetrics(): Promise<PufEthMetrics> {
    const res = await fetch(`${API_BASE}/pufeth/metrics`);
    if (!res.ok) throw new Error('Failed to fetch pufETH metrics');
    return res.json();
  },

  async getVaultsAPY(): Promise<VaultApy> {
    const res = await fetch(`${API_BASE}/vaults/apy`);
    if (!res.ok) throw new Error('Failed to fetch vault APYs');
    return res.json();
  },

  async getVaultsTVL(): Promise<VaultTvl> {
    const res = await fetch(`${API_BASE}/vaults/tvl`);
    if (!res.ok) throw new Error('Failed to fetch vault TVLs');
    return res.json();
  },

  async getProtocolTVL(): Promise<ProtocolTvl> {
    const res = await fetch(`${API_BASE}/protocol/tvl`);
    if (!res.ok) throw new Error('Failed to fetch protocol TVL');
    return res.json();
  },

  async getTokenPrices(
    addresses: string[],
  ): Promise<Record<string, { usd: number }>> {
    const addressesStr = addresses.join('%');
    const res = await fetch(
      `${API_BASE}/tokens/prices?addresses=${addressesStr}`,
    );
    if (!res.ok) throw new Error('Failed to fetch token prices');
    return res.json();
  },
};
