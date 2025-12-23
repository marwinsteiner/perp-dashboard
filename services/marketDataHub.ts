
import { Venue, Quote, Trade, NormalizedEvent, Bar, FundingEvent } from '../types';

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

  public subscribe(venue: Venue, type: 'QUOTE' | 'TRADE' | 'BAR' | 'FUNDING', symbol: string, cb: MarketDataListener) {
    const channelKey = `${venue}:${type}:${symbol}`;
    if (!this.listeners.has(channelKey)) {
      this.listeners.set(channelKey, new Set());
      this.connect(venue, type, symbol);
    }
    this.listeners.get(channelKey)!.add(cb);

    return () => {
      this.listeners.get(channelKey)?.delete(cb);
      // Optional: Logic to close WebSocket if no listeners remain for a symbol/venue
    };
  }

  private connect(venue: Venue, type: string, symbol: string) {
    const connId = `${venue}:${symbol}:${type}`;
    if (this.connections.has(connId)) return;

    switch (venue) {
      case 'BINANCE':
        this.connectBinance(symbol, type);
        break;
      case 'COINBASE':
        this.connectCoinbase(symbol, type);
        break;
      case 'KRAKEN':
        this.connectKraken(symbol, type);
        break;
      case 'HYPERLIQUID':
        this.connectHyperliquid(symbol, type);
        break;
      case 'BITFINEX':
        this.connectBitfinex(symbol, type);
        break;
      case 'BITSTAMP':
        this.connectBitstamp(symbol, type);
        break;
      default:
        console.warn(`No WebSocket adapter implemented for ${venue}`);
    }
  }

  private connectBinance(symbol: string, type: string) {
    const s = symbol.toLowerCase();
    const endpoint = type === 'QUOTE' ? `${s}@bookTicker` : `${s}@aggTrade`;
    const url = `wss://stream.binance.com:9443/ws/${endpoint}`;
    
    const ws = new WebSocket(url);
    this.connections.set(`BINANCE:${symbol}:${type}`, ws);

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (type === 'QUOTE' && data.b) {
        const quote: Quote = {
          type: 'QUOTE', id: Date.now(), venue: 'BINANCE', symbol, venueTime: Date.now(),
          bidPrice: parseFloat(data.b), bidSize: parseFloat(data.B),
          askPrice: parseFloat(data.a), askSize: parseFloat(data.A)
        };
        this.broadcast('BINANCE', 'QUOTE', symbol, quote);
      }
    };
  }

  private connectCoinbase(symbol: string, type: string) {
    // Coinbase uses BTC-USD format
    const cbSymbol = symbol.replace('USDT', '-USD').replace('BTC', 'BTC');
    const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
    this.connections.set(`COINBASE:${symbol}:${type}`, ws);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        product_ids: [cbSymbol],
        channels: ['ticker']
      }));
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'ticker' && data.best_bid) {
        const quote: Quote = {
          type: 'QUOTE', id: Date.now(), venue: 'COINBASE', symbol, venueTime: new Date(data.time).getTime(),
          bidPrice: parseFloat(data.best_bid), bidSize: parseFloat(data.best_bid_size || '0'),
          askPrice: parseFloat(data.best_ask), askSize: parseFloat(data.best_ask_size || '0')
        };
        this.broadcast('COINBASE', 'QUOTE', symbol, quote);
      }
    };
  }

  private connectKraken(symbol: string, type: string) {
    // Kraken uses XBT/USD for BTC
    const krakenSymbol = symbol.replace('USDT', '/USD').replace('BTC', 'XBT');
    const ws = new WebSocket('wss://ws.kraken.com');
    this.connections.set(`KRAKEN:${symbol}:${type}`, ws);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        event: 'subscribe',
        pair: [krakenSymbol],
        subscription: { name: 'ticker' }
      }));
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (Array.isArray(data) && data[2] === 'ticker') {
        const t = data[1];
        const quote: Quote = {
          type: 'QUOTE', id: Date.now(), venue: 'KRAKEN', symbol, venueTime: Date.now(),
          bidPrice: parseFloat(t.b[0]), bidSize: parseFloat(t.b[2]),
          askPrice: parseFloat(t.a[0]), askSize: parseFloat(t.a[2])
        };
        this.broadcast('KRAKEN', 'QUOTE', symbol, quote);
      }
    };
  }

  private connectHyperliquid(symbol: string, type: string) {
    // Hyperliquid uses "BTC" instead of "BTCUSDT"
    const hlSymbol = symbol.replace('USDT', '');
    const ws = new WebSocket('wss://api.hyperliquid.xyz/ws');
    this.connections.set(`HYPERLIQUID:${symbol}:${type}`, ws);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: { type: "l2Book", coin: hlSymbol }
      }));
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.channel === 'l2Book' && data.data) {
        const book = data.data;
        const quote: Quote = {
          type: 'QUOTE', id: Date.now(), venue: 'HYPERLIQUID', symbol, venueTime: book.time,
          bidPrice: parseFloat(book.levels[0][0].px), bidSize: parseFloat(book.levels[0][0].sz),
          askPrice: parseFloat(book.levels[1][0].px), askSize: parseFloat(book.levels[1][0].sz)
        };
        this.broadcast('HYPERLIQUID', 'QUOTE', symbol, quote);
      }
    };
  }

  private connectBitfinex(symbol: string, type: string) {
    // Bitfinex format: tBTCUSD
    const bfxSymbol = `t${symbol.replace('USDT', 'USD')}`;
    const ws = new WebSocket('wss://api-pub.bitfinex.com/ws/2');
    this.connections.set(`BITFINEX:${symbol}:${type}`, ws);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        event: 'subscribe',
        channel: 'ticker',
        symbol: bfxSymbol
      }));
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (Array.isArray(data) && Array.isArray(data[1])) {
        const t = data[1]; // [BID, BID_SIZE, ASK, ASK_SIZE, ...]
        const quote: Quote = {
          type: 'QUOTE', id: Date.now(), venue: 'BITFINEX', symbol, venueTime: Date.now(),
          bidPrice: t[0], bidSize: t[1],
          askPrice: t[2], askSize: t[3]
        };
        this.broadcast('BITFINEX', 'QUOTE', symbol, quote);
      }
    };
  }

  private connectBitstamp(symbol: string, type: string) {
    const stampSymbol = symbol.toLowerCase().replace('usdt', 'usd');
    const ws = new WebSocket('wss://ws.bitstamp.net');
    this.connections.set(`BITSTAMP:${symbol}:${type}`, ws);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        event: 'bts:subscribe',
        data: { channel: `live_trades_${stampSymbol}` }
      }));
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.event === 'trade') {
        const t = data.data;
        // Bitstamp public trades don't have a ticker, so we treat last trade as quote mid
        const quote: Quote = {
          type: 'QUOTE', id: t.id, venue: 'BITSTAMP', symbol, venueTime: parseInt(t.timestamp) * 1000,
          bidPrice: parseFloat(t.price) * 0.9999, bidSize: 1,
          askPrice: parseFloat(t.price) * 1.0001, askSize: 1
        };
        this.broadcast('BITSTAMP', 'QUOTE', symbol, quote);
      }
    };
  }

  private broadcast(venue: Venue, type: string, symbol: string, event: any) {
    const key = `${venue}:${type}:${symbol}`;
    this.listeners.get(key)?.forEach(cb => cb(event));
  }
}

export default MarketDataHub.getInstance();
