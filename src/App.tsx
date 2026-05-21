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
      const [rate, metrics, vaultsAPY, vaultsTVL, protocolTVL, balance] =
        await Promise.all([
          api.getPufETHRate(),
          api.getPufETHMetrics(),
          api.getVaultsAPY(),
          api.getVaultsTVL(),
          api.getProtocolTVL(),
          pufferService.getPufETHBalance(address),
        ]);

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
        const address = await pufferService.connectWallet();
        await fetchData(address);

        const systemPrompt = buildSystemPrompt({
          address,
          pufETHBalance: '0',
          rate: { pufEthPerEth: '0.95', ethPerPufEth: '1.05' },
          metrics: { lrtMarketCap: 0, averageDailyVolume: 0, holderCount: 0 },
          vaultsAPY: { data: [], timestamp: '' },
          vaultsTVL: {
            unifi_eth_vault: '0',
            unifi_usd_vault: '0',
            unifi_btc_vault: '0',
          },
          protocolTVL: {
            lrt_total_usd: '0',
            tvl_puffer_staking: '0',
            apy: '0',
            timestamp: '',
          },
        });

        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + (process.env.LLM_API_KEY || ''),
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'system', content: systemPrompt }],
              temperature: 0.7,
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0].message.content;
          setMessages([{ role: 'assistant', content }]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [fetchData]);

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
        <h1>Puffer AI</h1>
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
