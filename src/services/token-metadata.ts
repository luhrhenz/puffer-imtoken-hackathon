import { createPublicClient, http, isAddress, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';

const ERC20_ABI = [
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const client = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com'),
});

export function isValidTokenAddress(value: string) {
  return isAddress(value);
}

export async function fetchTokenMetadata(address: string) {
  const addr = address as `0x${string}`;
  const [symbol, decimals] = await Promise.all([
    client
      .readContract({
        address: addr,
        abi: ERC20_ABI,
        functionName: 'symbol',
      })
      .catch(() => null),
    client
      .readContract({
        address: addr,
        abi: ERC20_ABI,
        functionName: 'decimals',
      })
      .catch(() => 18),
  ]);

  return {
    symbol: symbol || truncateAddress(address),
    decimals: Number(decimals ?? 18),
  };
}

export async function fetchTokenAllowance(
  token: string,
  owner: string,
  spender: string,
) {
  return client.readContract({
    address: token as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner as `0x${string}`, spender as `0x${string}`],
  });
}

export function truncateAddress(addr: string) {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatTokenAmount(
  wei: bigint,
  decimals: number,
  maxFractionDigits = 6,
) {
  const raw = formatUnits(wei, decimals);
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  });
}
