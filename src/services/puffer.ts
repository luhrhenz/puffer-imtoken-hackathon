import {
  PufferClientHelpers,
  PufferClient,
  Chain,
  Token,
  UnifiToken,
  CONTRACT_ADDRESSES,
} from '@pufferfinance/puffer-sdk';
import { encodeFunctionData, formatEther, maxUint256 } from 'viem';

const RPC_URL = process.env.ETH_RPC_URL || 'https://eth.llamarpc.com';
const HOLESKY_RPC_URL =
  process.env.HOLESKY_RPC_URL || 'https://ethereum-holesky-rpc.publicnode.com';

export type NetworkKey = 'mainnet' | 'holesky';

export const NETWORKS: Record<
  NetworkKey,
  {
    chain: Chain.Mainnet | Chain.Holesky;
    chainId: `0x${string}`;
    explorer: string;
    label: string;
    rpcUrl: string;
  }
> = {
  mainnet: {
    chain: Chain.Mainnet,
    chainId: '0x1',
    explorer: 'https://etherscan.io',
    label: 'Mainnet',
    rpcUrl: RPC_URL,
  },
  holesky: {
    chain: Chain.Holesky,
    chainId: '0x4268',
    explorer: 'https://holesky.etherscan.io',
    label: 'Holesky',
    rpcUrl: HOLESKY_RPC_URL,
  },
};

let pufferClient: PufferClient | null = null;
let activeNetwork: NetworkKey = 'mainnet';

export const pufferService = {
  async connectWallet(network: NetworkKey = activeNetwork): Promise<string> {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please open this app in imToken.');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    await this.init(window.ethereum, network);
    return accounts[0];
  },

  async init(provider: any, network: NetworkKey = activeNetwork) {
    activeNetwork = network;
    const config = NETWORKS[network];
    const walletClient = PufferClientHelpers.createWalletClient({
      chain: config.chain,
      provider,
    });

    const publicClient = PufferClientHelpers.createPublicClient({
      chain: config.chain,
      rpcUrls: [config.rpcUrl],
    });

    pufferClient = new PufferClient(config.chain, walletClient, publicClient);
    return pufferClient;
  },

  async getWalletNetwork(): Promise<NetworkKey> {
    if (!window.ethereum) return activeNetwork;
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId === NETWORKS.holesky.chainId ? 'holesky' : 'mainnet';
  },

  async switchNetwork(network: NetworkKey): Promise<void> {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please open this app in imToken.');
    }

    const config = NETWORKS[network];
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: config.chainId }],
      });
    } catch (error: any) {
      if (error?.code !== 4902) throw error;
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: config.chainId,
            chainName: 'Ethereum Holesky',
            nativeCurrency: {
              name: 'Holesky Ether',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: [config.rpcUrl],
            blockExplorerUrls: [config.explorer],
          },
        ],
      });
    }

    activeNetwork = network;
    await this.init(window.ethereum, network);
  },

  async ensureNetwork(network: NetworkKey): Promise<void> {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please open this app in imToken.');
    }

    const config = NETWORKS[network];
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== config.chainId) {
      await this.switchNetwork(network);
      return;
    }

    activeNetwork = network;
    await this.init(window.ethereum, network);
  },

  async getPufETHRate() {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    const vault = pufferClient.vault as any;
    const oneEth = BigInt(1e18);
    const [pufEthPerEth, ethPerPufEth, totalAssets, totalSupply] =
      await Promise.all([
        pufferClient.vault.getPufETHRate(),
        vault.getContract().read.convertToAssets([oneEth]),
        vault.getContract().read.totalAssets(),
        vault.getContract().read.totalSupply(),
      ]);

    return {
      pufEthPerEth: formatEther(pufEthPerEth),
      ethPerPufEth: formatEther(ethPerPufEth),
      totalAssets: formatEther(totalAssets),
      totalSupply: formatEther(totalSupply),
    };
  },

  async getPufETHBalance(address: string): Promise<bigint> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    return pufferClient.vault.balanceOf(address as `0x${string}`);
  },

  async getEthBalance(address: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please open this app in imToken.');
    }

    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });

    return formatEther(BigInt(balance));
  },

  async getTokenBalance(token: Token, address: string): Promise<bigint> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    return pufferClient.erc20Permit
      .withToken(token)
      .getContract()
      .read.balanceOf([address as `0x${string}`]);
  },

  async stakeETH(address: string, amountWei: bigint): Promise<string> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    const { transact } = pufferClient.vault.depositETH(
      address as `0x${string}`,
    );
    return transact(amountWei);
  },

  async stakeWETH(address: string, amountWei: bigint): Promise<string> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    await this.approveToken(
      Token.WETH,
      address,
      amountWei,
      CONTRACT_ADDRESSES[NETWORKS[activeNetwork].chain].PufferVault,
    );
    const { transact } = pufferClient.vault.deposit(
      address as `0x${string}`,
      amountWei,
    );
    return transact();
  },

  async stakeStETH(address: string, amountWei: bigint): Promise<string> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    const { transact } = await pufferClient.depositor.depositStETH(
      address as `0x${string}`,
      amountWei,
    );
    return transact();
  },

  async stakeWstETH(address: string, amountWei: bigint): Promise<string> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    const { transact } = await pufferClient.depositor.depositWstETH(
      address as `0x${string}`,
      amountWei,
    );
    return transact();
  },

  async approveToken(
    token: Token,
    address: string,
    amountWei: bigint,
    spender?: string,
  ): Promise<string> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    return pufferClient.erc20Permit
      .withToken(token)
      .approve(
        address as `0x${string}`,
        (spender ||
          CONTRACT_ADDRESSES[NETWORKS[activeNetwork].chain]
            .PufferDepositor) as `0x${string}`,
        amountWei,
      );
  },

  async depositToVault(
    address: string,
    unifiToken: UnifiToken,
    token: Token,
    amountWei: bigint,
  ): Promise<string> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    const { transact } = await pufferClient.nucleusTeller
      .withToken(unifiToken)
      .deposit({
        account: address as `0x${string}`,
        token,
        unifiToken,
        amount: amountWei,
        minimumMint: BigInt(0),
        isPreapproved: false,
      });
    return transact();
  },

  async approveErc20Address(
    tokenAddress: string,
    owner: string,
    spender: string,
    amountWei: bigint = maxUint256,
  ): Promise<string> {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please open this app in imToken.');
    }

    const data = encodeFunctionData({
      abi: [
        {
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ type: 'bool' }],
        },
      ] as const,
      functionName: 'approve',
      args: [spender as `0x${string}`, amountWei],
    });

    return window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: owner,
          to: tokenAddress,
          data,
        },
      ],
    });
  },

  async sendRawTransaction(tx: {
    from: string;
    to: string;
    data: string;
    value?: string;
    gas?: string;
    gasPrice?: string;
  }): Promise<string> {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please open this app in imToken.');
    }

    return window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: tx.from,
          to: tx.to,
          data: tx.data,
          value: tx.value || '0x0',
          ...(tx.gas ? { gas: tx.gas } : {}),
          ...(tx.gasPrice ? { gasPrice: tx.gasPrice } : {}),
        },
      ],
    });
  },
};
