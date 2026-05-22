import { ApiClient } from '@/common/utils/api-client';
import { env } from '@/common/lib/environment';

class BffClient extends ApiClient {
  constructor() {
    super(env.PUFFER_BFF_URL);
  }

  async getAllVaultsApy() {
    const { data } = await this.client.get('/vaults/apy');
    return data;
  }

  async getProtocolTvl() {
    const { data } = await this.client.get('/protocol/tvl');
    return data;
  }

  async getVaultTvl() {
    const { data } = await this.client.get('/vaults/tvl');
    return data;
  }

  async getTokenPrices(addresses: string) {
    const { data } = await this.client.get('/token-price/prices', {
      params: { addresses },
    });
    return data;
  }

  async getGaugeApr(identifier: string) {
    const { data } = await this.client.get('/apr', {
      params: { identifier },
    });
    return data;
  }

  async getPufEthMetrics() {
    const { data } = await this.client.get('/pufeth/metrics');
    return data;
  }
}

export const bffClient = new BffClient();
