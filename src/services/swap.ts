const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const ONE_INCH_BASE = 'https://api.1inch.dev/swap/v6.0/1';

declare const __ONE_INCH_API_KEY__: string | undefined;

export interface OneInchQuote {
  dstAmount: string;
  srcAmount?: string;
  [key: string]: unknown;
}

export interface OneInchSwap {
  dstAmount: string;
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gas?: string;
    gasPrice?: string;
  };
  [key: string]: unknown;
}

function frontendOneInchKey(): string {
  if (typeof __ONE_INCH_API_KEY__ !== 'undefined' && __ONE_INCH_API_KEY__) {
    return __ONE_INCH_API_KEY__;
  }
  return '';
}

async function parseJsonResponse(res: Response) {
  const data = await res.json();
  if (!res.ok) {
    const message =
      (data as { description?: string; message?: string; error?: string })
        ?.description ||
      (data as { message?: string })?.message ||
      (data as { error?: string })?.error ||
      'Quote unavailable for this token';
    throw new Error(message);
  }
  return data;
}

export async function fetchSwapProxyAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/swap/status');
    if (!res.ok) return false;
    const data = await res.json();
    return data.proxyAvailable === true;
  } catch {
    return false;
  }
}

async function fetchOneInchDirect(
  path: 'quote' | 'swap',
  params: URLSearchParams,
): Promise<OneInchQuote | OneInchSwap> {
  const apiKey = frontendOneInchKey();
  if (!apiKey) {
    throw new Error('Quote unavailable for this token');
  }

  const res = await fetch(`${ONE_INCH_BASE}/${path}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return parseJsonResponse(res);
}

async function fetchViaProxy(
  path: 'quote' | 'transaction',
  params: URLSearchParams,
): Promise<OneInchQuote | OneInchSwap> {
  const res = await fetch(`/swap/${path}?${params.toString()}`);
  return parseJsonResponse(res);
}

export async function fetchSwapQuote(params: {
  src: string;
  dst?: string;
  amount: string;
  from?: string;
}): Promise<OneInchQuote> {
  const search = new URLSearchParams({
    src: params.src,
    dst: params.dst || WETH_ADDRESS,
    amount: params.amount,
  });
  if (params.from) search.set('from', params.from);

  const proxyAvailable = await fetchSwapProxyAvailable();
  if (proxyAvailable) {
    try {
      return (await fetchViaProxy('quote', search)) as OneInchQuote;
    } catch {
      // fall through to direct
    }
  }

  return (await fetchOneInchDirect('quote', search)) as OneInchQuote;
}

export async function fetchSwapTransaction(params: {
  src: string;
  dst?: string;
  amount: string;
  from: string;
  slippage?: string;
}): Promise<OneInchSwap> {
  const search = new URLSearchParams({
    src: params.src,
    dst: params.dst || WETH_ADDRESS,
    amount: params.amount,
    from: params.from,
    slippage: params.slippage || '1',
    disableEstimate: 'true',
  });

  const proxyAvailable = await fetchSwapProxyAvailable();
  if (proxyAvailable) {
    try {
      return (await fetchViaProxy('transaction', search)) as OneInchSwap;
    } catch {
      // fall through
    }
  }

  const directParams = new URLSearchParams(search);
  return (await fetchOneInchDirect('swap', directParams)) as OneInchSwap;
}

export { WETH_ADDRESS };
