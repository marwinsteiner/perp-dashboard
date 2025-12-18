import React, { useEffect, useState, useRef } from 'react';
import BinanceService from '../services/binanceService';
import { FuturesSymbolInfo, CurvePoint } from '../types';

export const useFuturesCurve = (
  baseSymbol: string, // e.g. BTCUSDT (we extract 'BTC')
  serviceRef: React.MutableRefObject<BinanceService | null>
) => {
  const [curveData, setCurveData] = useState<CurvePoint[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State to hold prices
  const pricesRef = useRef<Record<string, number>>({});
  const symbolsRef = useRef<FuturesSymbolInfo[]>([]);
  const spotPriceRef = useRef<number>(0);

  useEffect(() => {
    if (!serviceRef.current || !baseSymbol) return;

    // Extract Base Asset (e.g., BTC from BTCUSDT)
    const baseAsset = baseSymbol.replace('USDT', '');
    
    setLoading(true);
    pricesRef.current = {};
    setCurveData([]);

    // 1. Fetch all Futures Symbols
    const init = async () => {
      // 1.1 Get Initial Spot Price, USDT-M Futures Prices, and Coin-M Futures Prices
      try {
         const [initialSpot, initialFutures, initialCoinM] = await Promise.all([
             serviceRef.current!.getSpotPrice(`${baseAsset}USDT`),
             serviceRef.current!.getFuturesTickers(),
             serviceRef.current!.getCoinMFuturesTickers()
         ]);
         
         if (initialSpot) spotPriceRef.current = initialSpot;
         
         // Merge prices
         pricesRef.current = { ...initialFutures, ...initialCoinM };
      } catch (e) {
          console.warn("Could not fetch initial prices", e);
      }

      // 1.2 Get Exchange Info for both markets
      const [usdtInfos, coinInfos] = await Promise.all([
          serviceRef.current!.getFuturesExchangeInfo(),
          serviceRef.current!.getCoinMFuturesExchangeInfo()
      ]);
      
      // Filter USDT-M (Standard)
      const usdtRelevant = usdtInfos.filter(info => 
        info.quoteAsset === 'USDT' && 
        info.baseAsset === baseAsset
      );

      // Filter Coin-M (Delivery primarily)
      // Coin-M usually pair is e.g. 'SOLUSD', base 'SOL', quote 'USD'.
      const coinRelevant = coinInfos.filter(info => 
        info.baseAsset === baseAsset && 
        info.quoteAsset === 'USD'
      );

      // Find the specific PERP (Prefer USDT-M Perp)
      const perp = usdtRelevant.find(info => info.contractType === 'PERPETUAL');
      
      // Find dated futures from both (Coin-M is usually where the alts have dated futures)
      const datedUsdt = usdtRelevant.filter(info => info.contractType !== 'PERPETUAL');
      const datedCoin = coinRelevant.filter(info => info.contractType !== 'PERPETUAL');

      // Combine: Perp + Dated (USDT) + Dated (Coin-M)
      const finalSymbols = [];
      if (perp) finalSymbols.push(perp);
      finalSymbols.push(...datedUsdt);
      finalSymbols.push(...datedCoin);

      // Sort by delivery date
      finalSymbols.sort((a, b) => a.deliveryDate - b.deliveryDate);
      
      symbolsRef.current = finalSymbols;

      // 2. Subscribe to Prices
      // We only subscribe to USDT-M symbols via WebSocket in this implementation to keep it simple.
      // Coin-M prices will stay static from the initial fetch (usually acceptable for delivery contracts on dashboard load).
      const wsSymbols = finalSymbols.filter(s => s.quoteAsset === 'USDT').map(s => s.symbol);
      
      if (wsSymbols.length > 0) {
        serviceRef.current!.subscribeCurveTickers(wsSymbols, (data) => {
            pricesRef.current[data.symbol] = data.price;
            computeCurve(baseAsset);
        });
      }

      // Subscribe to SPOT ticker (Dedicated)
      serviceRef.current!.subscribeSpotTicker(`${baseAsset}USDT`, (price) => {
        spotPriceRef.current = price;
        computeCurve(baseAsset);
      });
      
      // Run initial compute immediately
      if (spotPriceRef.current > 0) {
          computeCurve(baseAsset);
      }

      setLoading(false);
    };

    const cleanupPromise = init();

    return () => {
        serviceRef.current?.unsubscribeCurve();
    };

  }, [baseSymbol]);

  const computeCurve = (baseAsset: string) => {
    const spot = spotPriceRef.current;
    if (!spot || spot === 0) return;

    const now = Date.now();
    const points: CurvePoint[] = [];

    // Add Spot Point (Reference at 0,0)
    points.push({
        symbol: 'SPOT',
        type: 'SPOT',
        marginType: 'SPOT',
        price: spot,
        daysToExpiry: 0,
        basis: 0,
        basisPercent: 0,
        annualizedBasis: 0
    });

    symbolsRef.current.forEach(info => {
        const price = pricesRef.current[info.symbol];
        // If we don't have a price yet, skip
        if (!price) return;

        let dte = 0;
        let type: 'PERP' | 'FUTURE' = 'FUTURE';

        if (info.contractType === 'PERPETUAL') {
            type = 'PERP';
            dte = 0.5; // Visual offset
        } else {
            const diffMs = info.deliveryDate - now;
            dte = diffMs / (1000 * 60 * 60 * 24);
        }

        if (dte <= 0 && type !== 'PERP') return; // Expired

        const basis = price - spot;
        const basisPercent = (basis / spot) * 100;
        
        // Annualize
        const annualizedBasis = basisPercent * (365 / (dte || 1)); 
        
        const marginType = info.quoteAsset === 'USDT' ? 'USDT' : 'COIN';

        points.push({
            symbol: info.symbol,
            type,
            marginType,
            price,
            expiryDate: info.deliveryDate,
            daysToExpiry: dte,
            basis,
            basisPercent,
            annualizedBasis
        });
    });

    // Sort by DTE
    points.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
    setCurveData(points);
  };

  return { curveData, loading };
};