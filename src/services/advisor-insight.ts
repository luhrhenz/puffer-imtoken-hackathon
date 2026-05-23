import {
  formatEth,
  formatPercent,
  formatPufEthBalance,
  formatUsdCompact,
  formatVaultsForPrompt,
  getBestVault,
  resolveVaultApys,
} from '@/common/lib/advisor-format';
import type { PufEthRate, ProtocolTvl, VaultApy, VaultTvl } from './api';

export interface AdvisorLiveData {
  rate: PufEthRate | null;
  protocolTVL: ProtocolTvl | null;
  vaultsAPY: VaultApy | null;
  vaultsTVL?: VaultTvl | null;
  pufETHBalance?: string;
}

export function buildAdvisorOpeningMessage(
  data: AdvisorLiveData,
  interpolate: (key: string, vars: Record<string, string>) => string,
): string {
  const ethPerPufEth = formatEth(data.rate?.ethPerPufEth ?? 0);
  const stakingAPY = formatPercent(data.protocolTVL?.apy ?? 0);
  const vaults = resolveVaultApys(data.vaultsAPY);
  const best = getBestVault(vaults);

  return interpolate('chat.openingInsight', {
    ethPerPufEth,
    stakingAPY,
    bestVault: best.name,
    bestVaultApy: formatPercent(best.apy),
  });
}

export interface AdvisorPromptContext {
  address: string;
  pufETHBalance: string;
  rate: { pufEthPerEth: string; ethPerPufEth: string };
  protocolTVL: ProtocolTvl;
  vaultsAPY: VaultApy;
  vaultsTVL?: VaultTvl | null;
}

export function buildFormattedAdvisorContext(context: AdvisorPromptContext) {
  const vaults = resolveVaultApys(context.vaultsAPY);
  const best = getBestVault(vaults);
  const ethPerPufEth = formatEth(context.rate.ethPerPufEth);
  const pufEthPerEth = formatEth(context.rate.pufEthPerEth);
  const stakingApy = formatPercent(context.protocolTVL.apy);
  const protocolTvl = formatUsdCompact(context.protocolTVL.lrt_total_usd);
  const stakingTvl = formatUsdCompact(context.protocolTVL.tvl_puffer_staking);
  const pufEthBalance = formatPufEthBalance(context.pufETHBalance);
  const pufEthBalanceInEth = formatEth(
    Number(context.pufETHBalance) * Number(context.rate.ethPerPufEth),
  );
  const vaultsTable = formatVaultsForPrompt(vaults);
  const vaultTvlLines = context.vaultsTVL
    ? [
        `unifiETH TVL: ${formatUsdCompact(context.vaultsTVL.unifi_eth_vault)}`,
        `unifiUSD TVL: ${formatUsdCompact(context.vaultsTVL.unifi_usd_vault)}`,
        `unifiBTC TVL: ${formatUsdCompact(context.vaultsTVL.unifi_btc_vault)}`,
        context.vaultsTVL.pufeths_vault
          ? `pufETHs TVL: ${formatUsdCompact(context.vaultsTVL.pufeths_vault)}`
          : null,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  return {
    ethPerPufEth,
    pufEthPerEth,
    stakingApy,
    protocolTvl,
    stakingTvl,
    pufEthBalance,
    pufEthBalanceInEth,
    vaultsTable,
    vaultTvlLines,
    bestVaultName: best.name,
    bestVaultApy: formatPercent(best.apy),
  };
}
