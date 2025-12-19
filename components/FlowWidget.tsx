
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
            <div className="w-20 font-bold text-white truncate">{fill.symbol.replace('USDT','')}</div>
            <div className={`w-10 ${fill.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>{fill.side}</div>
            <div className="w-16 text-right text-gray-300">{formatQty(fill.size)}</div>
            <div className="w-20 text-right text-cyan-300">{fill.price.toFixed(2)}</div>
            <div className="w-24 text-right text-gray-500 truncate" title={fill.strategyId}>{fill.strategyId.replace('_', ' ')}</div>
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
            layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#666' },
            grid: { vertLines: { visible: false }, horzLines: { color: '#222' } },
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
            timeScale: { timeVisible: true, secondsVisible: false },
        });

        const series = chart.addLineSeries({ 
            color: '#f59e0b', 
            lineWidth: 2,
            crosshairMarkerVisible: true
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

        // Group by minute for chart (rough)
        // We need data sorted ascending for lightweight charts
        const sorted = [...fills].sort((a,b) => a.timestamp - b.timestamp);
        
        // Downsample for visual (simple moving average of last 5)
        const data = sorted.map(f => ({
            time: Math.floor(f.timestamp / 1000) as any,
            value: f.slippageBps
        }));
        
        // Dedup timestamps for Lightweight Charts (it hates dups)
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

const FlowWidget: React.FC = () => {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('1H');
  const [groupMode, setGroupMode] = useState<GroupMode>('STRATEGY');
  
  const { liveFills, chartFills, aggregatedRows } = useFlowAnalytics(timeWindow, groupMode);

  // Heatmap Data Mock (Hour of day vs Spread)
  const hours = Array.from({length: 24}, (_, i) => i);

  return (
    <div className="h-full flex flex-col bg-[#080808] font-mono text-xs overflow-hidden">
        {/* HEADER CONTROLS */}
        <div className="bg-neutral-900 border-b border-gray-800 p-2 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                <span className="bg-purple-900 text-purple-100 px-2 py-0.5 font-bold text-[10px]">FLOW</span>
                <h2 className="text-white text-xs font-bold tracking-tighter uppercase">Execution Analytics</h2>
            </div>
            
            <div className="flex gap-6">
                <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-[9px] uppercase">Window:</span>
                    {(['15M', '1H', 'SESSION'] as TimeWindow[]).map(w => (
                        <button 
                            key={w} onClick={() => setTimeWindow(w)}
                            className={`px-2 py-0.5 border rounded-sm text-[9px] font-bold ${timeWindow === w ? 'bg-purple-700 border-purple-500 text-white' : 'border-gray-800 text-gray-500'}`}
                        >
                            {w}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-[9px] uppercase">Group:</span>
                    {(['STRATEGY', 'SYMBOL', 'STRAT_SYM'] as GroupMode[]).map(g => (
                        <button 
                            key={g} onClick={() => setGroupMode(g)}
                            className={`px-2 py-0.5 border rounded-sm text-[9px] font-bold ${groupMode === g ? 'bg-cyan-900 border-cyan-500 text-cyan-100' : 'border-gray-800 text-gray-500'}`}
                        >
                            {g === 'STRAT_SYM' ? 'COMBINED' : g}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="flex-1 flex min-h-0">
            {/* LEFT: TAPE & CHARTS */}
            <div className="w-[450px] flex flex-col border-r border-gray-800">
                {/* TAPE */}
                <div className="flex-1 flex flex-col min-h-0 border-b border-gray-800">
                    <div className="bg-neutral-900/50 px-2 py-1 text-[9px] text-gray-400 font-bold uppercase border-b border-gray-800">
                        Desk Print (Live)
                    </div>
                    <div className="flex-1 overflow-auto px-2">
                        {liveFills.map(fill => <TapeRow key={fill.id} fill={fill} />)}
                    </div>
                </div>

                {/* CHARTS */}
                <div className="h-48 bg-black p-2 flex flex-col">
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] text-gray-500 uppercase">Slippage (bps) vs Time</span>
                        <span className="text-[9px] text-orange-500 font-bold">Avg: {aggregatedRows.length > 0 ? aggregatedRows[0].avgSlippageBps.toFixed(2) : 0} bps</span>
                     </div>
                     <div className="flex-1 border border-gray-800 bg-gray-900/20 relative">
                         <SlipChart fills={chartFills} />
                     </div>
                </div>
            </div>

            {/* RIGHT: AGGREGATED GRID */}
            <div className="flex-1 flex flex-col min-h-0 bg-black">
                <div className="bg-neutral-900/50 px-2 py-1 text-[9px] text-gray-400 font-bold uppercase border-b border-gray-800 flex justify-between">
                    <span>Execution Quality Grid</span>
                    <span>Sorted by Notional Vol</span>
                </div>
                
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-neutral-900 sticky top-0 z-10 text-[9px] uppercase text-gray-500 border-b border-gray-800">
                            <tr>
                                <th className="px-3 py-2">Grouping</th>
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
                        <tbody className="bg-black text-[11px]">
                            {aggregatedRows.map(row => (
                                <tr key={row.key} className="border-b border-gray-800/50 hover:bg-gray-900/30 group">
                                    <td className="px-3 py-2 text-cyan-300 font-bold truncate max-w-[150px]">{row.label}</td>
                                    <td className="px-3 py-2 text-right text-gray-300 font-mono">{formatUSD(row.totalNotional)}</td>
                                    <td className="px-3 py-2 text-right text-gray-500 font-mono">
                                        {row.fillCount} <span className="text-gray-700">/</span> {row.orderCount}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono">
                                        <span className={`${row.fillRatio < 0.5 ? 'text-red-500 font-bold' : 'text-gray-300'}`}>
                                            {(row.fillRatio * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className={`px-3 py-2 text-right font-mono font-bold ${row.netNotional > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {row.netNotional > 0 ? '+' : ''}{formatUSD(row.netNotional)}
                                    </td>
                                    <td className={`px-3 py-2 text-right font-mono ${row.avgSlippageBps > 2 ? 'text-red-500 bg-red-900/10' : row.avgSlippageBps < 0 ? 'text-green-400' : 'text-gray-300'}`}>
                                        {row.avgSlippageBps.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-gray-400">
                                        {row.medianSlippageBps.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-gray-400">
                                        {(row.takerPct * 100).toFixed(0)}%
                                    </td>
                                    <td className={`px-3 py-2 text-right font-mono ${row.rejectRate > 0.05 ? 'text-orange-500 font-bold' : 'text-gray-500'}`}>
                                        {(row.rejectRate * 100).toFixed(1)}%
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-gray-500">
                                        {row.avgLatencyMs.toFixed(0)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* BOTTOM HEATMAP STRIP (Visual Decoration) */}
                <div className="h-12 border-t border-gray-800 bg-neutral-900/30 flex items-center px-4 gap-1 overflow-hidden">
                     <span className="text-[9px] text-gray-600 mr-2 uppercase w-12 shrink-0">Activity Heatmap</span>
                     {hours.map(h => {
                         const intensity = Math.random();
                         const color = intensity > 0.8 ? 'bg-purple-500' : intensity > 0.5 ? 'bg-purple-700' : 'bg-gray-800';
                         return (
                             <div key={h} className="flex-1 flex flex-col gap-0.5 items-center" title={`Hour ${h}`}>
                                 <div className={`w-full h-3 ${color} rounded-sm opacity-80`} />
                                 <div className={`w-full h-3 ${Math.random() > 0.5 ? 'bg-cyan-700' : 'bg-gray-800'} rounded-sm opacity-60`} />
                             </div>
                         )
                     })}
                </div>
            </div>
        </div>
    </div>
  );
};

export default FlowWidget;
