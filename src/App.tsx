import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatEther, parseEther, parseUnits } from 'viem';
import { Token, UnifiToken } from '@pufferfinance/puffer-sdk';
import {
  api,
  PufEthRate,
  VaultApy,
  VaultTvl,
  ProtocolTvl,
} from './services/api';
import { NETWORKS, NetworkKey, pufferService } from './services/puffer';
import { Action } from './services/advisor';

type Screen = 'home' | 'stake' | 'vaults';
type StakeToken = 'ETH' | 'stETH' | 'wstETH';
type StakeStep = null | 'approving' | 'staking' | 'swapping' | 'done';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AppData {
  address: string | null;
  balances: Record<StakeToken | 'pufETH', string>;
  network: NetworkKey;
  rate: PufEthRate | null;
  vaultsAPY: VaultApy | null;
  vaultsTVL: VaultTvl | null;
  protocolTVL: ProtocolTvl | null;
}

interface StakePrefill {
  token?: StakeToken;
  amount?: string;
  customToken?: string;
  advanced?: boolean;
}

interface VaultPrefill {
  vault?: string;
  amount?: string;
}

const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

const STAKE_TOKEN_MAP: Record<Exclude<StakeToken, 'ETH'>, Token> = {
  stETH: Token.stETH,
  wstETH: Token.wstETH,
};

const VAULTS = [
  {
    name: 'unifiETH',
    unifiToken: UnifiToken.unifiETH,
    address: '0x196ead472583bc1e9af7a05f860d9857e1bd3dcc',
    color: '#6EA8FE',
  },
  {
    name: 'unifiUSD',
    unifiToken: UnifiToken.unifiUSD,
    address: '0x82c40e07277eBb92935f79cE92268F80dDc7caB4',
    color: '#49D17D',
  },
  {
    name: 'unifiBTC',
    unifiToken: UnifiToken.unifiBTC,
    address: '0x170d847a8320f3b6a77ee15b0cae430e3ec933a0',
    color: '#F5A623',
  },
  {
    name: 'pufETHs',
    unifiToken: UnifiToken.pufETHs,
    address: '0x62a4ce0722ee65635c0f8339dd814d549b6f6735',
    color: '#F97373',
  },
] as const;

const VAULT_INPUTS: Record<
  string,
  Array<{ label: string; token: Token; decimals: number }>
> = {
  unifiETH: [
    { label: 'WETH', token: Token.WETH, decimals: 18 },
    { label: 'stETH', token: Token.stETH, decimals: 18 },
    { label: 'wstETH', token: Token.wstETH, decimals: 18 },
  ],
  unifiUSD: [
    { label: 'USDC', token: Token.USDC, decimals: 6 },
    { label: 'USDT', token: Token.USDT, decimals: 6 },
    { label: 'DAI', token: Token.DAI, decimals: 18 },
  ],
  unifiBTC: [
    { label: 'WBTC', token: Token.WBTC, decimals: 8 },
    { label: 'LBTC', token: Token.LBTC, decimals: 8 },
    { label: 'tBTC', token: Token.tBTC, decimals: 18 },
  ],
  pufETHs: [
    { label: 'pufETH', token: Token.pufETH, decimals: 18 },
    { label: 'wstETH', token: Token.wstETH, decimals: 18 },
  ],
};

function fmt(n: string | number, decimals = 4) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  return v.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function fmtCompact(n: string | number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function parseAmount(value: string, decimals = 18) {
  return parseUnits(value || '0', decimals);
}

async function safeValue<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn(error);
    return fallback;
  }
}

function PufferLogo() {
  return (
    <div className="puffer-logo" aria-label="Puffer">
      <span>P</span>
    </div>
  );
}

function AppHeader({
  data,
  network,
  onNetworkChange,
}: {
  data: AppData;
  network: NetworkKey;
  onNetworkChange: (network: NetworkKey) => void;
}) {
  return (
    <header className="top-header">
      <div className="brand-lockup">
        <PufferLogo />
        <span>StakeMind</span>
      </div>
      <div className="header-actions">
        <div className="network-tabs">
          {(['mainnet', 'holesky'] as NetworkKey[]).map((key) => (
            <button
              key={key}
              className={network === key ? 'active' : ''}
              onClick={() => onNetworkChange(key)}
            >
              {NETWORKS[key].label}
            </button>
          ))}
        </div>
        {data.address && (
          <div className="wallet-pill">
            <span>{shortAddr(data.address)}</span>
            <strong>{fmt(data.balances.pufETH, 4)} pufETH</strong>
          </div>
        )}
      </div>
    </header>
  );
}

