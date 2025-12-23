
import { useEffect, useState } from 'react';
import marketDataHub from '../services/marketDataHub';
import { OrderBook, Trade, FocusMetrics, Venue } from '../types';

interface UseFocusSymbolResult {
  book: OrderBook;
  recentTrades: Trade[];
  metrics: FocusMetrics | null;
}

const emptyBook: OrderBook = { bids: [], asks: [] };

export const useFocusSymbol = (symbol: string, venue: Venue): UseFocusSymbolResult => {
  const [book, setBook] = useState<OrderBook>(emptyBook);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [metrics, setMetrics] = useState<FocusMetrics | null>(null);

  useEffect(() => {
    setBook(emptyBook);
    setRecentTrades([]);
    
    // Subscribe to L2 Book
    const unsubBook = marketDataHub.subscribe(venue, 'BOOK', symbol, (newBook: OrderBook) => {
        setBook(newBook);
    });

    // Subscribe to Trades
    const unsubTrades = marketDataHub.subscribe(venue, 'TRADE', symbol, (trade: Trade) => {
        setRecentTrades(prev => [trade, ...prev].slice(0, 20));
    });

    // Fetch baseline metrics (one-off klines)
    marketDataHub.getKlines(venue, symbol, '1m', 10).then(bars => {
        if (bars.length >= 6) {
            const last = bars[bars.length - 1];
            const prev1m = bars[bars.length - 2];
            const prev5m = bars[bars.length - 6];
            setMetrics({
                spotChange1m: ((last.close - prev1m.close) / prev1m.close) * 100,
                spotChange5m: ((last.close - prev5m.close) / prev5m.close) * 100,
                // Fix: Removed duplicated basisChange1m and basisChange5m properties below
                perpChange1m: 0, 
                perpChange5m: 0, 
                basisChange1m: 0, 
                basisChange5m: 0,
                change1m: 0, 
                change5m: 0
            } as any);
        }
    });

    return () => {
      unsubBook();
      unsubTrades();
    };
  }, [symbol, venue]);

  return { book, recentTrades, metrics };
};
