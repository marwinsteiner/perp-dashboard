
import { useEffect, useState } from 'react';
import marketDataHub from '../services/marketDataHub';
import { CurvePoint, Venue } from '../types';

export const useFuturesCurve = (symbol: string, venue: Venue) => {
  const [curveData, setCurveData] = useState<CurvePoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const baseAsset = symbol.replace('USDT', '');
    setLoading(true);

    const loadCurve = async () => {
        try {
            const [info, spotPrice] = await Promise.all([
                marketDataHub.getExchangeInfo(venue),
                marketDataHub.getSpotPrice(venue, `${baseAsset}USDT`)
            ]);

            const relevant = info.filter(i => i.baseAsset === baseAsset);
            const now = Date.now();

            const points: CurvePoint[] = [];
            // Reference Spot
            points.push({
                symbol: 'SPOT', venue, type: 'SPOT', marginType: 'SPOT',
                price: spotPrice, daysToExpiry: 0, basis: 0, basisPercent: 0, annualizedBasis: 0
            });

            // Mocked future prices for non-active venues or initial load
            relevant.forEach(i => {
                const dte = i.deliveryDate > 0 ? (i.deliveryDate - now) / 86400000 : 0.5;
                if (dte < 0) return;

                const price = spotPrice * (1 + (dte / 365) * 0.05); // Synthetic 5% yield curve
                points.push({
                    symbol: i.symbol, venue, type: i.contractType as any, marginType: 'USDT',
                    price, daysToExpiry: dte, basis: price - spotPrice, basisPercent: ((price-spotPrice)/spotPrice)*100,
                    annualizedBasis: (((price-spotPrice)/spotPrice)*100) * (365 / Math.max(dte, 1))
                });
            });

            setCurveData(points.sort((a,b) => a.daysToExpiry - b.daysToExpiry));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    loadCurve();
  }, [symbol, venue]);

  return { curveData, loading };
};
