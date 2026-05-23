import type { VaultApy } from '@/services/api';

export const VAULT_DEFS = [
  {
    name: 'unifiETH',
    address: '0x196ead472583bc1e9af7a05f860d9857e1bd3dcc',
  },
  {
    name: 'unifiUSD',
    address: '0x82c40e07277eBb92935f79cE92268F80dDc7caB4',
  },
  {
    name: 'unifiBTC',
    address: '0x170d847a8320f3b6a77ee15b0cae430e3ec933a0',
  },
  {
    name: 'pufETHs',
    address: '0x62a4ce0722ee65635c0f8339dd814d549b6f6735',
  },
] as const;

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});

export function formatPercent(value: string | number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00%';
  return `${n.toFixed(2)}%`;
}

export function formatEth(value: string | number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.0000';
  return n.toFixed(4);
}

export function formatUsdCompact(
  value: string | number | null | undefined,
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0';
  return usdCompact.format(n);
}

export function formatPufEthBalance(
  value: string | number | null | undefined,
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.0000';
  return n.toFixed(4);
}

export function resolveVaultApys(vaultsAPY: VaultApy | null | undefined) {
  const vaults = VAULT_DEFS.map((v) => ({ name: v.name, apy: 0 }));

  vaultsAPY?.data?.forEach((row) => {
    const key = row.token_address.toLowerCase();
    if (key.includes('196ead47')) vaults[0].apy = row.apy;
    else if (key.includes('82c40e07')) vaults[1].apy = row.apy;
    else if (key.includes('170d847a')) vaults[2].apy = row.apy;
    else if (key.includes('62a4ce07')) vaults[3].apy = row.apy;
  });

  return vaults;
}

export function getBestVault(vaults: Array<{ name: string; apy: number }>) {
  if (!vaults.length) return { name: 'unifiETH', apy: 0 };
  return vaults.reduce((best, v) => (v.apy > best.apy ? v : best), vaults[0]);
}

export function formatVaultsForPrompt(
  vaults: Array<{ name: string; apy: number }>,
): string {
  return vaults.map((v) => `${v.name}: ${formatPercent(v.apy)} APY`).join(', ');
}
