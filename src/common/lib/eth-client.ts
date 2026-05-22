import { createPublicClient, http, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { env } from './environment';
import {
  PUFFER_VAULT_ADDRESS,
  PUFFER_VAULT_ABI,
} from '@/common/constants/contracts';

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(env.ETH_RPC_URL),
});

const ONE_ETHER = BigInt(1e18);

export async function getPufEthRate() {
  const [pufEthPerEth, ethPerPufEth, totalAssets, totalSupply] =
    await Promise.all([
      publicClient.readContract({
        address: PUFFER_VAULT_ADDRESS,
        abi: PUFFER_VAULT_ABI,
        functionName: 'previewDeposit',
        args: [ONE_ETHER],
      }),
      publicClient.readContract({
        address: PUFFER_VAULT_ADDRESS,
        abi: PUFFER_VAULT_ABI,
        functionName: 'convertToAssets',
        args: [ONE_ETHER],
      }),
      publicClient.readContract({
        address: PUFFER_VAULT_ADDRESS,
        abi: PUFFER_VAULT_ABI,
        functionName: 'totalAssets',
      }),
      publicClient.readContract({
        address: PUFFER_VAULT_ADDRESS,
        abi: PUFFER_VAULT_ABI,
        functionName: 'totalSupply',
      }),
    ]);

  return {
    pufEthPerEth: formatUnits(pufEthPerEth, 18),
    ethPerPufEth: formatUnits(ethPerPufEth, 18),
    totalAssets: formatUnits(totalAssets, 18),
    totalSupply: formatUnits(totalSupply, 18),
  };
}

export async function getPufEthBalance(address: string) {
  const BALANCE_OF_ABI = [{
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  }] as const;

  const balance = await publicClient.readContract({
    address: PUFFER_VAULT_ADDRESS,
    abi: BALANCE_OF_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });

  return formatUnits(balance, 18);
}