function BottomNav({
  screen,
  onNav,
}: {
  screen: Screen;
  onNav: (screen: Screen) => void;
}) {
  return (
    <nav className="bottom-nav">
      <button
        className={screen === 'home' ? 'active' : ''}
        onClick={() => onNav('home')}
      >
        <span>⌂</span>Home
      </button>
      <button
        className={screen === 'stake' ? 'active' : ''}
        onClick={() => onNav('stake')}
      >
        <span>⇧</span>Stake
      </button>
      <button
        className={screen === 'vaults' ? 'active' : ''}
        onClick={() => onNav('vaults')}
      >
        <span>▦</span>Vaults
      </button>
    </nav>
  );
}

function SplashScreen({ loading = false }: { loading?: boolean }) {
  return (
    <div className="app splash-shell">
      <div className="splash-card">
        <PufferLogo />
        <h1>StakeMind</h1>
        <p>
          {loading
            ? 'Connecting wallet...'
            : 'Open in imToken to connect your wallet'}
        </p>
      </div>
    </div>
  );
}

function HomeScreen({
  data,
  onNav,
}: {
  data: AppData;
  onNav: (screen: Screen) => void;
}) {
  const lastTx = localStorage.getItem('lastTxHash');
  const explorer = NETWORKS[data.network].explorer;
  return (
    <section className="screen-content">
      <div className="hero-card">
        <div>
          <p className="eyebrow">
            Live pufETH / ETH · {NETWORKS[data.network].label}
          </p>
          <h1>{data.rate ? fmt(data.rate.ethPerPufEth, 4) : '-'} ETH</h1>
        </div>
        <div className="metric-grid">
          <div>
            <span>Protocol APY</span>
            <strong>
              {data.protocolTVL ? `${fmt(data.protocolTVL.apy, 2)}%` : '-'}
            </strong>
          </div>
          <div>
            <span>Total TVL</span>
            <strong>
              {data.protocolTVL
                ? fmtCompact(data.protocolTVL.lrt_total_usd)
                : '-'}
            </strong>
          </div>
        </div>
        {data.network === 'holesky' && (
          <p className="network-note">
            Holesky uses testnet contracts. UniFi APY and TVL are mainnet-only.
          </p>
        )}
      </div>

      <div className="cta-row">
        <button className="btn-primary" onClick={() => onNav('stake')}>
          Stake ETH
        </button>
        <button className="btn-secondary" onClick={() => onNav('vaults')}>
          Browse Vaults
        </button>
      </div>

      <div className="section-block">
        <div className="section-title-row">
          <h2>Recent activity</h2>
        </div>
        {lastTx ? (
          <a
            className="activity-row"
            href={`${explorer}/tx/${lastTx}`}
            target="_blank"
            rel="noreferrer"
          >
            <span>Last transaction</span>
            <strong>{shortAddr(lastTx)}</strong>
          </a>
        ) : (
          <div className="empty-state">No local transaction yet</div>
        )}
      </div>
    </section>
  );
}

function ProgressSteps({
  step,
  labels,
}: {
  step: StakeStep | 'depositing';
  labels: [string, string];
}) {
  const activeIndex =
    step === 'approving' || step === 'swapping'
      ? 0
      : step === 'staking' || step === 'depositing' || step === 'done'
        ? 1
        : -1;
  return (
    <div className="progress-steps">
      {labels.map((label, index) => (
        <div
          key={label}
          className={
            activeIndex > index || step === 'done'
              ? 'done'
              : activeIndex === index
                ? 'active'
                : ''
          }
        >
          <span>{index + 1}</span>
          {label}
        </div>
      ))}
    </div>
  );
}

