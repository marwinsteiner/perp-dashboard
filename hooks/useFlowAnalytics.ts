
import { useState, useEffect, useMemo } from 'react';
import paperExecutionService from '../services/paperExecutionService';
import { Order, Trade } from '../types';

export type TimeWindow = '15M' | '1H' | 'SESSION';
export type GroupMode = 'STRATEGY' | 'SYMBOL' | 'STRAT_SYM';

export interface AggregatedFlowRow {
    key: string;
    label: string;
    totalNotional: number;
    fillCount: number;
    orderCount: number;
    fillRatio: number;
    netNotional: number;
    avgSlippageBps: number;
    medianSlippageBps: number;
    takerPct: number;
    rejectRate: number;
    avgLatencyMs: number;
}

export const useFlowAnalytics = (timeWindow: TimeWindow, groupMode: GroupMode) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);

    useEffect(() => {
        const update = () => {
            setOrders([...paperExecutionService.getOrders()]);
            setTrades([...paperExecutionService.getTrades()]);
        };
        const interval = setInterval(update, 1000);
        update();
        return () => clearInterval(interval);
    }, []);

    const filteredData = useMemo(() => {
        const now = Date.now();
        const cutoff = timeWindow === '15M' ? now - 900000 : timeWindow === '1H' ? now - 3600000 : 0;
        
        const filteredOrders = orders.filter(o => o.timestamp >= cutoff);
        const filteredTrades = trades.filter(t => t.time >= cutoff);
        
        return { filteredOrders, filteredTrades };
    }, [orders, trades, timeWindow]);

    const liveFills = useMemo(() => {
        // Return last 50 trades as "Desk Prints"
        return filteredData.filteredTrades.slice(-50).reverse().map(t => {
            const relatedOrder = orders.find(o => o.id === t.orderId);
            return {
                id: t.id,
                timestamp: t.time,
                symbol: t.symbol,
                side: relatedOrder?.side === 'LONG' ? 'BUY' : 'SELL',
                size: t.qty,
                price: t.price,
                strategyId: relatedOrder?.strategyId || 'MANUAL'
            };
        });
    }, [filteredData.filteredTrades, orders]);

    const chartFills = useMemo(() => {
        return filteredData.filteredTrades.map(t => {
            const o = orders.find(ord => ord.id === t.orderId);
            let slippageBps = 0;
            if (o && o.arrivalPrice && o.avgFillPrice) {
                const diff = o.side === 'LONG' ? o.avgFillPrice - o.arrivalPrice : o.arrivalPrice - o.avgFillPrice;
                slippageBps = (diff / o.arrivalPrice) * 10000;
            }
            return {
                timestamp: t.time,
                slippageBps
            };
        });
    }, [filteredData.filteredTrades, orders]);

    const aggregatedRows = useMemo((): AggregatedFlowRow[] => {
        const groups: Record<string, { orders: Order[], trades: Trade[] }> = {};

        filteredData.filteredOrders.forEach(o => {
            let key = '';
            if (groupMode === 'STRATEGY') key = o.strategyId || 'UNASSIGNED';
            else if (groupMode === 'SYMBOL') key = o.symbol;
            else key = `${o.strategyId}:${o.symbol}`;

            if (!groups[key]) groups[key] = { orders: [], trades: [] };
            groups[key].orders.push(o);
        });

        filteredData.filteredTrades.forEach(t => {
            const o = orders.find(ord => ord.id === t.orderId);
            if (!o) return;
            
            let key = '';
            if (groupMode === 'STRATEGY') key = o.strategyId || 'UNASSIGNED';
            else if (groupMode === 'SYMBOL') key = o.symbol;
            else key = `${o.strategyId}:${o.symbol}`;

            if (groups[key]) groups[key].trades.push(t);
        });

        return Object.entries(groups).map(([key, data]) => {
            const totalNotional = data.trades.reduce((sum, t) => sum + (t.qty * t.price), 0);
            const fillCount = data.orders.filter(o => o.filledQty > 0).length;
            const orderCount = data.orders.length;
            const totalQtySub = data.orders.reduce((sum, o) => sum + o.qty, 0);
            const totalQtyFilled = data.orders.reduce((sum, o) => sum + o.filledQty, 0);
            
            const buys = data.trades.filter(t => orders.find(o => o.id === t.orderId)?.side === 'LONG').reduce((sum, t) => sum + (t.qty * t.price), 0);
            const sells = data.trades.filter(t => orders.find(o => o.id === t.orderId)?.side === 'SHORT').reduce((sum, t) => sum + (t.qty * t.price), 0);

            const slippages = data.trades.map(t => {
                const o = orders.find(ord => ord.id === t.orderId);
                if (o && o.arrivalPrice) {
                    const diff = o.side === 'LONG' ? t.price - o.arrivalPrice : o.arrivalPrice - t.price;
                    return (diff / o.arrivalPrice) * 10000;
                }
                return 0;
            });

            const avgSlip = slippages.length > 0 ? slippages.reduce((a, b) => a + b, 0) / slippages.length : 0;
            const sortedSlips = [...slippages].sort((a, b) => a - b);
            const medianSlip = sortedSlips.length > 0 ? sortedSlips[Math.floor(sortedSlips.length / 2)] : 0;

            return {
                key,
                label: key,
                totalNotional,
                fillCount,
                orderCount,
                fillRatio: totalQtySub > 0 ? totalQtyFilled / totalQtySub : 0,
                netNotional: buys - sells,
                avgSlippageBps: avgSlip,
                medianSlippageBps: medianSlip,
                takerPct: 0.65, // Mock value
                rejectRate: data.orders.filter(o => o.status === 'REJECTED').length / orderCount || 0,
                avgLatencyMs: 35 // Mock value
            };
        }).sort((a, b) => b.totalNotional - a.totalNotional);
    }, [filteredData, groupMode, orders]);

    return { liveFills, chartFills, aggregatedRows };
};
