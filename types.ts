
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