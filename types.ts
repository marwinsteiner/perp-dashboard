
export interface MarketSymbol {
  symbol: string;
  base: string;
  quote: string;
}

export interface SpotTicker {
  symbol: string;
  bidPrice: number;
  bidQty: number;
  askPrice: number;
  askQty: number;
}

export interface FuturesMark {
  symbol: string;
  markPrice: number;
  fundingRate: number;
  nextFundingTime: number;
}

export interface CombinedMarketData {
  symbol: string;
  spot?: SpotTicker;
  futures?: FuturesMark;
}

export interface WebSocketMessage {
  e?: string; // event type
  s?: string; // symbol
  b?: string; // bid price
  B?: string; // bid qty
  a?: string; // ask price
  A?: string; // ask qty
  p?: string; // mark price
  r?: string; // funding rate
  T?: number; // next funding time
  // Depth
  bids?: [string, string][];
  asks?: [string, string][];
  // Trade
  m?: boolean; // is buyer maker
  q?: string; // quantity
  T_trade?: number; // trade time
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number; // cumulative size
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface Trade {
  id: number;
  price: number;
  qty: number;
  time: number;
  isBuyerMaker: boolean; // true = Sell (aggressor sold into bid), false = Buy (aggressor bought ask)
}

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface FocusMetrics {
  spotChange1m: number;
  spotChange5m: number;
  perpChange1m: number;
  perpChange5m: number;
  basisChange1m: number;
  basisChange5m: number;
}

// --- Futures Curve Types ---

export interface FuturesSymbolInfo {
  symbol: string;
  pair: string;
  contractType: 'PERPETUAL' | 'CURRENT_QUARTER' | 'NEXT_QUARTER' | 'CURRENT_MONTH' | 'NEXT_MONTH'; // Simplified
  deliveryDate: number;
  onboardDate: number;
  baseAsset: string;
  quoteAsset: string;
}

export interface CurvePoint {
  symbol: string;
  type: 'SPOT' | 'PERP' | 'FUTURE';
  marginType: 'USDT' | 'COIN' | 'SPOT';
  price: number;
  expiryDate?: number; // Timestamp
  daysToExpiry: number;
  basis: number; // Raw diff
  basisPercent: number; // (F-S)/S
  annualizedBasis: number; // APR %
}

// --- Window Management Types ---

export type ViewType = 'SCREENER' | 'PORTFOLIO' | 'FOCUS' | 'CHART' | 'CURVE' | 'MARS' | 'STRAT' | 'HELP' | 'SHOCK' | 'FLOW' | 'OMS' | 'TICKET' | 'BLOTTER';

export interface WindowState {
  id: string;
  type: ViewType;
  title: string;
  symbol?: string; // Context for the view (e.g. BTCUSDT)
  isFloating: boolean;
  isMinimized: boolean;
  zIndex: number;
  // Position & Size for floating
  x: number;
  y: number;
  w: number;
  h: number;
  // OMS Specific Context
  contextData?: any; 
}

export interface ScreenConfig {
  name: string;
  timestamp: number;
  windows: WindowState[];
  activeTabId: string;
}

// --- Portfolio & Risk Types ---

export interface Position {
  id: string;
  baseAsset: string; // BTC
  symbol: string; // BTCUSDT
  venue: 'SPOT' | 'PERP_USDT' | 'FUTURE_USDT'; 
  side: 'LONG' | 'SHORT';
  quantity: number; // Always positive
  avgEntryPrice: number;
  timestamp: number;
  strategyId?: string;
  traderId?: string;
}

export interface LivePosition extends Position {
  markPrice: number;
  notionalBase: number; // quantity * 1 (or contract multiplier)
  notionalUsd: number; // quantity * markPrice
  unrealizedPnl: number;
  pnlPercent: number;
}

export interface PortfolioGroup {
  baseAsset: string;
  positions: LivePosition[];
  netDeltaBase: number;
  netDeltaUsd: number;
  totalPnl: number;
}

export interface RiskMetrics {
  totalEquity: number;
  totalPnl: number;
  dayPnl: number; // Simple approximation
  netDeltaUsd: number;
  longExposure: number;
  shortExposure: number;
  leverage: number; // gross / equity
}

export interface CarryMetric {
    baseAsset: string;
    spotPrice: number;
    perpPrice: number;
    basisBps: number;
    fundingRate: number;
    impliedCarryApr: number;
}

// --- MARS (Risk System) Types ---

export interface RiskLimit {
  id: string;
  type: 'DESK' | 'STRATEGY' | 'TRADER' | 'SYMBOL' | 'VENUE';
  entityId: string; // The ID of the strategy, trader, etc.
  limitNotionalUsd: number;
  isHardBlock: boolean;
}

export interface RiskNode {
  id: string;
  name: string;
  type: 'DESK' | 'STRATEGY' | 'TRADER' | 'SYMBOL' | 'VENUE';
  grossExposureUsd: number;
  netExposureUsd: number;
  longExposureUsd: number;
  shortExposureUsd: number;
  limitUsd: number;
  utilization: number; // 0 to 1
  isBreached: boolean;
  children?: RiskNode[];
  isBlocked?: boolean;
}

export interface RiskOverrideLog {
  timestamp: number;
  entityId: string;
  user: string;
  oldLimit: number;
  newLimit: number;
  reason: string;
}

// --- STRAT (Strategy Management) Types ---

export type StrategyState = 'RUNNING' | 'PAUSED' | 'DRAINING' | 'ERROR';

export interface StrategyInstance {
  id: string;
  name: string;
  family: string;
  desk: string;
  owner: string;
  venues: string[];
  instruments: string[];
  state: StrategyState;
  
