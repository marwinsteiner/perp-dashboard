
import { WebSocketMessage, SpotTicker, FuturesMark, OrderBook, Trade, Kline, FuturesSymbolInfo } from '../types';

type SpotCallback = (data: SpotTicker) => void;
type FuturesCallback = (data: FuturesMark) => void;
type DepthCallback = (data: { type: 'SPOT' | 'FUTURES', bids: [string, string][], asks: [string, string][] }) => void;
type TradeCallback = (data: Trade) => void;
type MultiTickerCallback = (data: { symbol: string, price: number }) => void;

class BinanceService {
  private spotWs: WebSocket | null = null;
  private futuresWs: WebSocket | null = null;
  
  // Dedicated connections for the focused symbol
  private focusWs: WebSocket | null = null;
  // Connection for curve data (Futures)
  private curveWs: WebSocket | null = null;
  // Connection for curve data (Spot)
  private spotCurveWs: WebSocket | null = null;
  
  private spotListeners: SpotCallback[] = [];
  private futuresListeners: FuturesCallback[] = [];
  private symbols: string[] = [];

  constructor(symbols: string[]) {
    this.symbols = symbols;
  }

  public connect() {
    this.connectSpot();
    this.connectFutures();
  }

  public disconnect() {
    if (this.spotWs) {
      this.spotWs.close();
      this.spotWs = null;
    }
    if (this.futuresWs) {
      this.futuresWs.close();
      this.futuresWs = null;
    }
    this.unsubscribeFocus();
    this.unsubscribeCurve();
  }

  public onSpotUpdate(callback: SpotCallback) {
    this.spotListeners.push(callback);
    return () => {
      this.spotListeners = this.spotListeners.filter(cb => cb !== callback);
    };
  }

  public onFuturesUpdate(callback: FuturesCallback) {
    this.futuresListeners.push(callback);
    return () => {
      this.futuresListeners = this.futuresListeners.filter(cb => cb !== callback);
    };
  }

  // --- Main Feed (Watchlist) ---

