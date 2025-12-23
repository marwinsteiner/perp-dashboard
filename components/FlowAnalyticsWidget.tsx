
import React, { useState, useEffect, useRef } from 'react';
import { useFlowAnalytics, TimeWindow, GroupMode } from '../hooks/useFlowAnalytics';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

const formatUSD = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const formatQty = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

// -- TAPE COMPONENT --
const TapeRow: React.FC<{ fill: any }> = ({ fill }) => {
    return (
        <div className="flex justify-between items-center text-[10px] py-1 border-b border-gray-800/50 hover:bg-gray-800/50 font-mono">
            <div className="w-16 text-gray-500">{new Date(fill.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}</div>
            <div className="w-16 font-bold text-white truncate">{fill.symbol.replace('USDT','')}</div>
            <div className={`w-8 font-bold ${fill.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>{fill.side}</div>
            <div className="w-14 text-right text-gray-300">{formatQty(fill.size)}</div>
            <div className="w-16 text-right text-cyan-300">{fill.price.toFixed(2)}</div>
            <div className="w-20 text-right text-gray-500 truncate" title={fill.strategyId}>{fill.strategyId.replace('_', ' ')}</div>
        </div>
    );
};

// -- MINI CHART --
const SlipChart = ({ fills }: { fills: any[] }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        
        const chart = createChart(containerRef.current, {
            layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#444' },
            grid: { vertLines: { visible: false }, horzLines: { color: '#111' } },
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            timeScale: { timeVisible: true, secondsVisible: false, borderVisible: false },
            rightPriceScale: { borderVisible: false },
            handleScroll: false,
            handleScale: false
        });

        const series = chart.addLineSeries({ 
            color: '#f59e0b', 
            lineWidth: 2,
            crosshairMarkerVisible: true,
            priceFormat: { type: 'custom', formatter: (p: number) => p.toFixed(2) }
        });
        seriesRef.current = series;
        chartRef.current = chart;

        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || !entries[0].contentRect) return;
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, []);

    useEffect(() => {
        if (!seriesRef.current || !chartRef.current) return;
        if (fills.length === 0) return;

        const sorted = [...fills].sort((a,b) => a.timestamp - b.timestamp);
        const data = sorted.map(f => ({
            time: Math.floor(f.timestamp / 1000) as any,
            value: f.slippageBps
        }));
        
        const uniqueData: any[] = [];
        const seen = new Set();
        data.forEach(d => {
            if(!seen.has(d.time)) {
                uniqueData.push(d);
                seen.add(d.time);
            }
        });
        
        seriesRef.current.setData(uniqueData);
        chartRef.current.timeScale().fitContent();

    }, [fills]);

    return <div ref={containerRef} className="w-full h-full" />;
};

const FlowAnalyticsWidget: React.FC = () => {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('1H');
  const [groupMode, setGroupMode] = useState<GroupMode>('STRATEGY');
  
  const { liveFills, chartFills, aggregatedRows } = useFlowAnalytics(timeWindow, groupMode);

  const hours = Array.from({length: 60}, (_, i) => i);

  return (
    <div className="h-full flex flex-col bg-[#050505] font-mono text-[10px] overflow-hidden select-none">
        {/* HEADER CONTROLS */}
        <div className="bg-neutral-900 border-b border-gray-800 p-1 px-3 flex justify-between items-center h-8 shrink-0">
            <div className="flex items-center gap-2">
                <span className="bg-purple-900 text-purple-100 px-1.5 py-0.5 font-bold rounded-sm text-[9px]">FLOW</span>
                <span className="text-[#ccc] font-bold uppercase tracking-wider">Execution Analytics</span>
            </div>
            
            <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                    <span className="text-[#555] text-[8px] uppercase font-bold">Window:</span>
                    <div className="flex bg-black border border-[#222] p-0.5 rounded-sm">
                        {(['15M', '1H', 'SESSION'] as TimeWindow[]).map(w => (
                            <button 
                                key={w} onClick={() => setTimeWindow(w)}
                                className={`px-2 py-0.5 text-[8px] font-bold ${timeWindow === w ? 'bg-purple-700 text-white' : 'text-[#555] hover:text-[#888]'}`}
                            >
                                {w}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[#555] text-[8px] uppercase font-bold">Group:</span>
                    <div className="flex bg-black border border-[#222] p-0.5 rounded-sm">
                        {(['STRATEGY', 'SYMBOL', 'STRAT_SYM'] as GroupMode[]).map(g => (
                            <button 
                                key={g} onClick={() => setGroupMode(g)}
                                className={`px-2 py-0.5 text-[8px] font-bold ${groupMode === g ? 'bg-cyan-900 text-cyan-100' : 'text-[#555] hover:text-[#888]'}`}
                            >
                                {g === 'STRAT_SYM' ? 'COMBINED' : g}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* LEFT: TAPE & CHARTS */}
            <div className="w-96 flex flex-col border-r border-[#222] bg-[#020202]">
                {/* TAPE */}
                <div className="flex-1 flex flex-col min-h-0 border-b border-[#222]">
                    <div className="bg-[#0a0a0a] px-2 py-1 text-[8px] text-gray-500 font-bold uppercase border-b border-[#222] tracking-tighter">
                        Desk Print (Live)
                    </div>
                    <div className="flex-1 overflow-auto px-2 scrollbar-hide">
                        {liveFills.map(fill => <TapeRow key={fill.id} fill={fill} />)}
                        {liveFills.length === 0 && <div className="text-center py-10 text-gray-800 italic uppercase">Waiting for desk execution prints...</div>}
                    </div>
                </div>

                {/* SLIPPAGE CHART */}
                <div className="h-44 bg-black p-2 flex flex-col shrink-0">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] text-gray-600 uppercase font-bold">Slippage (bps) vs Time</span>
                        <span className="text-[8px] text-orange-500 font-bold">Avg: {aggregatedRows.length > 0 ? aggregatedRows[0].avgSlippageBps.toFixed(2) : 0} bps</span>
                     </div>
                     <div className="flex-1 border border-gray-900 bg-gray-900/5 relative">
                         <SlipChart fills={chartFills} />
                     </div>
                </div>
            </div>

            {/* RIGHT: AGGREGATED GRID */}
            <div className="flex-1 flex flex-col min-w-0 bg-black">
                <div className="bg-[#0a0a0a] px-3 py-1 text-[8px] text-gray-500 font-bold uppercase border-b border-[#222] flex justify-between shrink-0 tracking-tighter">
                    <span>Execution Quality Grid</span>
                    <span>Sorted by Notional Vol</span>
                </div>
                
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead className="bg-[#050505] sticky top-0 z-10 text-[8px] uppercase text-[#444] font-bold border-b border-[#111]">
                            <tr>
                                <th className="px-3 py-2 w-40">Grouping</th>
                                <th className="px-3 py-2 text-right">Total Notional</th>
                                <th className="px-3 py-2 text-right">Fills / Orders</th>
                                <th className="px-3 py-2 text-right">Fill %</th>
                                <th className="px-3 py-2 text-right">Net Flow</th>
                                <th className="px-3 py-2 text-right">Avg Slip (bps)</th>
                                <th className="px-3 py-2 text-right">Med Slip (bps)</th>
                                <th className="px-3 py-2 text-right">Taker %</th>
                                <th className="px-3 py-2 text-right">Rej %</th>
                                <th className="px-3 py-2 text-right">Lat (ms)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#111]">
                            {aggregatedRows.map(row => (
                                <tr key={row.key} className="h-8 hover:bg-[#111] group">
                                    <td className="px-3 py-1 text-[#22d3ee] font-bold uppercase tracking-tight truncate">{row.label.replace('_', ' ')}</td>
                                    <td className="px-3 py-1 text-right text-white font-bold">{formatUSD(row.totalNotional)}</td>
                                    <td className="px-3 py-1 text-right text-[#666]">
                                        {row.fillCount} <span className="opacity-40">/</span> {row.orderCount}
                                    </td>
                                    <td className="px-3 py-1 text-right font-bold text-[#ccc]">
                                        <span className={`${row.fillRatio < 0.8 ? 'text-orange-500' : 'text-gray-300'}`}>
                                            {(row.fillRatio * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className={`px-3 py-1 text-right font-bold ${row.netNotional > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                                        {row.netNotional > 0 ? '+' : ''}{formatUSD(row.netNotional)}
                                    </td>
                                    <td className={`px-3 py-1 text-right font-bold ${row.avgSlippageBps > 2 ? 'text-red-500 bg-red-900/10' : row.avgSlippageBps < 0 ? 'text-green-500' : 'text-amber-500'}`}>
                                        {row.avgSlippageBps.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-1 text-right text-[#777]">
                                        {row.medianSlippageBps.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-1 text-right text-[#ccc]">
                                        {(row.takerPct * 100).toFixed(0)}%
                                    </td>
                                    <td className={`px-3 py-1 text-right ${row.rejectRate > 0.05 ? 'text-red-500 font-bold' : 'text-[#555]'}`}>
                                        {(row.rejectRate * 100).toFixed(1)}%
                                    </td>
                                    <td className="px-3 py-1 text-right text-[#555]">
                                        {row.avgLatencyMs.toFixed(0)}
                                    </td>
                                </tr>
                            ))}
                            {aggregatedRows.length === 0 && (
                                <tr><td colSpan={10} className="text-center py-20 text-gray-800 uppercase italic">Awaiting Desk Flow Aggregation...</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* BOTTOM HEATMAP STRIP */}
                <div className="h-10 border-t border-[#222] bg-[#050505] p-1 px-4 flex items-center shrink-0">
                     <span className="text-[7px] text-[#444] uppercase font-bold w-14 shrink-0">Activity<br/>Heatmap</span>
                     <div className="flex-1 h-3 flex gap-[1px]">
                        {hours.map(h => {
                            const intensity = Math.random();
                            const color = intensity > 0.8 ? 'bg-[#6d28d9]' : intensity > 0.4 ? 'bg-[#22d3ee]' : 'bg-[#111]';
                            return <div key={h} className={`flex-1 ${color} rounded-sm opacity-60`} />
                        })}
                     </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default FlowAnalyticsWidget;
