
export type Venue = 
  | 'BINANCE' 
  | 'BINANCE_SPOT'
  | 'BINANCE_USDT_M'
  | 'BINANCE_COIN_M'
  | 'BINANCE_PERP'
  | 'BINANCE_FUTURE'
  | 'SPOT'
  | 'PERP_USDT'
  | 'FUTURE_USDT'
  | 'BITFINEX' 
  | 'BITSTAMP' 
  | 'COINBASE' 
  | 'GEMINI' 
  | 'KRAKEN' 
  | 'HYPERLIQUID' 
  | 'SIM_EXCHANGE';

export type Side = 'LONG' | 'SHORT' | 'FLAT' | 'BUY' | 'SELL';
export type MarginType = 'CROSS' | 'ISOLATED' | 'SPOT';

export type RoutingMode = 'BEST' | 'DIRECT';
export type ExecutionAlgo = 'VENUE_DEFAULT' | 'TWAP' | 'VWAP' | 'PASSIVE_REBATE' | 'SMART_SWEEP';

// --- Normalized Market Data Models ---

export interface NormalizedEvent {
  id: string | number;
  venue: Venue;
  symbol: string;
  venueTime: number;
  receivedTime?: number;
}

export interface Trade extends NormalizedEvent {
  type: 'TRADE';
  price: number;
  qty: number;
  time: number;
  isBuyerMaker: boolean;
  orderId?: string;
}

