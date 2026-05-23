import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { formatEther, parseUnits } from 'viem';
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
import { buildAdvisorOpeningMessage } from './services/advisor-insight';
import { AdvancedStakePanel } from './components/AdvancedStakePanel';
import { useI18n, LanguageSwitcher } from './i18n/context';
import type { Locale } from './i18n/locales';

function numberLocale(locale: Locale) {
  if (locale === 'zh') return 'zh-CN';
  if (locale === 'es') return 'es-ES';
  return 'en-US';
}

type Screen = 'home' | 'stake' | 'vaults';
type StakeToken = 'ETH' | 'stETH' | 'wstETH';
type StakeStep = null | 'approving' | 'staking' | 'swapping' | 'done';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: Action;
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

function fmt(n: string | number, decimals = 4, locale: Locale = 'en') {
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  return v.toLocaleString(numberLocale(locale), {
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

function BackgroundBubbles() {
  return (
    <div className="bg-bubbles" aria-hidden>
      <span className="bubble b1" />
      <span className="bubble b2" />
      <span className="bubble b3" />
      <span className="bubble b4" />
      <span className="bubble b5" />
      <span className="bubble b6" />
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
  const { t, locale } = useI18n();
  return (
    <header className="top-header">
      <div className="brand-lockup">
        <PufferLogo />
        <span>{t('brand')}</span>
      </div>
      <div className="header-actions">
        <LanguageSwitcher compact />
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
            <strong>{fmt(data.balances.pufETH, 4, locale)} pufETH</strong>
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
  const { t } = useI18n();
  return (
    <nav className="bottom-nav">
      <button
        className={screen === 'home' ? 'active' : ''}
        onClick={() => onNav('home')}
      >
        <span>⌂</span>
        {t('nav.home')}
      </button>
      <button
        className={screen === 'stake' ? 'active' : ''}
        onClick={() => onNav('stake')}
      >
        <span>⇧</span>
        {t('nav.stake')}
      </button>
      <button
        className={screen === 'vaults' ? 'active' : ''}
        onClick={() => onNav('vaults')}
      >
        <span>▦</span>
        {t('nav.vaults')}
      </button>
    </nav>
  );
}

function SplashScreen({ loading = false }: { loading?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="app splash-shell">
      <div className="splash-card">
        <PufferLogo />
        <h1>{t('brand')}</h1>
        <p>
          {loading ? t('splash.connecting') : t('splash.openImToken')}
        </p>
        <LanguageSwitcher />
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
  const { t, locale } = useI18n();
  const lastTx = localStorage.getItem('lastTxHash');
  const explorer = NETWORKS[data.network].explorer;
  return (
    <section className="screen-content">
      <div className="hero-card">
        <div>
          <p className="eyebrow">
            {t('home.liveRate', { network: NETWORKS[data.network].label })}
          </p>
          <h1>{data.rate ? fmt(data.rate.ethPerPufEth, 4, locale) : '-'} ETH</h1>
        </div>
        <div className="metric-grid">
          <div>
            <span>{t('home.protocolApy')}</span>
            <strong>
              {data.protocolTVL
                ? `${fmt(data.protocolTVL.apy, 2, locale)}%`
                : '-'}
            </strong>
          </div>
          <div>
            <span>{t('home.totalTvl')}</span>
            <strong>
              {data.protocolTVL
                ? fmtCompact(data.protocolTVL.lrt_total_usd)
                : '-'}
            </strong>
          </div>
        </div>
        {data.network === 'holesky' && (
          <p className="network-note">{t('home.holeskyNote')}</p>
        )}
      </div>

      <div className="cta-row">
        <button className="btn-primary" onClick={() => onNav('stake')}>
          {t('home.stakeEth')}
        </button>
        <button className="btn-secondary" onClick={() => onNav('vaults')}>
          {t('home.browseVaults')}
        </button>
      </div>

      <div className="section-block">
        <div className="section-title-row">
          <h2>{t('home.recentActivity')}</h2>
        </div>
        {lastTx ? (
          <a
            className="activity-row"
            href={`${explorer}/tx/${lastTx}`}
            target="_blank"
            rel="noreferrer"
          >
            <span>{t('home.lastTx')}</span>
            <strong>{shortAddr(lastTx)}</strong>
          </a>
        ) : (
          <div className="empty-state">{t('home.noTx')}</div>
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
  const [step, setStep] = useState<StakeStep>(null);
  const [txHash, setTxHash] = useState('');
  const [err, setErr] = useState('');
  const isTestnet = data.network === 'holesky';
  const { t, locale } = useI18n();

  useEffect(() => {
    if (prefill.token) setToken(prefill.token);
    if (prefill.amount) setAmount(prefill.amount);
    if (prefill.advanced !== undefined) setAdvanced(prefill.advanced);
  }, [prefill]);

  const preview =
    amount && data.rate
      ? fmt(Number(amount) * Number(data.rate.pufEthPerEth), 4, locale)
      : '-';

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

      if (token === 'ETH') {
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
      setErr(e.message || t('stake.txFailed'));
      setStep(null);
    }
  };

  const busy = !!step && step !== 'done';
  return (
    <section className="screen-content">
      <h1 className="screen-title">{t('stake.title')}</h1>
      <div className="form-card">
        {!advanced && (
          <>
            <div className="token-tabs">
              {(['ETH', 'stETH', 'wstETH'] as StakeToken[]).map((t) => (
                <button
                  key={t}
                  className={token === t ? 'active' : ''}
                  onClick={() => setToken(t)}
                  disabled={busy}
                >
                  {t}
                </button>
              ))}
            </div>

            <label className="field-label">{t('stake.amount')}</label>
            <div className="amount-row">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={busy}
              />
              <button onClick={handleMax} disabled={busy}>
                MAX
              </button>
            </div>
            <div className="balance-line">
              {t('stake.balance')}{' '}
              {`${fmt(data.balances[token] || '0', 4, locale)} ${token}`}
            </div>
          </>
        )}

        {!advanced && (
          <>
            <div className="preview-card">
              <span>{t('stake.youReceive')}</span>
              <strong>{preview} pufETH</strong>
            </div>

            {token !== 'ETH' && busy && (
              <ProgressSteps
                step={step || null}
                labels={[t('stake.approve'), t('stake.stakeStep')]}
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
                {t('stake.success')}
              </a>
            )}

            {step !== 'done' && (
              <button
                className="btn-primary full"
                onClick={handleStake}
                disabled={!amount || !data.address || busy}
              >
                {step === 'approving'
                  ? t('stake.approving')
                  : step === 'staking'
                    ? t('stake.staking')
                    : t('stake.stakeToken', { token })}
              </button>
            )}
          </>
        )}
      </div>

      <div className="advanced-card">
        <button
          className="toggle-row"
          onClick={() => !isTestnet && setAdvanced((v) => !v)}
        >
          <span>{t('stake.advanced')}</span>
          <strong>
            {isTestnet
              ? t('stake.mainnetOnly')
              : advanced
                ? t('stake.on')
                : t('stake.off')}
          </strong>
        </button>
        {advanced && !isTestnet && data.address && (
          <AdvancedStakePanel
            walletAddress={data.address}
            rate={data.rate}
            onSuccess={onSuccess}
            initialToken={prefill.customToken}
            initialAmount={prefill.amount}
          />
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
  const { t, locale } = useI18n();

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
      setErr(e.message || t('vaults.depositFailed'));
      setStatus(null);
    }
  };

  return (
    <section className="screen-content">
      <h1 className="screen-title">{t('vaults.title')}</h1>
      {isTestnet && (
        <div className="empty-state">{t('vaults.testnetNote')}</div>
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
                <span>{t('vaults.apy')}</span>
                <strong>
                  {getApy(vault.address) !== undefined
                    ? `${fmt(getApy(vault.address)!, 2, locale)}%`
                    : '-'}
                </strong>
              </div>
              <div>
                <span>{t('vaults.tvl')}</span>
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
              {t('vaults.deposit')}
            </button>
          </article>
        ))}
      </div>

      {selected && !isTestnet && (
        <div className="sheet-overlay" onClick={() => setSelected(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2>{t('vaults.depositVault', { vault: selected.name })}</h2>
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
            <label className="field-label">{t('stake.amount')}</label>
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
              labels={[t('vaults.prepare'), t('vaults.submit')]}
            />
            {err && <p className="error-msg">{err}</p>}
            {status === 'done' && txHash ? (
              <a
                className="success-card"
                href={`${NETWORKS[data.network].explorer}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {t('vaults.success')}
              </a>
            ) : (
              <button
                className="btn-primary full"
                onClick={handleDeposit}
                disabled={!amount || status === 'depositing'}
              >
                {status === 'depositing'
                  ? t('vaults.depositing')
                  : t('vaults.deposit')}
              </button>
            )}
            <button
              className="btn-ghost full"
              onClick={() => setSelected(null)}
            >
              {t('vaults.close')}
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
  const { t, locale } = useI18n();

  const openingMessage = useMemo(
    () =>
      buildAdvisorOpeningMessage(
        {
          rate: data.rate,
          protocolTVL: data.protocolTVL,
          vaultsAPY: data.vaultsAPY,
          vaultsTVL: data.vaultsTVL,
          pufETHBalance: data.balances.pufETH,
        },
        (key, vars) => t(key, vars),
      ),
    [
      data.rate,
      data.protocolTVL,
      data.vaultsAPY,
      data.vaultsTVL,
      data.balances.pufETH,
      t,
    ],
  );

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: openingMessage },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: openingMessage }]);
  }, [openingMessage]);

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
        locale,
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
          {
            role: 'assistant',
            content: result.reply,
            action: result.action,
          },
        ]);
      } else {
        const lower = userMsg.content.toLowerCase();
        const reply = lower.includes('vault')
          ? t('chat.fallbackVault')
          : t('chat.fallbackStake', {
              amount: fmt(data.rate?.pufEthPerEth || 0, 4, locale),
            });
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: reply,
            action: lower.includes('vault')
              ? {
                  type: 'deposit_vault',
                  amount: '',
                  label: t('chat.browseVaults'),
                }
              : {
                  type: 'stake_eth',
                  amount: '1.0',
                  label: t('chat.stake1Eth'),
                },
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: t('chat.offline') },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-overlay">
      <div className="chat-panel">
        <header className="chat-header">
          <strong>{t('chat.title')}</strong>
          <div className="chat-header-actions">
            <LanguageSwitcher compact />
            <button type="button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </header>
        {aiEnabled === false && (
          <p className="chat-setup-hint">{t('chat.noAiKey')}</p>
        )}
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <div className="message-stack">
                <div className="bubble">{m.content}</div>
                {m.action && (
                  <button
                    type="button"
                    className="chat-action-btn"
                    onClick={() => onAction(m.action!)}
                  >
                    {m.action.label}
                  </button>
                )}
              </div>
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
            placeholder={t('chat.placeholder')}
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

    const protocolMetrics =
      protocolTVL ??
      (rate
        ? {
            lrt_total_usd: String(Number(rate.totalAssets) * 3500),
            tvl_puffer_staking: String(Number(rate.totalAssets) * 3500),
            apy: '4.0',
            timestamp: new Date().toISOString(),
          }
        : null);

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
      protocolTVL: protocolMetrics,
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
      <BackgroundBubbles />
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
