import React, { useCallback, useEffect, useState } from 'react';
import { formatEther, parseUnits } from 'viem';
import { PufEthRate } from '../services/api';
import { pufferService } from '../services/puffer';
import { fetchSwapQuote, fetchSwapTransaction } from '../services/swap';
import {
  fetchTokenAllowance,
  fetchTokenMetadata,
  formatTokenAmount,
  isValidTokenAddress,
  truncateAddress,
} from '../services/token-metadata';
import { useI18n } from '../i18n/context';
import type { Locale } from '../i18n/locales';

type AdvancedStep = null | 'approving' | 'swapping' | 'staking' | 'done';

interface QuoteView {
  srcAmountWei: bigint;
  dstAmountWei: bigint;
  tokenSymbol: string;
  tokenDecimals: number;
}

function fmt(n: string | number, decimals = 4, locale: Locale = 'en') {
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  const numberLocale =
    locale === 'zh' ? 'zh-CN' : locale === 'es' ? 'es-ES' : 'en-US';
  return v.toLocaleString(numberLocale, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

function AdvancedProgress({
  step,
  labels,
}: {
  step: AdvancedStep;
  labels: [string, string, string];
}) {
  const index =
    step === 'approving'
      ? 0
      : step === 'swapping'
        ? 1
        : step === 'staking' || step === 'done'
          ? 2
          : -1;

  return (
    <div className="progress-steps advanced-progress">
      {labels.map((label, i) => (
        <div
          key={label}
          className={
            index > i || step === 'done' ? 'done' : index === i ? 'active' : ''
          }
        >
          <span>{i + 1}</span>
          {label}
        </div>
      ))}
    </div>
  );
}

export function AdvancedStakePanel({
  walletAddress,
  rate,
  onSuccess,
  initialToken = '',
  initialAmount = '',
}: {
  walletAddress: string;
  rate: PufEthRate | null;
  onSuccess: () => void;
  initialToken?: string;
  initialAmount?: string;
}) {
  const { t, locale } = useI18n();
  const [tokenAddress, setTokenAddress] = useState(initialToken);
  const [amount, setAmount] = useState(initialAmount);
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [step, setStep] = useState<AdvancedStep>(null);
  const [err, setErr] = useState('');
  const [swapTxHash, setSwapTxHash] = useState('');
  const [stakeTxHash, setStakeTxHash] = useState('');
  const [approveTxHash, setApproveTxHash] = useState('');

  useEffect(() => {
    if (initialToken) setTokenAddress(initialToken);
    if (initialAmount) setAmount(initialAmount);
  }, [initialToken, initialAmount]);

  const addressValid = isValidTokenAddress(tokenAddress);
  const amountValid = amount !== '' && Number(amount) > 0;
  const canQuote = addressValid && amountValid && !!walletAddress;

  const resetQuote = useCallback(() => {
    setQuote(null);
    setQuoteError('');
  }, []);

  useEffect(() => {
    resetQuote();
    if (!addressValid) {
      setTokenSymbol('');
      return;
    }

    let cancelled = false;
    fetchTokenMetadata(tokenAddress)
      .then((meta) => {
        if (!cancelled) {
          setTokenSymbol(meta.symbol);
          setTokenDecimals(meta.decimals);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTokenSymbol(truncateAddress(tokenAddress));
          setTokenDecimals(18);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tokenAddress, addressValid, resetQuote]);

  useEffect(() => {
    resetQuote();
  }, [amount, tokenAddress, resetQuote]);

  const handleGetQuote = async () => {
    if (!canQuote) return;
    setQuoteLoading(true);
    setQuoteError('');
    setQuote(null);
    try {
      const amountWei = parseUnits(amount, tokenDecimals);
      const result = await fetchSwapQuote({
        src: tokenAddress,
        amount: amountWei.toString(),
        from: walletAddress,
      });
      const dstAmountWei = BigInt(result.dstAmount || '0');
      if (dstAmountWei <= BigInt(0)) {
        throw new Error(t('stake.quoteUnavailable'));
      }
      setQuote({
        srcAmountWei: amountWei,
        dstAmountWei,
        tokenSymbol: tokenSymbol || truncateAddress(tokenAddress),
        tokenDecimals,
      });
    } catch {
      setQuoteError(t('stake.quoteUnavailable'));
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleStakeViaSwap = async () => {
    if (!quote || !walletAddress) return;
    setErr('');
    setSwapTxHash('');
    setStakeTxHash('');
    setApproveTxHash('');

    try {
      await pufferService.ensureNetwork('mainnet');

      const swap = await fetchSwapTransaction({
        src: tokenAddress,
        amount: quote.srcAmountWei.toString(),
        from: walletAddress,
      });

      const spender = swap.tx.to;
      const allowance = await fetchTokenAllowance(
        tokenAddress,
        walletAddress,
        spender,
      );

      if (allowance < quote.srcAmountWei) {
        setStep('approving');
        const approveHash = await pufferService.approveErc20Address(
          tokenAddress,
          walletAddress,
          spender,
          quote.srcAmountWei,
        );
        setApproveTxHash(approveHash);
      }

      setStep('swapping');
      const swapHash = await pufferService.sendRawTransaction({
        from: swap.tx.from,
        to: swap.tx.to,
        data: swap.tx.data,
        value: swap.tx.value,
        gas: swap.tx.gas,
        gasPrice: swap.tx.gasPrice,
      });
      setSwapTxHash(swapHash);
      localStorage.setItem('lastTxHash', swapHash);

      setStep('staking');
      const wethOut = BigInt(swap.dstAmount || quote.dstAmountWei.toString());
      const stakeHash = await pufferService.stakeWETH(walletAddress, wethOut);
      setStakeTxHash(stakeHash);
      localStorage.setItem('lastTxHash', stakeHash);

      setStep('done');
      onSuccess();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('stake.txFailed');
      setErr(message);
      setStep(null);
    }
  };

  const busy = !!step && step !== 'done';
  const estWeth = quote ? formatEther(quote.dstAmountWei) : '0';
  const estPufEth =
    quote && rate
      ? fmt(Number(estWeth) * Number(rate.pufEthPerEth), 4, locale)
      : '-';
  const displaySymbol =
    tokenSymbol || (addressValid ? truncateAddress(tokenAddress) : 'TOKEN');

  return (
    <div className="advanced-fields">
      <label className="field-label">{t('stake.tokenAddress')}</label>
      <input
        className="plain-input"
        placeholder="0x..."
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value.trim())}
        disabled={busy}
      />

      <label className="field-label">{t('stake.amount')}</label>
      <div className="amount-row advanced-amount-row">
        <input
          type="number"
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy || !addressValid}
        />
        <span className="amount-symbol">{displaySymbol}</span>
      </div>

      <button
        type="button"
        className={`btn-primary full quote-btn${quoteLoading ? ' loading' : ''}`}
        onClick={handleGetQuote}
        disabled={!canQuote || quoteLoading || busy}
      >
        {quoteLoading ? (
          <span className="btn-spinner-wrap">
            <span className="btn-spinner" aria-hidden />
            {t('stake.fetchingQuote')}
          </span>
        ) : (
          t('stake.getQuote')
        )}
      </button>

      {quoteError && <p className="error-msg">{quoteError}</p>}

      {quote && !quoteError && (
        <div className="route-card">
          <div className="route-flow">
            <span>{quote.tokenSymbol}</span>
            <span className="route-arrow">→</span>
            <span>WETH</span>
            <span className="route-arrow">→</span>
            <span>pufETH</span>
          </div>
          <div className="route-rows">
            <div>
              <span>{t('stake.youSend')}</span>
              <strong>
                {formatTokenAmount(quote.srcAmountWei, quote.tokenDecimals)}{' '}
                {quote.tokenSymbol}
              </strong>
            </div>
            <div>
              <span>{t('stake.estWeth')}</span>
              <strong>{fmt(estWeth, 6, locale)} WETH</strong>
            </div>
            <div>
              <span>{t('stake.estPufEth')}</span>
              <strong>{estPufEth} pufETH</strong>
            </div>
          </div>
        </div>
      )}

      {quote && step !== 'done' && (
        <>
          {busy && (
            <AdvancedProgress
              step={step}
              labels={[
                t('stake.advApprove'),
                t('stake.advSwap'),
                t('stake.advStake'),
              ]}
            />
          )}
          {err && <p className="error-msg">{err}</p>}
          <button
            type="button"
            className="btn-primary full"
            onClick={handleStakeViaSwap}
            disabled={busy}
          >
            {step === 'approving'
              ? t('stake.approving')
              : step === 'swapping'
                ? t('stake.swapping')
                : step === 'staking'
                  ? t('stake.staking')
                  : t('stake.stakeViaSwap')}
          </button>
        </>
      )}

      {step === 'done' && (
        <div className="tx-hash-list">
          {approveTxHash && (
            <a
              className="success-card compact"
              href={`https://etherscan.io/tx/${approveTxHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {t('stake.viewApproveTx')}
            </a>
          )}
          {swapTxHash && (
            <a
              className="success-card compact"
              href={`https://etherscan.io/tx/${swapTxHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {t('stake.viewSwapTx')}
            </a>
          )}
          {stakeTxHash && (
            <a
              className="success-card compact"
              href={`https://etherscan.io/tx/${stakeTxHash}`}
              target="_blank"
              rel="noreferrer"
            >
              {t('stake.viewStakeTx')}
            </a>
          )}
        </div>
      )}

      <p className="powered-by">{t('stake.poweredBy1inch')}</p>
    </div>
  );
}