export interface Quote extends NormalizedEvent {
  type: 'QUOTE';
  bidPrice: number;
  bidSize: number;
  askPrice: number;
  askSize: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface Bar extends NormalizedEvent {
  type: 'BAR';
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FundingEvent extends NormalizedEvent {
  type: 'FUNDING';
  rate: number;
  nextFundingTime: number;
}

export type OrderStatus = 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
export type OrderType = 'MARKET' | 'LIMIT';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK';

export interface Order {
  id: string;
  symbol: string;
  venue: Venue;
  side: Side;
  qty: number;
  price?: number;
  arrivalPrice?: number;
  type: OrderType;
  tif?: TimeInForce;
  status: OrderStatus;
  filledQty: number;
  avgFillPrice: number;
  timestamp: number;
  firstFillTime?: number;
  fullFillTime?: number;
  strategyId?: string;
  traderId?: string;
  // Multi-Venue Routing Fields - Made optional to fix assignability in simulation services
  routingMode?: RoutingMode;
  executionAlgo?: ExecutionAlgo;
  parentOrderId?: string;
}

export interface StrategyInstance { 
  id: string; 
  name: string; 
  family: string; 
  desk: string; 
  owner: string; 
  venues: Venue[]; 
  instruments: string[]; 
  state: StrategyState; 
  rejectRate: number; 
  avgSlippageBps: number; 
  medianTimeToFillMs: number; 
  lastTickAgeMs: number; 
  pnlDay: number; 
  pnlMtd: number; 
  hitRate: number; 
  avgTradeSizeUsd: number; 
  sharpeRatio: number; 
  profitFactor: number; 
  riskFlags: string[]; 
  grossNotionalUsd?: number; 
  netNotionalUsd?: number; 
}

export type StrategyState = 'RUNNING' | 'PAUSED' | 'DRAINING' | 'ERROR' | 'BACKTESTING';

export interface AuditEntry {
  timestamp: number;
  source: string;
  user?: string;
  type: 'COMMAND' | 'TRADE' | 'RISK' | 'SYSTEM' | 'UI' | 'RESEARCH';
  message: string;
  payload?: any;
}

export type ViewType = 'SCREENER' | 'PORTFOLIO' | 'FOCUS' | 'CHART' | 'CURVE' | 'MARS' | 'STRAT' | 'HELP' | 'CORE' | 'ACCT' | 'TICKET' | 'OMS' | 'BLOTTER' | 'SHOCK' | 'FLOW';

export interface WindowState {
  id: string;
  type: ViewType;
  title: string;
  symbol?: string;
  venue: Venue; // Track active venue per window
  isFloating: boolean;
  isMinimized: boolean;
  zIndex: number;
  x: number; y: number; w: number; h: number;
}

export interface ScreenConfig {
  name: string;
  timestamp: number;
  windows: WindowState[];
  activeTabId: string;
}

export interface Kline { openTime: number; open: number; high: number; low: number; close: number; volume: number; closeTime: number; }

export interface CombinedMarketData {
  symbol: string;
  venue: Venue;
  quote?: Quote;
  markPrice?: number;
  fundingRate?: number;
}

export interface FocusMetrics {
  change1m: number;
  change5m: number;
  basisChange1m: number;
  basisChange5m: number;
  spotChange1m: number;
  spotChange5m: number;
  perpChange1m: number;
  perpChange5m: number;
}

export interface CurvePoint {
  symbol: string;
  venue: Venue;
  type: 'SPOT' | 'PERP' | 'FUTURE';
  marginType: 'SPOT' | 'USDT' | 'COIN';
  price: number;
  daysToExpiry: number;
  basis: number;
  basisPercent: number;
  annualizedBasis: number;
  expiryDate?: number;
}

export interface Position {
  id: string;
  baseAsset: string;
  symbol: string;
  venue: Venue;
  side: 'LONG' | 'SHORT';
  quantity: number;
  avgEntryPrice: number;
  timestamp: number;
  strategyId?: string;
  traderId?: string;
}

export interface LivePosition extends Position {
  markPrice: number;
  notionalBase: number;
  notionalUsd: number;
  unrealizedPnl: number;
  pnlPercent: number;
  marginType?: MarginType;
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
  dayPnl: number;
  netDeltaUsd: number;
  longExposure: number;
  shortExposure: number;
  leverage: number;
}

export interface CarryMetric {
  baseAsset: string;
  venue: Venue;
  spotPrice: number;
  perpPrice: number;
  basisBps: number;
  fundingRate: number;
  impliedCarryApr: number;
}

export interface RiskLimit {
  id: string;
  type: 'DESK' | 'STRATEGY' | 'TRADER' | 'SYMBOL' | 'VENUE';
  entityId: string;
  limitNotionalUsd: number;
  isHardBlock: boolean;
}

export interface RiskNode {
  id: string;
  name: string;
  type: string;
  grossExposureUsd: number;
  netExposureUsd: number;
  longExposureUsd: number;
  shortExposureUsd: number;
  limitUsd: number;
  utilization: number;
  isBreached: boolean;
  children?: RiskNode[];
  isBlocked?: boolean;
}

export interface Credential {
  accountId: string;
  venue: Venue;
  apiKey: string;
  secretKey: string;
  permissions: string[];
  env: 'MAINNET' | 'TESTNET';
}

export interface AccountState {
  accountId: string;
  venue: Venue;
  totalWalletBalance: number;
  totalUnrealizedPnl: number;
  totalMarginBalance: number;
  totalMaintenanceMargin: number;
  availableBalance: number;
  positions: LivePosition[];
  lastUpdate: number;
}

export interface WebSocketMessage {
  s?: string; b?: string; B?: string; a?: string; A?: string; e?: string; p?: string; r?: string; T?: number;
}

// --- New Types added to fix missing exports ---

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

export interface FuturesSymbolInfo {
  symbol: string;
  pair: string;
  contractType: string;
  deliveryDate: number;
  onboardDate: number;
  baseAsset: string;
  quoteAsset: string;
}

export interface RiskOverrideLog {
  timestamp: number;
  entityId: string;
  user: string;
  oldLimit: number;
  newLimit: number;
  reason: string;
}

export interface StrategyLog {
  timestamp: number;
  strategyId: string;
  user: string;
  action: string;
  oldState: StrategyState;
  newState: StrategyState;
  reason: string;
}

export interface BacktestConfig {
  id: string;
  strategyId: string;
  symbols: string[];
  startTime: number;
  endTime: number;
  initialCapital: number;
  slippageBps: number;
  latencyMs: number;
  parameters: Record<string, any>;
}

export interface PerformanceMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  totalReturnPct: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  annualizedReturn: number;
  volatility: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  metrics: PerformanceMetrics;
  equityCurve: { timestamp: number; equity: number }[];
  pnlLog: any[];
  executionLog: Trade[];
}

export type Strategy = StrategyInstance;

export interface FeedHealth {
  venue: Venue;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  latencyMs: number;
  messageCount: number;
  errorCount: number;
}