  private connectSpot() {
    if (this.symbols.length === 0) return; // Guard against empty symbols list (e.g. FocusService)
    const streams = this.symbols.map(s => `${s.toLowerCase()}@bookTicker`).join('/');
    const url = `wss://stream.binance.com:9443/ws/${streams}`;

    this.spotWs = new WebSocket(url);

    this.spotWs.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        if (msg.b && msg.a && msg.s) {
          const ticker: SpotTicker = {
            symbol: msg.s,
            bidPrice: parseFloat(msg.b),
            bidQty: parseFloat(msg.B || '0'),
            askPrice: parseFloat(msg.a),
            askQty: parseFloat(msg.A || '0'),
          };
          this.spotListeners.forEach(cb => cb(ticker));
        }
      } catch (e) {
        console.error('Spot WS Parse Error', e);
      }
    };

    this.spotWs.onclose = () => {
      // Only reconnect if supposed to be connected
      if (this.spotListeners.length > 0 && this.symbols.length > 0) {
        setTimeout(() => this.connectSpot(), 3000);
      }
    };
  }

  private connectFutures() {
    if (this.symbols.length === 0) return;
    const streams = this.symbols.map(s => `${s.toLowerCase()}@markPrice@1s`).join('/');
    const url = `wss://fstream.binance.com/ws/${streams}`;

    this.futuresWs = new WebSocket(url);

    this.futuresWs.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        if (msg.e === 'markPriceUpdate' && msg.s && msg.p && msg.r) {
          const mark: FuturesMark = {
            symbol: msg.s,
            markPrice: parseFloat(msg.p),
            fundingRate: parseFloat(msg.r),
            nextFundingTime: msg.T || 0,
          };
          this.futuresListeners.forEach(cb => cb(mark));
        }
      } catch (e) {
        console.error('Futures WS Parse Error', e);
      }
    };

    this.futuresWs.onclose = () => {
       if (this.futuresListeners.length > 0 && this.symbols.length > 0) {
          setTimeout(() => this.connectFutures(), 3000);
       }
    };
  }

  // --- Focus Drill-Down (Single Symbol) ---

  public subscribeFocus(
    symbol: string, 
    onSpotDepth: DepthCallback, 
    onFuturesDepth: DepthCallback, 
    onFuturesTrade: TradeCallback
  ) {
    this.unsubscribeFocus(); // Ensure clean slate

    const s = symbol.toLowerCase();
    
    // SPOT Focus Connection
    const spotUrl = `wss://stream.binance.com:9443/ws/${s}@depth10@100ms`;
    const spotWs = new WebSocket(spotUrl);
    spotWs.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.bids || msg.asks) {
        onSpotDepth({ type: 'SPOT', bids: msg.bids, asks: msg.asks });
      }
    };

    // FUTURES Focus Connection
    const futuresUrl = `wss://fstream.binance.com/ws/${s}@depth10@100ms/${s}@aggTrade`;
    const futuresWs = new WebSocket(futuresUrl);
    futuresWs.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      
      // Handle Trade
      if (msg.e === 'aggTrade') {
        // Fix: Added missing venueTime property for Trade interface
        const trade: Trade = {
          id: msg.a,
          symbol: msg.s || symbol,
          venue: 'BINANCE_USDT_M',
          price: parseFloat(msg.p),
          qty: parseFloat(msg.q),
          time: msg.T,
          venueTime: msg.T,
          isBuyerMaker: msg.m,
          type: 'TRADE'
        };
        onFuturesTrade(trade);
        return;
      }
      
      // Handle Depth
      // Futures depth event is 'depthUpdate' with 'b' and 'a' arrays
      const bids = msg.bids || (msg.e === 'depthUpdate' && msg.b) || [];
      const asks = msg.asks || (msg.e === 'depthUpdate' && msg.a) || [];

      if (bids.length > 0 || asks.length > 0) {
         onFuturesDepth({ type: 'FUTURES', bids, asks });
      }
    };

    // Store cleanup function
    this.focusWs = { close: () => { spotWs.close(); futuresWs.close(); } } as any;
  }

  public unsubscribeFocus() {
    if (this.focusWs) {
      this.focusWs.close();
      this.focusWs = null;
    }
  }

  // --- Futures Curve Logic ---

  public async getFuturesExchangeInfo(): Promise<FuturesSymbolInfo[]> {
    try {
      const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
      const data = await res.json();
      return data.symbols.map((s: any) => ({
        symbol: s.symbol,
        pair: s.pair,
        contractType: s.contractType,
        deliveryDate: s.deliveryDate,
        onboardDate: s.onboardDate,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset
      }));
    } catch (e) {
      console.error("Failed to fetch futures exchange info", e);
      return [];
    }
  }

  // Fetch COIN-M Exchange Info (for dated futures on alts)
  public async getCoinMFuturesExchangeInfo(): Promise<FuturesSymbolInfo[]> {
    try {
      const res = await fetch('https://dapi.binance.com/dapi/v1/exchangeInfo');
      const data = await res.json();
      return data.symbols.map((s: any) => ({
        symbol: s.symbol,
        pair: s.pair,
        contractType: s.contractType,
        deliveryDate: s.deliveryDate,
        onboardDate: s.onboardDate,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset
      }));
    } catch (e) {
      console.error("Failed to fetch Coin-M exchange info", e);
      return [];
    }
  }
  
  // Fetch all ticker prices to seed state (Fix for illiquid dated futures)
  public async getFuturesTickers(): Promise<Record<string, number>> {
      try {
          const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/bookTicker');
          const data = await res.json();
          const prices: Record<string, number> = {};
          
          if (Array.isArray(data)) {
            data.forEach((t: any) => {
                const b = parseFloat(t.bidPrice);
                const a = parseFloat(t.askPrice);
                if (b > 0 && a > 0) {
                    prices[t.symbol] = (b + a) / 2;
                }
            });
          }
          return prices;
      } catch (e) {
          console.error("Failed to fetch all futures tickers", e);
          return {};
      }
  }

  // Fetch COIN-M Tickers
  public async getCoinMFuturesTickers(): Promise<Record<string, number>> {
    try {
        const res = await fetch('https://dapi.binance.com/dapi/v1/ticker/bookTicker');
        const data = await res.json();
        const prices: Record<string, number> = {};
        
        if (Array.isArray(data)) {
          data.forEach((t: any) => {
              const b = parseFloat(t.bidPrice);
              const a = parseFloat(t.askPrice);
              if (b > 0 && a > 0) {
                  prices[t.symbol] = (b + a) / 2;
              }
          });
        }
        return prices;
    } catch (e) {
        console.error("Failed to fetch Coin-M tickers", e);
        return {};
    }
}
  
  // Fetch single spot price via REST for initial population
  public async getSpotPrice(symbol: string): Promise<number> {
      try {
          const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
          const data = await res.json();
          return parseFloat(data.price);
      } catch (e) {
          console.error("Failed to fetch spot price", e);
          return 0;
      }
  }

  public subscribeCurveTickers(symbols: string[], callback: MultiTickerCallback) {
    if (this.curveWs) this.curveWs.close();

    const streams = symbols.map(s => `${s.toLowerCase()}@bookTicker`).join('/');
    const url = `wss://fstream.binance.com/ws/${streams}`;

    this.curveWs = new WebSocket(url);
    this.curveWs.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.s && msg.b && msg.a) {
           const mid = (parseFloat(msg.b) + parseFloat(msg.a)) / 2;
           callback({ symbol: msg.s, price: mid });
        }
      } catch (err) {
        console.error(err);
      }
    };
  }
  
  public subscribeSpotTicker(symbol: string, callback: (price: number) => void) {
      if (this.spotCurveWs) this.spotCurveWs.close();
      
      const url = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@bookTicker`;
      this.spotCurveWs = new WebSocket(url);
      this.spotCurveWs.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);
            if (msg.b && msg.a) {
                const mid = (parseFloat(msg.b) + parseFloat(msg.a)) / 2;
                callback(mid);
            }
        } catch (err) {
            console.error(err);
        }
      };
  }

  public unsubscribeCurve() {
    if (this.curveWs) {
      this.curveWs.close();
      this.curveWs = null;
    }
    if (this.spotCurveWs) {
        this.spotCurveWs.close();
        this.spotCurveWs = null;
    }
  }

  // --- REST API for History (Metrics) ---
  
  public async getKlines(symbol: string, type: 'SPOT' | 'FUTURES', interval: '1m' | '5m' | '15m', limit: number = 100): Promise<Kline[]> {
    const baseUrl = type === 'SPOT' ? 'https://api.binance.com/api/v3/klines' : 'https://fapi.binance.com/fapi/v1/klines';
    const response = await fetch(`${baseUrl}?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    const data = await response.json();
    return data.map((k: any) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6]
    }));
  }

  public async getFundingRateHistory(symbol: string, limit: number = 50): Promise<{fundingTime: number, fundingRate: number}[]> {
    const response = await fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=${limit}`);
    const data = await response.json();
    return data.map((d: any) => ({
        fundingTime: d.fundingTime,
        fundingRate: parseFloat(d.fundingRate)
    }));
  }
}

export default BinanceService;
