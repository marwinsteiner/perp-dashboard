
import { useState, useEffect, useMemo } from 'react';
import flowDataService from '../services/flowDataService';
import { FlowFill, FlowOrder, FlowAggregatedRow } from '../types';

export type TimeWindow = '15M' | '1H' | 'SESSION';
export type GroupMode = 'STRATEGY' | 'SYMBOL' | 'STRAT_SYM';

export const useFlowAnalytics = (timeWindow: TimeWindow, groupMode: GroupMode) => {
    const [fills, setFills] = useState<FlowFill[]>([]);
    const [orders, setOrders] = useState<FlowOrder[]>([]);

    useEffect(() => {
        const update = () => {
            // Service now returns copies, so simple set is safe
            setFills(flowDataService.getFills());
            setOrders(flowDataService.getOrders());
        };
        
        update();
        const unsub = flowDataService.subscribe(update);
        return unsub;
    }, []);

    const processedData = useMemo(() => {
        const now = Date.now();
        let cutoff = 0;
        
        if (timeWindow === '15M') cutoff = now - (15 * 60 * 1000);
        else if (timeWindow === '1H') cutoff = now - (60 * 60 * 1000);
        else cutoff = now - (8 * 60 * 60 * 1000); // 8 Hour Session

        const relevantFills = fills.filter(f => f.timestamp >= cutoff);
        const relevantOrders = orders.filter(o => o.timestamp >= cutoff);

        // Grouping
        const groups: Record<string, { fills: FlowFill[], orders: FlowOrder[] }> = {};
        
        // Populate Groups with keys
        relevantOrders.forEach(o => {
            let key = '';
            if (groupMode === 'STRATEGY') key = o.strategyId;
            else if (groupMode === 'SYMBOL') key = o.symbol;
            else key = `${o.strategyId}|${o.symbol}`;

            if (!groups[key]) groups[key] = { fills: [], orders: [] };
            groups[key].orders.push(o);
        });

        relevantFills.forEach(f => {
            let key = '';
            if (groupMode === 'STRATEGY') key = f.strategyId;
            else if (groupMode === 'SYMBOL') key = f.symbol;
            else key = `${f.strategyId}|${f.symbol}`;

            if (!groups[key]) groups[key] = { fills: [], orders: [] };
            groups[key].fills.push(f);
        });

        // Calculate Metrics per Group
        const result: FlowAggregatedRow[] = Object.entries(groups).map(([key, data]) => {
            const f = data.fills;
            const o = data.orders;

            const totalNotional = f.reduce((acc, x) => acc + x.notional, 0);
            const totalVolume = f.reduce((acc, x) => acc + x.size, 0);
            const fillCount = f.length;
            const orderCount = o.length;

            const buyNotional = f.filter(x => x.side === 'BUY').reduce((acc, x) => acc + x.notional, 0);
            const sellNotional = f.filter(x => x.side === 'SELL').reduce((acc, x) => acc + x.notional, 0);
            const netNotional = buyNotional - sellNotional;

            const slippages = f.map(x => x.slippageBps);
            const avgSlippageBps = slippages.length ? slippages.reduce((a,b) => a+b, 0) / slippages.length : 0;
            
            // Median Calc
            slippages.sort((a,b) => a - b);
            const medianSlippageBps = slippages.length ? slippages[Math.floor(slippages.length / 2)] : 0;

            const fillRatio = orderCount ? fillCount / orderCount : 0;
            const takerPct = fillCount ? f.filter(x => x.liquidity === 'TAKER').length / fillCount : 0;
            const rejectRate = orderCount ? o.filter(x => x.status === 'REJECTED').length / orderCount : 0;
            
            const avgLatencyMs = o.length ? o.reduce((acc, x) => acc + x.latencyMs, 0) / o.length : 0;

            return {
                key,
                label: key.replace('|', ' / '),
                totalNotional,
                totalVolume,
                fillCount,
                orderCount,
                netNotional,
                buyNotional,
                sellNotional,
                avgSlippageBps,
                medianSlippageBps,
                fillRatio,
                takerPct,
                rejectRate,
                avgLatencyMs
            };
        });

        const sortedRows = result.sort((a, b) => b.totalNotional - a.totalNotional);

        return { aggregatedRows: sortedRows, relevantFills };

    }, [fills, orders, timeWindow, groupMode]);

    return { 
        liveFills: fills.slice(0, 50), // Top 50 for tape (Always most recent)
        chartFills: processedData.relevantFills, // Filtered for chart
        aggregatedRows: processedData.aggregatedRows 
    };
};
