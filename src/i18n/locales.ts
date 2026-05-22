export type Locale = 'en' | 'zh' | 'es';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  zh: '中文',
  es: 'ES',
};

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  zh: '简体中文',
  es: 'Español',
};

export type Messages = typeof en;

const en = {
  brand: 'StakeMind',
  nav: { home: 'Home', stake: 'Stake', vaults: 'Vaults' },
  splash: {
    connecting: 'Connecting wallet...',
    openImToken: 'Open in imToken to connect your wallet',
  },
  home: {
    liveRate: 'Live pufETH / ETH · {{network}}',
    protocolApy: 'Protocol APY',
    totalTvl: 'Total TVL',
    holeskyNote:
      'Holesky uses testnet contracts. UniFi APY and TVL are mainnet-only.',
    stakeEth: 'Stake ETH',
    browseVaults: 'Browse Vaults',
    recentActivity: 'Recent activity',
    lastTx: 'Last transaction',
    noTx: 'No local transaction yet',
  },
  stake: {
    title: 'Stake',
    amount: 'Amount',
    balance: 'Balance',
    youReceive: 'You will receive',
    approve: 'Approve',
    stakeStep: 'Stake',
    swapWeth: 'Swap to WETH',
    stakeWeth: 'Stake WETH',
    approving: 'Approving...',
    swapping: 'Swapping...',
    staking: 'Staking...',
    swapStake: 'Swap + Stake',
    stakeToken: 'Stake {{token}}',
    success: 'Success. View transaction',
    advanced: 'Stake any token (Advanced)',
    mainnetOnly: 'Mainnet only',
    on: 'On',
    off: 'Off',
    tokenAddress: 'Token address',
    quote: '1inch quote:',
    quoteEmpty: 'enter token and amount',
    advancedMainnet: 'Advanced swap + stake is available on mainnet only.',
    enterToken: 'Enter a token address',
    txFailed: 'Transaction failed',
  },
  vaults: {
    title: 'Vaults',
    testnetNote:
      'UniFi vault deposits are mainnet-only in the current Puffer SDK. Switch to Mainnet to deposit.',
    apy: 'APY',
    tvl: 'TVL',
    deposit: 'Deposit',
    depositing: 'Depositing...',
    depositVault: 'Deposit {{vault}}',
    prepare: 'Prepare deposit',
    submit: 'Submit deposit',
    close: 'Close',
    depositFailed: 'Deposit failed',
    success: 'Success. View transaction',
  },
  chat: {
    title: 'AI Advisor',
    greeting:
      'Ask me about Puffer staking, vault APYs, or how much pufETH you would receive. Current APY is {{apy}}%.',
    placeholder: 'Ask about Puffer...',
    noAiKey:
      'No AI key configured on server. Using basic replies until Groq/Gemini is set up.',
    offline:
      'I could not reach the advisor right now, but the live staking and vault screens are ready.',
    fallbackVault:
      'The Vaults screen has live APY and TVL for all four UniFi vaults. Tap below if you want to browse them.',
    fallbackStake:
      'At the current rate, 1 ETH previews about {{amount}} pufETH. Tap below to open the Stake screen.',
    browseVaults: 'Browse Vaults',
    stake1Eth: 'Stake 1 ETH',
  },
  advisor: {
    languageInstruction:
      'Respond in {{language}}. Action button labels in <action> JSON must also be in {{language}}.',
  },
};

const zh: Messages = {
  brand: 'StakeMind',
  nav: { home: '首页', stake: '质押', vaults: '金库' },
  splash: {
    connecting: '正在连接钱包...',
    openImToken: '请在 imToken 中打开以连接钱包',
  },
  home: {
    liveRate: '实时 pufETH / ETH · {{network}}',
    protocolApy: '协议 APY',
    totalTvl: '总 TVL',
    holeskyNote: 'Holesky 为测试网合约。UniFi APY 与 TVL 仅主网可用。',
    stakeEth: '质押 ETH',
    browseVaults: '浏览金库',
    recentActivity: '最近活动',
    lastTx: '最近交易',
    noTx: '暂无本地交易记录',
  },
  stake: {
    title: '质押',
    amount: '数量',
    balance: '余额',
    youReceive: '你将获得',
    approve: '授权',
    stakeStep: '质押',
    swapWeth: '兑换为 WETH',
    stakeWeth: '质押 WETH',
    approving: '授权中...',
    swapping: '兑换中...',
    staking: '质押中...',
    swapStake: '兑换并质押',
    stakeToken: '质押 {{token}}',
    success: '成功，查看交易',
    advanced: '质押任意代币（高级）',
    mainnetOnly: '仅主网',
    on: '开',
    off: '关',
    tokenAddress: '代币合约地址',
    quote: '1inch 报价：',
    quoteEmpty: '请输入代币和数量',
    advancedMainnet: '高级兑换+质押仅主网可用。',
    enterToken: '请输入代币地址',
    txFailed: '交易失败',
  },
  vaults: {
    title: '金库',
    testnetNote:
      '当前 Puffer SDK 中 UniFi 金库存款仅支持主网。请切换到主网。',
    apy: 'APY',
    tvl: 'TVL',
    deposit: '存入',
    depositing: '存入中...',
    depositVault: '存入 {{vault}}',
    prepare: '准备存入',
    submit: '提交存入',
    close: '关闭',
    depositFailed: '存入失败',
    success: '成功，查看交易',
  },
  chat: {
    title: 'AI 顾问',
    greeting:
      '可问我 Puffer 质押、金库 APY 或能获得多少 pufETH。当前 APY 为 {{apy}}%。',
    placeholder: '询问 Puffer...',
    noAiKey: '服务器未配置 AI 密钥，当前使用基础回复。',
    offline: '暂时无法连接顾问，但质押与金库页面可正常使用。',
    fallbackVault: '金库页面显示四个 UniFi 金库的实时 APY 与 TVL，点击下方可浏览。',
    fallbackStake:
      '按当前汇率，1 ETH 约可兑换 {{amount}} pufETH。点击下方打开质押页面。',
    browseVaults: '浏览金库',
    stake1Eth: '质押 1 ETH',
  },
  advisor: {
    languageInstruction:
      '请使用{{language}}回复。<action> 中的按钮文案也必须使用{{language}}。',
  },
};

