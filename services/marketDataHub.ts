
import { Venue, Quote, Trade, OrderBook, Bar, FuturesSymbolInfo, OrderBookLevel } from '../types';

type MarketDataListener = (event: any) => void;

class MarketDataHub {
  private static instance: MarketDataHub;
  private connections: Map<string, WebSocket> = new Map();
  private listeners: Map<string, Set<MarketDataListener>> = new Map();

  constructor() {}

  public static getInstance(): MarketDataHub {
    if (!MarketDataHub.instance) {
      MarketDataHub.instance = new MarketDataHub();
    }
    return MarketDataHub.instance;
  }

  // --- Subscriptions ---

  public subscribe(venue: Venue, type: 'QUOTE' | 'TRADE' | 'BAR' | 'BOOK', symbol: string, cb: MarketDataListener) {
    const channelKey = `${venue}:${type}:${symbol}`;
    if (!this.listeners.has(channelKey)) {
      this.listeners.set(channelKey, new Set());
      this.connect(venue, type, symbol);
    }
    this.listeners.get(channelKey)!.add(cb);

    return () => {
      this.listeners.get(channelKey)?.delete(cb);
    };
  }

  private connect(venue: Venue, type: string, symbol: string) {
    const connId = `${venue}:${symbol}:${type}`;
    if (this.connections.has(connId)) return;

    switch (venue) {
      case 'BINANCE': this.connectBinance(symbol, type); break;
      case 'COINBASE': this.connectCoinbase(symbol, type); break;
      case 'KRAKEN': this.connectKraken(symbol, type); break;
      case 'HYPERLIQUID': this.connectHyperliquid(symbol, type); break;
      default: console.warn(`No adapter for ${venue}:${type}`);
    }
  }

  private connectBinance(symbol: string, type: string) {
    const s = symbol.toLowerCase();
    let url = '';
    if (type === 'QUOTE') url = `wss://stream.binance.com:9443/ws/${s}@bookTicker`;
    else if (type === 'TRADE') url = `wss://fstream.binance.com/ws/${s}@aggTrade`;
    else if (type === 'BOOK') url = `wss://fstream.binance.com/ws/${s}@depth20@100ms`;
    else return;

    const ws = new WebSocket(url);
    this.connections.set(`BINANCE:${symbol}:${type}`, ws);

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (type === 'QUOTE' && data.b) {
        this.broadcast('BINANCE', 'QUOTE', symbol, {
          type: 'QUOTE', id: Date.now(), venue: 'BINANCE', symbol, venueTime: Date.now(),
          bidPrice: parseFloat(data.b), bidSize: parseFloat(data.B),
          askPrice: parseFloat(data.a), askSize: parseFloat(data.A)
        });
      } else if (type === 'BOOK') {
        this.broadcast('BINANCE', 'BOOK', symbol, this.normalizeBinanceBook(data));
      } else if (type === 'TRADE' && data.e === 'aggTrade') {
        this.broadcast('BINANCE', 'TRADE', symbol, {
          type: 'TRADE', id: data.a, venue: 'BINANCE', symbol, venueTime: data.T,
          price: parseFloat(data.p), qty: parseFloat(data.q), time: data.T, isBuyerMaker: data.m
        });
      }
    };
  }

  private normalizeBinanceBook(data: any): OrderBook {
    const bids = (data.b || data.bids || []).map((b: any) => ({ price: parseFloat(b[0]), size: parseFloat(b[1]), total: 0 }));
    const asks = (data.a || data.asks || []).map((a: any) => ({ price: parseFloat(a[0]), size: parseFloat(a[1]), total: 0 }));
    let bTotal = 0, aTotal = 0;
    bids.forEach((b: any) => { bTotal += b.size; b.total = bTotal; });
    asks.forEach((a: any) => { aTotal += a.size; a.total = aTotal; });
    return { bids, asks };
  }

  private connectCoinbase(symbol: string, type: string) {
    const cbSymbol = symbol.replace('USDT', '-USD');
    const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
    this.connections.set(`COINBASE:${symbol}:${type}`, ws);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        product_ids: [cbSymbol],
        channels: [type === 'BOOK' ? 'level2' : 'ticker']
      }));
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'snapshot' || data.type === 'l2update') {
          // Simplified L2 logic for demo
          this.broadcast('COINBASE', 'BOOK', symbol, { bids: [], asks: [] });
      } else if (data.type === 'ticker' && data.best_bid) {
        this.broadcast('COINBASE', 'QUOTE', symbol, {
          type: 'QUOTE', id: Date.now(), venue: 'COINBASE', symbol, venueTime: new Date(data.time).getTime(),
          bidPrice: parseFloat(data.best_bid), bidSize: parseFloat(data.best_bid_size),
          askPrice: parseFloat(data.best_ask), askSize: parseFloat(data.best_ask_size)
        });
      }
    };
  }

  private connectHyperliquid(symbol: string, type: string) {
    const hlSymbol = symbol.replace('USDT', '');
    const ws = new WebSocket('wss://api.hyperliquid.xyz/ws');
    this.connections.set(`HYPERLIQUID:${symbol}:${type}`, ws);
    ws.onopen = () => {
      ws.send(JSON.stringify({ method: "subscribe", subscription: { type: "l2Book", coin: hlSymbol } }));
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.channel === 'l2Book' && data.data) {
        const book = data.data;
        const norm: OrderBook = {
          bids: book.levels[0].map((l: any) => ({ price: parseFloat(l.px), size: parseFloat(l.sz), total: 0 })),
          asks: book.levels[1].map((l: any) => ({ price: parseFloat(l.px), size: parseFloat(l.sz), total: 0 }))
        };
        this.broadcast('HYPERLIQUID', 'BOOK', symbol, norm);
      }
    };
  }

  private connectKraken(symbol: string, type: string) { /* Similar to Quote logic but for L2/Trades */ }

  private broadcast(venue: Venue, type: string, symbol: string, event: any) {
    const key = `${venue}:${type}:${symbol}`;
    this.listeners.get(key)?.forEach(cb => cb(event));
  }

  // --- REST Methods ---

  public async getKlines(venue: Venue, symbol: string, interval: string, limit: number = 100): Promise<Bar[]> {
    if (venue === 'BINANCE') {
      const res = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      const data = await res.json();
      return data.map((k: any) => ({
        id: k[0], venue, symbol, venueTime: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]), type: 'BAR'
      }));
    }
    // Fallback or specific implementations for HL/Coinbase
    return [];
  }

  public async getExchangeInfo(venue: Venue): Promise<FuturesSymbolInfo[]> {
    if (venue === 'BINANCE') {
      const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
      const data = await res.json();
      return data.symbols.map((s: any) => ({
        symbol: s.symbol, pair: s.pair, contractType: s.contractType, deliveryDate: s.deliveryDate, onboardDate: s.onboardDate, baseAsset: s.baseAsset, quoteAsset: s.quoteAsset
      }));
    }
    return [];
  }

  public async getSpotPrice(venue: Venue, symbol: string): Promise<number> {
    if (venue === 'BINANCE') {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
      const data = await res.json();
      return parseFloat(data.price);
    }
    return 0;
  }
}

export default MarketDataHub.getInstance();
