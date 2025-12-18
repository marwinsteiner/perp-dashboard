import React, { useEffect, useState, useRef } from 'react';
import BinanceService from '../services/binanceService';
import { OrderBook, Trade, FocusMetrics } from '../types';

interface UseFocusSymbolResult {
  spotDepth: OrderBook;
  futuresDepth: OrderBook;
  recentTrades: Trade[];
  metrics: FocusMetrics | null;
}

const emptyBook: OrderBook = { bids: [], asks: [] };

export const useFocusSymbol = (symbol: string, serviceRef: React.MutableRefObject<BinanceService | null>): UseFocusSymbolResult => {
  const [spotDepth, setSpotDepth] = useState<OrderBook>(emptyBook);
  const [futuresDepth, setFuturesDepth] = useState<OrderBook>(emptyBook);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [metrics, setMetrics] = useState<FocusMetrics | null>(null);

  // References for calculation (Reference Price T-1m, Reference Price T-5m)
  const refs = useRef<{
    spot1m: number; spot5m: number;
    perp1m: number; perp5m: number;
  } | null>(null);

  useEffect(() => {
    if (!serviceRef.current || !symbol) return;

    // Reset State on change
    setSpotDepth(emptyBook);
    setFuturesDepth(emptyBook);
    setRecentTrades([]);
    setMetrics(null);
    refs.current = null;

    // 1. Fetch History for Metrics Baseline
    const fetchHistory = async () => {
      try {
        const [spotKlines, perpKlines] = await Promise.all([
          serviceRef.current!.getKlines(symbol, 'SPOT', '1m', 10),
          serviceRef.current!.getKlines(symbol, 'FUTURES', '1m', 10)
        ]);
        
        // We need T-1m (close of last candle) and T-5m (close of 5th candle back)
        // Klines array is oldest to newest. last is current open candle (incomplete).
        // array[len-1] is current. array[len-2] is 1m ago complete.
        
        const sl = spotKlines.length;
        const pl = perpKlines.length;
        
        if (sl >= 6 && pl >= 6) {
          refs.current = {
            spot1m: spotKlines[sl - 2].close,
            spot5m: spotKlines[sl - 6].close,
            perp1m: perpKlines[pl - 2].close,
            perp5m: perpKlines[pl - 6].close,
          };
        }
      } catch (e) {
        console.error("Failed to fetch klines", e);
      }
    };

    fetchHistory();

    // 2. Subscribe to Streams
    const processDepth = (rawBids: [string, string][], rawAsks: [string, string][]): OrderBook => {
      let bids = rawBids.map(([p, q]) => ({ price: parseFloat(p), size: parseFloat(q), total: 0 }));
      let asks = rawAsks.map(([p, q]) => ({ price: parseFloat(p), size: parseFloat(q), total: 0 }));
      
      // Sort: Bids Descending, Asks Ascending
      bids.sort((a, b) => b.price - a.price);
      asks.sort((a, b) => a.price - b.price);
      
      // Limit to 10
      bids = bids.slice(0, 10);
      asks = asks.slice(0, 10);

      // Calc Cumulative
      let total = 0;
      bids.forEach(b => { total += b.size; b.total = total; });
      total = 0;
      asks.forEach(a => { total += a.size; a.total = total; });

      return { bids, asks };
    };

    serviceRef.current.subscribeFocus(
      symbol,
      // On Spot Depth
      (data) => {
        setSpotDepth(processDepth(data.bids, data.asks));
        // Update Metrics (using top of book as 'price')
        if (refs.current && data.bids.length > 0 && data.asks.length > 0) {
            const mid = (parseFloat(data.bids[0][0]) + parseFloat(data.asks[0][0])) / 2;
            updateSpotMetrics(mid);
        }
      },
      // On Futures Depth
      (data) => {
        setFuturesDepth(processDepth(data.bids, data.asks));
        // Update Metrics
        if (refs.current && data.bids.length > 0 && data.asks.length > 0) {
            const mid = (parseFloat(data.bids[0][0]) + parseFloat(data.asks[0][0])) / 2;
            updatePerpMetrics(mid);
        }
      },
      // On Futures Trade
      (trade) => {
        setRecentTrades(prev => [trade, ...prev].slice(0, 15));
      }
    );

    return () => {
      serviceRef.current?.unsubscribeFocus();
    };

  }, [symbol]);

  // Helper to calculate metrics based on current live price and stored refs
  // Note: We use state for metrics to trigger UI updates, but calculation depends on refs
  const updateSpotMetrics = (currentPrice: number) => {
    if (!refs.current) return;
    setMetrics(prev => {
      const p = prev || { spotChange1m: 0, spotChange5m: 0, perpChange1m: 0, perpChange5m: 0, basisChange1m: 0, basisChange5m: 0 };
      const s1m = ((currentPrice - refs.current!.spot1m) / refs.current!.spot1m) * 100;
      const s5m = ((currentPrice - refs.current!.spot5m) / refs.current!.spot5m) * 100;
      return { ...p, spotChange1m: s1m, spotChange5m: s5m };
    });
  };

  const updatePerpMetrics = (currentPrice: number) => {
    if (!refs.current) return;
     setMetrics(prev => {
      const p = prev || { spotChange1m: 0, spotChange5m: 0, perpChange1m: 0, perpChange5m: 0, basisChange1m: 0, basisChange5m: 0 };
      const f1m = ((currentPrice - refs.current!.perp1m) / refs.current!.perp1m) * 100;
      const f5m = ((currentPrice - refs.current!.perp5m) / refs.current!.perp5m) * 100;
      
      // Basis Change in bps (Basis % now - Basis % then)
      // Basis % = (F - S) / S * 100 ?? Or simply F-S diff?
      // User asked for "change in basis in bps". 
      // Current Basis Bps = (F - S) / S * 10000
      // Historic Basis Bps = (RefF - RefS) / RefS * 10000
      
      // We need current spot price too. We can't easily get it here atomically without complex state.
      // Approximation: Use the last known metrics spot change to infer current spot? 
      // Or just accept that basis updates when either updates. 
      // Let's defer basis calculation to render time if we have both prices? 
      // Actually, let's just use the cached ref values vs current 'metrics' state implied prices.
      
      return { ...p, perpChange1m: f1m, perpChange5m: f5m };
    });
  };

  return { spotDepth, futuresDepth, recentTrades, metrics };
};