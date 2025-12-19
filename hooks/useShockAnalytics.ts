
import { useState, useEffect, useMemo } from 'react';
import { usePortfolioData } from './usePortfolioData';
import riskConfigService from '../services/riskConfigService';
import { LivePosition, ShockScenario, ShockResultNode, ShockParameter } from '../types';

export const useShockAnalytics = () => {
    const { allPositions, loading: dataLoading } = usePortfolioData();
    const [activeScenario, setActiveScenario] = useState<ShockScenario | null>(null);
    const [results, setResults] = useState<ShockResultNode[]>([]);
    const [isComputing, setIsComputing] = useState(false);

    // Default Scenarios
    const defaultScenarios: ShockScenario[] = [
        { 
            id: 'btc_crash', 
            name: 'BTC Flash Crash (-10%)', 
            parameters: [{ id: '1', type: 'SPOT_PCT', scope: 'ASSET', target: 'BTC', value: -10 }] 
        },
        { 
            id: 'funding_spike', 
            name: 'Funding Spike (+100bps)', 
            parameters: [{ id: '1', type: 'FUNDING_ABS', scope: 'GLOBAL', value: 0.01 }] 
        },
        {
            id: 'alt_bloodbath',
            name: 'Altcoin Panic (-20%)',
            parameters: [
                { id: '1', type: 'SPOT_PCT', scope: 'GLOBAL', value: -20 },
                { id: '2', type: 'SPOT_PCT', scope: 'ASSET', target: 'BTC', value: 0 } // Offset BTC back to 0 (approx)
            ]
        }
    ];

    const calculateShock = () => {
        if (!activeScenario) {
            setResults([]);
            return;
        }

        setIsComputing(true);

        // Simulate calculation delay for realism
        setTimeout(() => {
            const limits = riskConfigService.getLimits();
            const getLimit = (type: string, id: string) => limits.find(l => l.type === type && l.entityId === id)?.limitNotionalUsd || 10000000;

            // 1. Apply Shocks to Positions
            const shockedPositions = allPositions.map(pos => {
                let simulatedMark = pos.markPrice;
                let simulatedFunding = 0; // In types.ts LivePosition doesn't strictly carry funding rate, but we simulate impact here

                activeScenario.parameters.forEach(param => {
                    let isMatch = false;
                    if (param.scope === 'GLOBAL') isMatch = true;
                    if (param.scope === 'ASSET' && pos.baseAsset === param.target) isMatch = true;
                    if (param.scope === 'STRATEGY' && pos.strategyId === param.target) isMatch = true;

                    if (isMatch) {
                        if (param.type === 'SPOT_PCT') {
                            // Apply to spot and perps usually follow spot unless basis shock
                            simulatedMark = simulatedMark * (1 + (param.value / 100));
                        } else if (param.type === 'FUTURES_PCT') {
                            if (pos.venue !== 'SPOT') {
                                simulatedMark = simulatedMark * (1 + (param.value / 100));
                            }
                        }
                         // Funding shock affects PnL via accrual over time, 
                         // but for a "Shock" view usually implies "What if I close now at these prices" 
                         // OR "What is my new carry cost". 
                         // For simplicity in this PnL shock tool, we'll assume FUNDING_ABS adds a one-time penalty 
                         // representing a funding period realized instantly or cost to hold.
                         // Let's model FUNDING_ABS as: Impact = Notional * RateChange
                        if (param.type === 'FUNDING_ABS') {
                            if (pos.venue.includes('PERP')) {
                                // Add cost to unrealized PnL immediately
                                // value 0.01 = 1% cost
                                const cost = pos.notionalUsd * param.value; 
                                // Short pays positive funding, Long receives positive. 
                                // If rate goes UP: Longs get more (positive pnl), Shorts pay more (negative pnl).
                                // param.value is change in rate.
                                if (pos.side === 'LONG') simulatedMark += (simulatedMark * param.value); 
                                else simulatedMark -= (simulatedMark * param.value);
                            }
                        }
                    }
                });

                // Recalculate PnL
                const diff = pos.side === 'LONG' ? simulatedMark - pos.avgEntryPrice : pos.avgEntryPrice - simulatedMark;
                const shockUnrealizedPnl = diff * pos.quantity;
                const shockNotionalUsd = pos.quantity * simulatedMark;

                return {
                    ...pos,
                    shockMark: simulatedMark,
                    shockUnrealizedPnl,
                    shockNotionalUsd
                };
            });

            // 2. Aggregate Results (Hierarchy: Strategy -> Asset)
            const strategies = Array.from(new Set<string>(shockedPositions.map(p => p.strategyId || 'UNASSIGNED')));
            
            const strategyNodes: ShockResultNode[] = strategies.map(stratId => {
                const stratPos = shockedPositions.filter(p => (p.strategyId || 'UNASSIGNED') === stratId);
                const stratLimit = getLimit('STRATEGY', stratId);

                // Group by Asset
                const assets = Array.from(new Set<string>(stratPos.map(p => p.baseAsset)));
                const assetNodes: ShockResultNode[] = assets.map(asset => {
                    const aPos = stratPos.filter(p => p.baseAsset === asset);
                    
                    const currentPnl = aPos.reduce((acc, p) => acc + p.unrealizedPnl, 0);
                    const currentGross = aPos.reduce((acc, p) => acc + p.notionalUsd, 0);
                    
                    const shockPnl = aPos.reduce((acc, p) => acc + p.shockUnrealizedPnl, 0);
                    const shockGross = aPos.reduce((acc, p) => acc + p.shockNotionalUsd, 0);

                    return {
                        id: `${stratId}-${asset}`,
                        name: asset,
                        type: 'ASSET',
                        currentPnl,
                        currentGross,
                        currentUtilization: 0, // Asset limits usually checked at desk level not strat-asset pair
                        shockPnl,
                        shockDeltaPnl: shockPnl - currentPnl,
                        shockGross,
                        shockUtilization: 0,
                        isBreached: false,
                        isMarginCall: false
                    };
                });

                const currentPnl = stratPos.reduce((acc, p) => acc + p.unrealizedPnl, 0);
                const currentGross = stratPos.reduce((acc, p) => acc + p.notionalUsd, 0);
                
                const shockPnl = stratPos.reduce((acc, p) => acc + p.shockUnrealizedPnl, 0);
                const shockGross = stratPos.reduce((acc, p) => acc + p.shockNotionalUsd, 0);

                return {
                    id: stratId,
                    name: stratId,
                    type: 'STRATEGY',
                    currentPnl,
                    currentGross,
                    currentUtilization: currentGross / stratLimit,
                    shockPnl,
                    shockDeltaPnl: shockPnl - currentPnl,
                    shockGross,
                    shockUtilization: shockGross / stratLimit,
                    isBreached: shockGross > stratLimit,
                    isMarginCall: (shockGross / stratLimit) > 1.2, // Mock logic
                    children: assetNodes
                };
            });

            // Global Desk Node
            const deskLimit = getLimit('DESK', 'MAIN_DESK');
            const deskCurrentGross = strategyNodes.reduce((acc, n) => acc + n.currentGross, 0);
            const deskCurrentPnl = strategyNodes.reduce((acc, n) => acc + n.currentPnl, 0);
            const deskShockGross = strategyNodes.reduce((acc, n) => acc + n.shockGross, 0);
            const deskShockPnl = strategyNodes.reduce((acc, n) => acc + n.shockPnl, 0);

            const deskNode: ShockResultNode = {
                id: 'MAIN_DESK',
                name: 'GLOBAL DESK',
                type: 'DESK',
                currentPnl: deskCurrentPnl,
                currentGross: deskCurrentGross,
                currentUtilization: deskCurrentGross / deskLimit,
                shockPnl: deskShockPnl,
                shockDeltaPnl: deskShockPnl - deskCurrentPnl,
                shockGross: deskShockGross,
                shockUtilization: deskShockGross / deskLimit,
                isBreached: deskShockGross > deskLimit,
                isMarginCall: false,
                children: strategyNodes
            };

            setResults([deskNode]);
            setIsComputing(false);
        }, 300); // 300ms calculation delay
    };

    return { 
        defaultScenarios, 
        activeScenario, 
        setActiveScenario, 
        results, 
        calculateShock, 
        isComputing,
        loading: dataLoading
    };
};
    