  // Operational Health (Mocked)
  rejectRate: number; // %
  avgSlippageBps: number;
  medianTimeToFillMs: number;
  lastTickAgeMs: number;
  
  // Performance (Mocked/Aggregated)
  pnlDay: number;
  pnlMtd: number;
  hitRate: number; // %
  avgTradeSizeUsd: number;
  sharpeRatio: number;
  profitFactor: number;

  riskFlags: string[];

  // Live Aggregate Notional (Injected by Hook)
  grossNotionalUsd?: number;
  netNotionalUsd?: number;
}

export interface StrategyLog {
  timestamp: number;
  strategyId: string;
  user: string;
  action: string;
  oldState?: string;
  newState?: string;
  reason: string;
}

// --- SHOCK (Scenario Analysis) Types ---

export interface ShockParameter {
  id: string;
  type: 'SPOT_PCT' | 'FUTURES_PCT' | 'FUNDING_ABS' | 'BASIS_BPS';
  scope: 'GLOBAL' | 'ASSET' | 'STRATEGY';
  target?: string; // e.g. 'BTC' or 'TREND_FOLLOW'
  value: number; // e.g. -5 for -5% or 0.01 for 0.01%
}

export interface ShockScenario {
  id: string;
  name: string;
  parameters: ShockParameter[];
}

export interface ShockResultNode {
  id: string;
  name: string;
  type: 'DESK' | 'STRATEGY' | 'ASSET';
  
  // Current Live State
  currentPnl: number;
  currentGross: number;
  currentUtilization: number;

  // Hypothetical State
  shockPnl: number; // The new Total PnL
  shockDeltaPnl: number; // Change in PnL (Scenario Impact)
  shockGross: number;
  shockUtilization: number;
  
  isBreached: boolean;
  isMarginCall: boolean; // Mock metric

  children?: ShockResultNode[];
}

// --- FLOW (Execution Analytics) Types ---

export interface FlowFill {
    id: string;
    orderId: string;
    strategyId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    size: number;
    notional: number;
    slippageBps: number; // vs arrival mid
    fee: number;
    timestamp: number;
    liquidity: 'MAKER' | 'TAKER';
    venue: string;
}

export interface FlowOrder {
    id: string;
    strategyId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number; // 0 for Market
    size: number;
    status: 'FILLED' | 'CANCELED' | 'REJECTED' | 'NEW' | 'PARTIAL';
    timestamp: number;
    latencyMs: number;
    
    // OMS Specific
    type?: 'LIMIT' | 'MARKET';
    tif?: 'GTC' | 'IOC' | 'FOK';
    traderId?: string;
    venue?: string;
    filledSize?: number;
    avgFillPrice?: number;
}

export interface FlowAggregatedRow {
    key: string; // Grouping Key
    label: string;
    
    // Volume & Counts
    totalNotional: number;
    totalVolume: number;
    fillCount: number;
    orderCount: number;
    
    // Directional
    netNotional: number; // +Buy, -Sell
    buyNotional: number;
    sellNotional: number;

    // Execution Quality
    avgSlippageBps: number;
    medianSlippageBps: number;
    fillRatio: number; // Fills / Orders (Simple view)
    takerPct: number; // % of volume taken
    rejectRate: number; // % of orders rejected
    
    // Timing
    avgLatencyMs: number;
}
