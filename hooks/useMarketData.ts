
import { useEffect, useState, useRef } from 'react';
import marketDataHub from '../services/marketDataHub';
import { CombinedMarketData, Quote, Venue } from '../types';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];

export const useMarketData = (activeVenue: Venue): CombinedMarketData[] => {
  const [data, setData] = useState<Record<string, CombinedMarketData>>(() => {
    const initial: Record<string, CombinedMarketData> = {};
    SYMBOLS.forEach(sym => {
      initial[sym] = { symbol: sym, venue: activeVenue };
    });
    return initial;
  });

  const activeVenueRef = useRef(activeVenue);
  activeVenueRef.current = activeVenue;

  useEffect(() => {
    // Reset prices for new venue to avoid showing stale cross-exchange data
    setData(prev => {
        const next: Record<string, CombinedMarketData> = {};
        SYMBOLS.forEach(sym => {
            next[sym] = { symbol: sym, venue: activeVenue };
        });
        return next;
    });

    const unsubs = SYMBOLS.map(sym => {
      return marketDataHub.subscribe(activeVenue, 'QUOTE', sym, (quote: Quote) => {
        // Double check we are still on the same venue to prevent race conditions
        if (activeVenueRef.current !== quote.venue) return;

        setData(prev => ({
          ...prev,
          [sym]: {
            ...prev[sym],
            venue: activeVenue,
            quote
          }
        }));
      });
    });

    return () => unsubs.forEach(unsub => unsub());
  }, [activeVenue]);

  return Object.values(data);
};