const es: Messages = {
  brand: 'StakeMind',
  nav: { home: 'Inicio', stake: 'Stake', vaults: 'Bóvedas' },
  splash: {
    connecting: 'Conectando billetera...',
    openImToken: 'Abre en imToken para conectar tu billetera',
  },
  home: {
    liveRate: 'pufETH / ETH en vivo · {{network}}',
    protocolApy: 'APY del protocolo',
    totalTvl: 'TVL total',
    holeskyNote:
      'Holesky usa contratos de testnet. APY y TVL de UniFi solo en mainnet.',
    stakeEth: 'Stake ETH',
    browseVaults: 'Ver bóvedas',
    recentActivity: 'Actividad reciente',
    lastTx: 'Última transacción',
    noTx: 'Sin transacciones locales',
  },
  stake: {
    title: 'Stake',
    amount: 'Cantidad',
    balance: 'Saldo',
    youReceive: 'Recibirás',
    approve: 'Aprobar',
    stakeStep: 'Stake',
    swapWeth: 'Swap a WETH',
    stakeWeth: 'Stake WETH',
    approving: 'Aprobando...',
    swapping: 'Intercambiando...',
    staking: 'Haciendo stake...',
    swapStake: 'Swap + Stake',
    stakeToken: 'Stake {{token}}',
    success: 'Éxito. Ver transacción',
    advanced: 'Stake cualquier token (Avanzado)',
    mainnetOnly: 'Solo mainnet',
    on: 'Sí',
    off: 'No',
    tokenAddress: 'Dirección del token',
    quote: 'Cotización 1inch:',
    quoteEmpty: 'ingresa token y cantidad',
    advancedMainnet: 'Swap + stake avanzado solo en mainnet.',
    enterToken: 'Ingresa la dirección del token',
    txFailed: 'Transacción fallida',
  },
  vaults: {
    title: 'Bóvedas',
    testnetNote:
      'Los depósitos UniFi son solo mainnet en el SDK actual. Cambia a Mainnet.',
    apy: 'APY',
    tvl: 'TVL',
    deposit: 'Depositar',
    depositing: 'Depositando...',
    depositVault: 'Depositar {{vault}}',
    prepare: 'Preparar depósito',
    submit: 'Enviar depósito',
    close: 'Cerrar',
    depositFailed: 'Depósito fallido',
    success: 'Éxito. Ver transacción',
  },
  chat: {
    title: 'Asesor IA',
    greeting:
      'Pregunta sobre staking Puffer, APY de bóvedas o cuánto pufETH recibirías. APY actual: {{apy}}%.',
    placeholder: 'Pregunta sobre Puffer...',
    noAiKey: 'Sin clave IA en el servidor. Respuestas básicas por ahora.',
    offline:
      'No pude contactar al asesor, pero las pantallas de stake y bóvedas están listas.',
    fallbackVault:
      'La pantalla Bóvedas tiene APY y TVL en vivo. Toca abajo para explorar.',
    fallbackStake:
      'A la tasa actual, 1 ETH ≈ {{amount}} pufETH. Toca abajo para abrir Stake.',
    browseVaults: 'Ver bóvedas',
    stake1Eth: 'Stake 1 ETH',
  },
  advisor: {
    languageInstruction:
      'Responde en {{language}}. Las etiquetas en <action> JSON también en {{language}}.',
  },
};

export const messages: Record<Locale, Messages> = { en, zh, es };

export function interpolate(
  template: string,
  vars: Record<string, string | number>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}