function StakeScreen({
  data,
  prefill,
  onSuccess,
}: {
  data: AppData;
  prefill: StakePrefill;
  onSuccess: (hash: string) => void;
}) {
  const [token, setToken] = useState<StakeToken>(prefill.token || 'ETH');
  const [amount, setAmount] = useState(prefill.amount || '');
  const [advanced, setAdvanced] = useState(!!prefill.advanced);
  const [customToken, setCustomToken] = useState(prefill.customToken || '');
  const [quote, setQuote] = useState<string>('');
  const [step, setStep] = useState<StakeStep>(null);
  const [txHash, setTxHash] = useState('');
  const [err, setErr] = useState('');
  const isTestnet = data.network === 'holesky';

  useEffect(() => {
    if (prefill.token) setToken(prefill.token);
    if (prefill.amount) setAmount(prefill.amount);
    if (prefill.customToken) setCustomToken(prefill.customToken);
    if (prefill.advanced !== undefined) setAdvanced(prefill.advanced);
  }, [prefill]);

  const preview =
    amount && data.rate
      ? fmt(Number(amount) * Number(data.rate.pufEthPerEth), 4)
      : '-';

  const fetchQuote = useCallback(async () => {
    if (!advanced || !customToken || !amount) {
      setQuote('');
      return;
    }
    try {
      const params = new URLSearchParams({
        src: customToken,
        dst: WETH_ADDRESS,
        amount: parseEther(amount).toString(),
      });
      const res = await fetch(`/swap/quote?${params.toString()}`);
      if (!res.ok) throw new Error('Quote unavailable');
      const json = await res.json();
      setQuote(formatEther(BigInt(json.dstAmount || '0')));
    } catch {
      setQuote('');
    }
  }, [advanced, customToken, amount]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleMax = () => {
    if (!advanced) setAmount(data.balances[token] || '0');
  };

  const handleStake = async () => {
    if (!data.address || !amount) return;
    setErr('');
    setTxHash('');
    try {
      const amountWei = parseAmount(amount);
      let hash = '';
      await pufferService.ensureNetwork(data.network);

      if (advanced) {
        if (isTestnet) {
          throw new Error(
            'Advanced swap + stake is available on mainnet only.',
          );
        }
        if (!customToken) throw new Error('Enter a token address');
        setStep('swapping');
        const params = new URLSearchParams({
          src: customToken,
          dst: WETH_ADDRESS,
          amount: amountWei.toString(),
          from: data.address,
          slippage: '1',
          disableEstimate: 'true',
        });
        const res = await fetch(`/swap/transaction?${params.toString()}`);
        if (!res.ok) throw new Error('1inch swap route unavailable');
        const swap = await res.json();
        await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [swap.tx],
        });
        setStep('staking');
        hash = await pufferService.stakeWETH(
          data.address,
          BigInt(swap.dstAmount || '0'),
        );
      } else if (token === 'ETH') {
        setStep('staking');
        hash = await pufferService.stakeETH(data.address, amountWei);
      } else {
        setStep('approving');
        await pufferService.approveToken(
          STAKE_TOKEN_MAP[token],
          data.address,
          amountWei,
        );
        setStep('staking');
        hash =
          token === 'stETH'
            ? await pufferService.stakeStETH(data.address, amountWei)
            : await pufferService.stakeWstETH(data.address, amountWei);
      }

      setStep('done');
      setTxHash(hash);
      localStorage.setItem('lastTxHash', hash);
      onSuccess(hash);
    } catch (e: any) {
      setErr(e.message || 'Transaction failed');
      setStep(null);
    }
  };

  const busy = !!step && step !== 'done';
  return (
    <section className="screen-content">
      <h1 className="screen-title">Stake</h1>
      <div className="form-card">
        <div className="token-tabs">
          {(['ETH', 'stETH', 'wstETH'] as StakeToken[]).map((t) => (
            <button
              key={t}
              className={token === t ? 'active' : ''}
              onClick={() => setToken(t)}
              disabled={busy || advanced}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="field-label">Amount</label>
        <div className="amount-row">
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
          />
          <button onClick={handleMax} disabled={busy || advanced}>
            MAX
          </button>
        </div>
        <div className="balance-line">
          Balance{' '}
          {advanced ? '-' : `${fmt(data.balances[token] || '0', 4)} ${token}`}
        </div>

        <div className="preview-card">
          <span>You will receive</span>
          <strong>
            {advanced && quote
              ? fmt(Number(quote) * Number(data.rate?.pufEthPerEth || 0), 4)
              : preview}{' '}
            pufETH
          </strong>
        </div>

        {((token !== 'ETH' && busy) || advanced) && (
          <ProgressSteps
            step={step || null}
            labels={
              advanced ? ['Swap to WETH', 'Stake WETH'] : ['Approve', 'Stake']
            }
          />
        )}

        {err && <p className="error-msg">{err}</p>}
        {step === 'done' && txHash && (
          <a
            className="success-card"
            href={`${NETWORKS[data.network].explorer}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            Success. View transaction
          </a>
        )}

        {step !== 'done' && (
          <button
            className="btn-primary full"
            onClick={handleStake}
            disabled={!amount || !data.address || busy}
          >
            {step === 'approving'
              ? 'Approving...'
              : step === 'swapping'
                ? 'Swapping...'
                : step === 'staking'
                  ? 'Staking...'
                  : advanced
                    ? 'Swap + Stake'
                    : `Stake ${token}`}
          </button>
        )}
      </div>

      <div className="advanced-card">
        <button
          className="toggle-row"
          onClick={() => !isTestnet && setAdvanced((v) => !v)}
        >
          <span>Stake any token (Advanced)</span>
          <strong>
            {isTestnet ? 'Mainnet only' : advanced ? 'On' : 'Off'}
          </strong>
        </button>
        {advanced && !isTestnet && (
          <div className="advanced-fields">
            <label className="field-label">Token address</label>
            <input
              className="plain-input"
              placeholder="0x..."
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
            />
            <div className="quote-line">
              1inch quote:{' '}
              {quote ? `${fmt(quote, 6)} WETH` : 'enter token and amount'}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function VaultsScreen({
  data,
  prefill,
  onSuccess,
}: {
  data: AppData;
  prefill: VaultPrefill;
  onSuccess: (hash: string) => void;
}) {
  const initialVault = VAULTS.find((v) => v.name === prefill.vault) || null;
  const [selected, setSelected] = useState<(typeof VAULTS)[number] | null>(
    initialVault,
  );
  const [inputToken, setInputToken] = useState(
    VAULT_INPUTS[initialVault?.name || 'unifiETH'][0],
  );
  const [amount, setAmount] = useState(prefill.amount || '');
  const [status, setStatus] = useState<null | 'depositing' | 'done'>(null);
  const [txHash, setTxHash] = useState('');
  const [err, setErr] = useState('');
  const isTestnet = data.network === 'holesky';

  useEffect(() => {
    if (selected) setInputToken(VAULT_INPUTS[selected.name][0]);
  }, [selected]);

  const getApy = (address: string) =>
    data.vaultsAPY?.data.find(
      (v) => v.token_address.toLowerCase() === address.toLowerCase(),
    )?.apy;
  const getTvl = (name: string) => {
    const map: Record<string, string | undefined> = {
      unifiETH: data.vaultsTVL?.unifi_eth_vault,
      unifiUSD: data.vaultsTVL?.unifi_usd_vault,
      unifiBTC: data.vaultsTVL?.unifi_btc_vault,
      pufETHs: data.vaultsTVL?.pufeths_vault,
    };
    return map[name];
  };

  const openVault = (vault: (typeof VAULTS)[number]) => {
    setSelected(vault);
    setAmount('');
    setStatus(null);
    setTxHash('');
    setErr('');
  };

  const handleDeposit = async () => {
    if (!selected || !data.address || !amount) return;
    setErr('');
    try {
      setStatus('depositing');
      await pufferService.ensureNetwork('mainnet');
      const hash = await pufferService.depositToVault(
        data.address,
        selected.unifiToken,
        inputToken.token,
        parseAmount(amount, inputToken.decimals),
      );
      setStatus('done');
      setTxHash(hash);
      localStorage.setItem('lastTxHash', hash);
      onSuccess(hash);
    } catch (e: any) {
      setErr(e.message || 'Deposit failed');
      setStatus(null);
    }
  };

  return (
    <section className="screen-content">
      <h1 className="screen-title">Vaults</h1>
      {isTestnet && (
        <div className="empty-state">
          UniFi vault deposits are mainnet-only in the current Puffer SDK.
          Switch to Mainnet to deposit.
        </div>
      )}
      <div className="vault-grid">
        {VAULTS.map((vault) => (
          <article className="vault-card" key={vault.name}>
            <div className="vault-card-head">
              <span style={{ background: vault.color }} />
              <h2>{vault.name}</h2>
            </div>
            <div className="vault-metrics">
              <div>
                <span>APY</span>
                <strong>
                  {getApy(vault.address) !== undefined
                    ? `${fmt(getApy(vault.address)!, 2)}%`
                    : '-'}
                </strong>
              </div>
              <div>
                <span>TVL</span>
                <strong>
                  {getTvl(vault.name) ? fmtCompact(getTvl(vault.name)!) : '-'}
                </strong>
              </div>
            </div>
            <button
              className="btn-primary small"
              onClick={() => openVault(vault)}
              disabled={isTestnet}
            >
              Deposit
            </button>
          </article>
        ))}
      </div>

      {selected && !isTestnet && (
        <div className="sheet-overlay" onClick={() => setSelected(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2>Deposit {selected.name}</h2>
            <div className="token-tabs compact">
              {VAULT_INPUTS[selected.name].map((option) => (
                <button
                  key={option.label}
                  className={inputToken.label === option.label ? 'active' : ''}
                  onClick={() => setInputToken(option)}
                  disabled={status === 'depositing'}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="field-label">Amount</label>
            <div className="amount-row">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={status === 'depositing'}
              />
            </div>
            <ProgressSteps
              step={status || null}
              labels={['Prepare deposit', 'Submit deposit']}
            />
            {err && <p className="error-msg">{err}</p>}
            {status === 'done' && txHash ? (
              <a
                className="success-card"
                href={`${NETWORKS[data.network].explorer}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Success. View transaction
              </a>
            ) : (
              <button
                className="btn-primary full"
                onClick={handleDeposit}
                disabled={!amount || status === 'depositing'}
              >
                {status === 'depositing' ? 'Depositing...' : 'Deposit'}
              </button>
            )}
            <button
              className="btn-ghost full"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ChatOverlay({
  data,
  onClose,
  onAction,
}: {
  data: AppData;
  onClose: () => void;
  onAction: (action: Action) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Ask me about Puffer staking, vault APYs, or how much pufETH you would receive. Current APY is ${data.protocolTVL?.apy || '-'}%.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/advisor/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((status) => setAiEnabled(!!status?.configured))
      .catch(() => setAiEnabled(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = { role: 'user' as const, content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const context = {
        address: data.address || '',
        pufETHBalance: data.balances.pufETH,
        rate: data.rate || { pufEthPerEth: '0', ethPerPufEth: '0' },
        metrics: {},
        vaultsAPY: data.vaultsAPY || { data: [], timestamp: '' },
        vaultsTVL: data.vaultsTVL || {},
        protocolTVL: data.protocolTVL || {
          lrt_total_usd: '0',
          tvl_puffer_staking: '0',
          apy: '0',
          timestamp: '',
        },
      };

      const response = await fetch('/advisor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], context }),
      });

      if (response.ok) {
        const result = await response.json();
        if (typeof result.aiEnabled === 'boolean') {
          setAiEnabled(result.aiEnabled);
        }
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.reply },
        ]);
        if (result.action) setTimeout(() => onAction(result.action!), 400);
      } else {
        const lower = userMsg.content.toLowerCase();
        const reply = lower.includes('vault')
          ? 'The Vaults screen has live APY and TVL for all four UniFi vaults. I can take you there to review before depositing.'
          : `At the current rate, 1 ETH previews about ${fmt(data.rate?.pufEthPerEth || 0, 4)} pufETH. I can open the Stake screen with the amount filled so you can confirm.`;
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        setTimeout(
          () =>
            onAction(
              lower.includes('vault')
                ? { type: 'deposit_vault', amount: '', label: 'Browse Vaults' }
                : { type: 'stake_eth', amount: '1.0', label: 'Stake 1 ETH' },
            ),
          400,
        );
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'I could not reach the advisor right now, but the live staking and vault screens are ready.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-overlay">
      <div className="chat-panel">
        <header className="chat-header">
          <strong>AI Advisor</strong>
          <button onClick={onClose}>×</button>
        </header>
        {aiEnabled === false && (
          <p className="chat-setup-hint">
            No free AI key found. Add <code>GROQ_API_KEY</code> (free at
            console.groq.com) or <code>GEMINI_API_KEY</code> to <code>.env</code>{' '}
            and restart <code>pnpm dev</code>. Using basic fallback until then.
          </p>
        )}
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div className="bubble">{m.content}</div>
            </div>
          ))}
          {sending && (
            <div className="message assistant">
              <div className="bubble">...</div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="chat-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about Puffer..."
          />
          <button onClick={handleSend} disabled={!input.trim() || sending}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

const initialData: AppData = {
  address: null,
  balances: { ETH: '0', stETH: '0', wstETH: '0', pufETH: '0' },
  network: 'mainnet',
  rate: null,
  vaultsAPY: null,
  vaultsTVL: null,
  protocolTVL: null,
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [data, setData] = useState<AppData>(initialData);
  const [loading, setLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [stakePrefill, setStakePrefill] = useState<StakePrefill>({});
  const [vaultPrefill, setVaultPrefill] = useState<VaultPrefill>({});
  const [network, setNetwork] = useState<NetworkKey>('mainnet');

  const fetchData = useCallback(async (address: string, active: NetworkKey) => {
    const [rate, vaultsAPY, vaultsTVL, protocolTVL] =
      active === 'mainnet'
        ? await Promise.all([
            safeValue(() => api.getPufETHRate(), null),
            safeValue(() => api.getVaultsAPY(), null),
            safeValue(() => api.getVaultsTVL(), null),
            safeValue(() => api.getProtocolTVL(), null),
          ])
        : [
            await safeValue(() => pufferService.getPufETHRate(), null),
            null,
            null,
            {
              lrt_total_usd: '0',
              tvl_puffer_staking: '0',
              apy: '0',
              timestamp: new Date().toISOString(),
            },
          ];

    const [pufETH, eth, stETH, wstETH] = await Promise.all([
      safeValue(() => pufferService.getPufETHBalance(address), BigInt(0)),
      safeValue(() => pufferService.getEthBalance(address), '0'),
      safeValue(
        () => pufferService.getTokenBalance(Token.stETH, address),
        BigInt(0),
      ),
      safeValue(
        () => pufferService.getTokenBalance(Token.wstETH, address),
        BigInt(0),
      ),
    ]);

    setData({
      address,
      network: active,
      balances: {
        ETH: eth,
        stETH: formatEther(stETH),
        wstETH: formatEther(wstETH),
        pufETH: formatEther(pufETH),
      },
      rate,
      vaultsAPY,
      vaultsTVL,
      protocolTVL,
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) {
        setHasWallet(false);
        setLoading(false);
        return;
      }
      setHasWallet(true);
      try {
        const activeNetwork = await pufferService.getWalletNetwork();
        setNetwork(activeNetwork);
        const address = await pufferService.connectWallet(activeNetwork);
        await fetchData(address, activeNetwork);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchData]);

  const nav = (next: Screen) => {
    setScreen(next);
    if (next !== 'stake') setStakePrefill({});
    if (next !== 'vaults') setVaultPrefill({});
  };

  const handleAdvisorAction = (action: Action) => {
    setChatOpen(false);
    if (action.type === 'stake_eth') {
      setStakePrefill({ token: 'ETH', amount: action.amount });
      setScreen('stake');
    } else if (action.type === 'stake_steth') {
      setStakePrefill({ token: 'stETH', amount: action.amount });
      setScreen('stake');
    } else if (action.type === 'stake_wsteth') {
      setStakePrefill({ token: 'wstETH', amount: action.amount });
      setScreen('stake');
    } else if (action.type === 'swap_and_stake') {
      setStakePrefill({
        advanced: true,
        amount: action.amount,
        customToken: action.inputToken,
      });
      setScreen('stake');
    } else if (action.type === 'deposit_vault') {
      setVaultPrefill({ vault: action.vault, amount: action.amount });
      setScreen('vaults');
    }
  };

  const handleNetworkChange = async (next: NetworkKey) => {
    if (!data.address || next === network) return;
    setLoading(true);
    try {
      await pufferService.switchNetwork(next);
      setNetwork(next);
      setScreen('home');
      setStakePrefill({});
      setVaultPrefill({});
      await fetchData(data.address, next);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    if (data.address) fetchData(data.address, network);
  };

  if (loading) return <SplashScreen loading />;
  if (!hasWallet) return <SplashScreen />;

  return (
    <div className="app-shell">
      <AppHeader
        data={data}
        network={network}
        onNetworkChange={handleNetworkChange}
      />
      <main className="main-content">
        {screen === 'home' && <HomeScreen data={data} onNav={nav} />}
        {screen === 'stake' && (
          <StakeScreen data={data} prefill={stakePrefill} onSuccess={refresh} />
        )}
        {screen === 'vaults' && (
          <VaultsScreen
            data={data}
            prefill={vaultPrefill}
            onSuccess={refresh}
          />
        )}
      </main>
      <BottomNav screen={screen} onNav={nav} />
      <button
        className="advisor-fab"
        onClick={() => setChatOpen(true)}
        aria-label="Open AI advisor"
      >
        💬
      </button>
      {chatOpen && (
        <ChatOverlay
          data={data}
          onClose={() => setChatOpen(false)}
          onAction={handleAdvisorAction}
        />
      )}
    </div>
  );
}
