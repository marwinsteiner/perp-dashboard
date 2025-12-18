import { useEffect, useState, useRef } from 'react';
import BinanceService from '../services/binanceService';
import { CombinedMarketData, SpotTicker, FuturesMark } from '../types';

const SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'LINKUSDT',
  'DOTUSDT',
  'MATICUSDT',
  'LTCUSDT',
  'ATOMUSDT',
  'NEARUSDT',
  'APTUSDT',
  'SUIUSDT'
];

export const useMarketData = (): CombinedMarketData[] => {
  const [data, setData] = useState<Record<string, CombinedMarketData>>({});
  const serviceRef = useRef<BinanceService | null>(null);

  useEffect(() => {
    // Initialize initial state structure
    const initialData: Record<string, CombinedMarketData> = {};
    SYMBOLS.forEach(sym => {
      initialData[sym] = { symbol: sym };
    });
    setData(initialData);

    const service = new BinanceService(SYMBOLS);
    serviceRef.current = service;
    service.connect();

    const handleSpot = (ticker: SpotTicker) => {
      setData(prev => ({
        ...prev,
        [ticker.symbol]: {
          ...prev[ticker.symbol],
          spot: ticker
        }
      }));
    };

    const handleFutures = (mark: FuturesMark) => {
      setData(prev => ({
        ...prev,
        [mark.symbol]: {
          ...prev[mark.symbol],
          futures: mark
        }
      }));
    };

    const unsubSpot = service.onSpotUpdate(handleSpot);
    const unsubFutures = service.onFuturesUpdate(handleFutures);

    return () => {
      unsubSpot();
      unsubFutures();
      service.disconnect();
    };
  }, []);

  return Object.values(data); // Return array for easy mapping
};