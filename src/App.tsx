import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  api,
  PufEthRate,
  PufEthMetrics,
  VaultApy,
  VaultTvl,
  ProtocolTvl,
} from './services/api';
import { pufferService } from './services/puffer';
import { sendMessage, buildSystemPrompt, Action } from './services/advisor';

const IS_MOCK = true; // Force mock mode for hackathon demo

const MOCK_CONTEXT = {
  address: '0xMock000000000000000000000000000000001234',
  balance: '2.4500',
  rate: { pufEthPerEth: '0.959', ethPerPufEth: '1.042', totalAssets: '450000', totalSupply: '432000' },
  metrics: { lrtMarketCap: 1200000000, averageDailyVolume: 5000000, holderCount: 18420 },
  vaultsAPY: {
    data: [
      { token_address: '0x196ead472583bc1e9af7a05f860d9857e1bd3dcc', apy: 5.2 },
      { token_address: '0x82c40e07277eBb92935f79cE92268F80dDc7caB4', apy: 4.8 },
      { token_address: '0x170d847a8320f3b6a77ee15b0cae430e3ec933a0', apy: 3.9 },
      { token_address: '0x62a4ce0722ee65635c0f8339dd814d549b6f6735', apy: 6.1 },
    ],
    timestamp: new Date().toISOString(),
  },
  vaultsTVL: { unifi_eth_vault: '120000000', unifi_usd_vault: '85000000', unifi_btc_vault: '45000000' },
  protocolTVL: { lrt_total_usd: '1200000000', tvl_puffer_staking: '900000000', apy: '4.2', timestamp: new Date().toISOString() },
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AppContextValue {
  address: string | null;
  balance: string;
  rate: PufEthRate | null;
  metrics: PufEthMetrics | null;
  vaultsAPY: VaultApy | null;
  vaultsTVL: VaultTvl | null;
  protocolTVL: ProtocolTvl | null;
}

const VAULT_ADDRESSES: Record<string, string> = {
  unifiETH: '0x196ead472583bc1e9af7a05f860d9857e1bd3dcc',
  unifiUSD: '0x82c40e07277eBb92935f79cE92268F80dDc7caB4',
  unifiBTC: '0x170d847a8320f3b6a77ee15b0cae430e3ec933a0',
  pufETHs: '0x62a4ce0722ee65635c0f8339dd814d549b6f6735',
};

export default function App() {
  const [context, setContext] = useState<AppContextValue>({
    address: null,
    balance: '0',
    rate: null,
    metrics: null,
    vaultsAPY: null,
    vaultsTVL: null,
    protocolTVL: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [showVaults, setShowVaults] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (address: string) => {
    try {
      const [rate, metrics, vaultsAPY, vaultsTVL, protocolTVL] =
        await Promise.all([
          api.getPufETHRate(),
          api.getPufETHMetrics(),
          api.getVaultsAPY(),
          api.getVaultsTVL(),
          api.getProtocolTVL(),
        ]);

      const balance = await pufferService.getPufETHBalance(address);

      setContext({
        address,
        balance: (Number(balance) / 1e18).toFixed(4),
        rate,
        metrics,
        vaultsAPY,
        vaultsTVL,
        protocolTVL,
      });
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        // Check for wallet FIRST before any API calls
        if (IS_MOCK) {
          setContext(MOCK_CONTEXT);
          setMessages([{
            role: 'assistant',
            content: '👋 Welcome to StakeMind! Your AI staking advisor for Puffer Finance.\n\nYou have 2.45 pufETH (≈2.55 ETH). Current rate: 1.042 ETH per pufETH. Protocol APY: 4.2%.\n\nTop vault: pufETHs at 6.1% APY. Want to stake more ETH or explore vaults?',
          }]);
          setLoading(false);
          return;
        }

        // Only fetch real data if wallet exists
        const address = await pufferService.connectWallet();
        await fetchData(address);
        setMessages([{ role: 'assistant', content: 'Welcome to StakeMind! How can I help you with staking today?' }]);
      } catch (err: any) {
        console.error('Init error:', err);
        setError(err.message || 'Failed to initialize app');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      if (IS_MOCK) {
        const mockReplies: Record<string, { reply: string; action?: Action }> = {
          stake: { 
            reply: 'Sure! How much ETH would you like to stake? At the current rate of 1.042 ETH per pufETH, staking 1 ETH will mint about 0.96 pufETH. Current APY is 4.2%.', 
            action: { type: 'stake_eth', amount: '1', label: 'Stake 1 ETH → pufETH' } 
          },
          vault: { 
            reply: 'Top vaults right now: pufETHs leads at 6.1% APY, followed by unifiETH at 5.2%, unifiUSD at 4.8%, and unifiBTC at 3.9%. pufETHs is the best choice for maximizing ETH-denominated yield.' 
          },
          balance: { 
            reply: `You currently hold ${context.balance} pufETH, worth approximately ${(Number(context.balance) * 1.042).toFixed(4)} ETH at today's rate. That's earning you about 4.2% APY just by holding.` 
          },
          apy: { 
            reply: 'pufETH base staking APY is 4.2% from validator rewards. UniFi vaults offer 3.9%–6.1% depending on strategy. The rate appreciates over time as validators earn, so your pufETH becomes worth more ETH.' 
          },
          earn: {
            reply: 'Staking 2 ETH for 3 months at 4.2% APY would earn you about 0.021 ETH (≈$63 at current prices). Your 2 ETH becomes 1.92 pufETH, which grows to ≈2.021 ETH worth of pufETH after 3 months.',
            action: { type: 'stake_eth', amount: '2', label: 'Stake 2 ETH → pufETH' }
          },
          difference: {
            reply: 'unifiETH is a multi-strategy ETH vault (5.2% APY) that deploys across DeFi. pufETHs is a single-sided pufETH vault (6.1% APY) optimized for liquid restaking yield. pufETHs has higher APY but is ETH-only.'
          },
        };
        const key = Object.keys(mockReplies).find((k) => input.toLowerCase().includes(k));
        const result = mockReplies[key || ''] || { 
          reply: 'I can help you stake ETH/stETH/wstETH, compare vault APYs, estimate earnings, or explain how Puffer works. What would you like to know?' 
        };
        setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
        if (result.action) setPendingAction(result.action);
        setSending(false);
        return;
      }

      const result = await sendMessage(
        [...messages, userMessage],
        context as any,
        '',
      );
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.reply },
      ]);
      if (result.action) setPendingAction(result.action);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingAction || !context.address) return;

    try {
      if (IS_MOCK) {
        const mockTx = '0xMock' + Math.random().toString(16).slice(2, 18).toUpperCase();
        setMessages((prev) => [...prev, { role: 'assistant', content: `✅ Mock transaction submitted!\nTx: ${mockTx}\n\nIn a real wallet, this would stake ${pendingAction.amount} ETH and mint ~${(Number(pendingAction.amount) * 0.959).toFixed(4)} pufETH.` }]);
        setPendingAction(null);
        return;
      }

      const amountWei = BigInt(Number(pendingAction.amount) * 1e18);
      let txHash: string;

      switch (pendingAction.type) {
        case 'stake_eth':
          txHash = await pufferService.stakeETH(context.address, amountWei);
          break;
        case 'stake_steth':
          txHash = await pufferService.stakeStETH(context.address, amountWei);
          break;
        case 'stake_wsteth':
          txHash = await pufferService.stakeWstETH(context.address, amountWei);
          break;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Transaction submitted! ${txHash}` },
      ]);
      setPendingAction(null);
      await fetchData(context.address);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="screen loading-screen">
        <div className="skeleton-card"></div>
        <div className="skeleton-line"></div>
        <div className="skeleton-line short"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen error-screen">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>StakeMind {IS_MOCK && <span className="mock-badge">MOCK</span>}</h1>
        <div className="header-info">
          <span>
            {context.address?.slice(0, 6)}...{context.address?.slice(-4)}
          </span>
          <span className="balance">{context.balance} pufETH</span>
        </div>
        <button onClick={() => setShowVaults(true)}>Vaults</button>
      </header>

      <main className="chat-container">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="bubble">{msg.content}</div>
          </div>
        ))}
        {sending && (
          <div className="message assistant">
            <div className="typing">...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="input-container">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about staking..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} disabled={sending || !input.trim()}>
          Send
        </button>
      </footer>

      {pendingAction && (
        <div className="modal">
          <div className="modal-content">
            <h3>Confirm {pendingAction.label}</h3>
            <button onClick={handleConfirm}>Confirm</button>
            <button onClick={() => setPendingAction(null)}>Cancel</button>
          </div>
        </div>
      )}

      {showVaults && (
        <div className="modal">
          <div className="modal-content">
            <h3>UniFi Vaults</h3>
            {Object.entries(VAULT_ADDRESSES).map(([name]) => (
              <div key={name} className="vault-card">
                <h4>{name}</h4>
                <button
                  onClick={() => {
                    setMessages((prev) => [
                      ...prev,
                      { role: 'user', content: `Tell me about ${name}` },
                    ]);
                    setShowVaults(false);
                  }}
                >
                  Ask AI
                </button>
              </div>
            ))}
            <button onClick={() => setShowVaults(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
