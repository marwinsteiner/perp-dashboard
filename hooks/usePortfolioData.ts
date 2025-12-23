
import { useEffect, useState, useRef, useMemo } from 'react';
import paperExecutionService from '../services/paperExecutionService';
import accountRegistryService from '../services/accountRegistryService';
import BinanceService from '../services/binanceService';
import { Position, LivePosition, PortfolioGroup, RiskMetrics, CarryMetric } from '../types';

export const usePortfolioData = () => {
    const [groups, setGroups] = useState<PortfolioGroup[]>([]);
    const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
    const [carry, setCarry] = useState<CarryMetric[]>([]);
    const [loading, setLoading] = useState(true);

    const serviceRef = useRef<BinanceService | null>(null);
    // Store latest prices: { Symbol: { mark: number, spot: number, funding: number } }
    const marketRef = useRef<Record<string, { mark?: number, spot?: number, funding?: number }>>({});

    useEffect(() => {
        // 1. Load Positions
        const rawPositions = paperExecutionService.getPositions();
        
        // 2. Identify unique symbols to subscribe
        const symbols = Array.from(new Set(rawPositions.map(p => p.symbol)));
        // Also ensure we have spot symbols for every base asset found
        const baseAssets = Array.from(new Set(rawPositions.map(p => p.baseAsset)));
        baseAssets.forEach(base => {
            if (!symbols.includes(`${base}USDT`)) symbols.push(`${base}USDT`);
        });

        // 3. Connect Binance Service
        const service = new BinanceService(symbols);
        serviceRef.current = service;
        service.connect();

        // 4. Handle Updates
        // Optimization: Debounce updates or just react statefully. 
        // For 'a few times a second' request, we can just update refs and run a loop, or update state on interval.
        // Let's use an interval to aggregate calculations 4 times a second.

        const handleSpot = (data: any) => {
            const sym = data.symbol;
            if (!marketRef.current[sym]) marketRef.current[sym] = {};
            // Mid price for valuation
            marketRef.current[sym].spot = (data.bidPrice + data.askPrice) / 2;
        };

        const handleFutures = (data: any) => {
            const sym = data.symbol;
            if (!marketRef.current[sym]) marketRef.current[sym] = {};
            marketRef.current[sym].mark = data.markPrice;
            marketRef.current[sym].funding = data.fundingRate;
        };

        service.onSpotUpdate(handleSpot);
        service.onFuturesUpdate(handleFutures);

        // 5. Calculation Loop (250ms)
        const interval = setInterval(() => {
            const market = marketRef.current;
            
            // --- CALC POSITIONS & GROUPS ---
            const grouped: Record<string, LivePosition[]> = {};
            
            rawPositions.forEach(pos => {
                const mkt = market[pos.symbol];
                
                // Determine Live Price
                let livePrice = 0;
                let funding = 0;

                if (pos.venue === 'SPOT') {
                    livePrice = mkt?.spot || pos.avgEntryPrice; // Fallback to entry if no data yet
                } else {
                    livePrice = mkt?.mark || pos.avgEntryPrice;
                    funding = mkt?.funding || 0;
                }

                // Calc PnL
                // Long: (Mark - Entry) * Qty
                // Short: (Entry - Mark) * Qty
                const diff = pos.side === 'LONG' ? livePrice - pos.avgEntryPrice : pos.avgEntryPrice - livePrice;
                const unrealizedPnl = diff * pos.quantity;
                const notionalUsd = pos.quantity * livePrice;
                const pnlPercent = (diff / pos.avgEntryPrice) * 100;

                const livePos: LivePosition = {
                    ...pos,
                    markPrice: livePrice,
                    notionalBase: pos.quantity, // Simplified
                    notionalUsd,
                    unrealizedPnl,
                    pnlPercent
                };

                if (!grouped[pos.baseAsset]) grouped[pos.baseAsset] = [];
                grouped[pos.baseAsset].push(livePos);
            });

            // Aggregate Groups
            const finalGroups: PortfolioGroup[] = Object.keys(grouped).map(base => {
                const positions = grouped[base];
                const netDeltaBase = positions.reduce((acc, p) => acc + (p.side === 'LONG' ? p.quantity : -p.quantity), 0);
                // Approx Net Delta USD is complicated by diff prices, but roughly:
                const netDeltaUsd = positions.reduce((acc, p) => acc + (p.side === 'LONG' ? p.notionalUsd : -p.notionalUsd), 0);
                const totalPnl = positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);

                return {
                    baseAsset: base,
                    positions,
                    netDeltaBase,
                    netDeltaUsd,
                    totalPnl
                };
            });

            // --- CALC RISK METRICS ---
            const flat = finalGroups.flatMap(g => g.positions);
            const totalPnl = flat.reduce((acc, p) => acc + p.unrealizedPnl, 0);
            const longExposure = flat.filter(p => p.side === 'LONG').reduce((acc, p) => acc + p.notionalUsd, 0);
            const shortExposure = flat.filter(p => p.side === 'SHORT').reduce((acc, p) => acc + p.notionalUsd, 0);
            const netDeltaUsd = longExposure - shortExposure; // Simple net
            
            // Aggregated Wallet Balance from Account Registry
            const accountStates = accountRegistryService.getAllStates();
            const totalWalletBalance = accountStates.reduce((sum, acc) => sum + acc.totalWalletBalance, 0);
            
            // Total Equity = Wallet Balance + Unrealized PnL
            const totalEquity = totalWalletBalance + totalPnl;
            
            // Leverage = Gross Notional / Total Equity
            // Handle divide by zero / negative equity edge cases gracefully
            const leverage = totalEquity > 0 ? (longExposure + shortExposure) / totalEquity : 0;

            setGroups(finalGroups);
            setMetrics({
                totalEquity,
                totalPnl,
                dayPnl: totalPnl * 0.8, // Mock intraday change logic
                netDeltaUsd,
                longExposure,
                shortExposure,
                leverage
            });

            // --- CALC CARRY ---
            const carryData: CarryMetric[] = baseAssets.map(base => {
                const sym = `${base}USDT`;
                const s = market[sym]?.spot || 0;
                const m = market[sym]?.mark || 0;
                const f = market[sym]?.funding || 0;
                
                if (s === 0 || m === 0) return null;

                const basis = m - s;
                const basisBps = (basis / s) * 10000;
                // Simple Funding APR = funding * 3 * 365
                const fundingApr = f * 3 * 365 * 100;
                // Basis APR approx
                const basisApr = (basisBps / 10000) * (365/1) * 100; // Assuming 1 day convergence (simplification for dashboard)

                return {
                    baseAsset: base,
                    spotPrice: s,
                    perpPrice: m,
                    basisBps,
                    fundingRate: f,
                    impliedCarryApr: fundingApr // Carry usually driven by funding for perps
                };
            }).filter(Boolean) as CarryMetric[];
            
            setCarry(carryData);
            setLoading(false);

        }, 250);

        return () => {
            clearInterval(interval);
            service.disconnect();
            serviceRef.current = null;
        };

    }, []);

    return { groups, metrics, carry, loading };
};
