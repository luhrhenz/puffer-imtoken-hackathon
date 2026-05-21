import {
  PufferClientHelpers,
  PufferClient,
  Chain,
  Token,
  UnifiToken,
} from '@pufferfinance/puffer-sdk';

const RPC_URL = process.env.ETH_RPC_URL || 'https://eth.llamarpc.com';

let pufferClient: PufferClient | null = null;

export const pufferService = {
  async connectWallet(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('No wallet found. Please open this app in imToken.');
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    await this.init(window.ethereum);
    return accounts[0];
  },

  async init(provider: any) {
    const walletClient = PufferClientHelpers.createWalletClient({
      chain: Chain.Mainnet,
      provider,
    });

    const publicClient = PufferClientHelpers.createPublicClient({
      chain: Chain.Mainnet,
      rpcUrls: [RPC_URL],
    });

    pufferClient = new PufferClient(Chain.Mainnet, walletClient, publicClient);
    return pufferClient;
  },

  async getPufETHBalance(address: string): Promise<bigint> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    return pufferClient.vault.balanceOf(address as `0x${string}`);
  },

  async stakeETH(address: string, amountWei: bigint): Promise<string> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    const { transact } = pufferClient.vault.depositETH(
      address as `0x${string}`,
    );
    return transact(amountWei);
  },

  async stakeStETH(address: string, amountWei: bigint): Promise<string> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    const { transact } = pufferClient.vault.depositStETH(
      address as `0x${string}`,
    );
    return transact(amountWei);
  },

  async stakeWstETH(address: string, amountWei: bigint): Promise<string> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    const { transact } = pufferClient.vault.depositWstETH(
      address as `0x${string}`,
    );
    return transact(amountWei);
  },

  async approveToken(
    token: Token,
    address: string,
    amountWei: bigint,
  ): Promise<string> {
    if (!pufferClient) throw new Error('Puffer client not initialized');
    return pufferClient.vault.approveToken(
      token,
      address as `0x${string}`,
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
};
