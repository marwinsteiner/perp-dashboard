
import React, { useState, useMemo } from 'react';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { LivePosition } from '../types';

const formatUSD = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const formatQty = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const formatPnl = (n: number) => {
    const s = n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    return n >= 0 ? `+${s}` : s;
};

type GroupByMode = 'ASSET' | 'STRATEGY' | 'TRADER' | 'VENUE';

const PortfolioWidget: React.FC = () => {
  const { groups: assetGroups, metrics, carry, loading } = usePortfolioData();
  const [groupBy, setGroupBy] = useState<GroupByMode>('ASSET');
  // Default expanded groups for Asset mode
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ 'BTC': true, 'ETH': true, 'SOL': true });

  const toggleGroup = (label: string) => {
      setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Dynamic grouping logic based on selection
  const processedGroups = useMemo(() => {
    const allPositions = assetGroups.flatMap(g => g.positions);
    const map: Record<string, LivePosition[]> = {};

    allPositions.forEach(pos => {
      let key = '';
      switch (groupBy) {
        case 'ASSET': key = pos.baseAsset; break;
        case 'STRATEGY': key = pos.strategyId || 'UNASSIGNED'; break;
        case 'TRADER': key = pos.traderId || 'HOUSE'; break;
        case 'VENUE': key = pos.venue; break;
      }
      if (!map[key]) map[key] = [];
      map[key].push(pos);
    });

    return Object.entries(map).map(([key, positions]) => {
      const netDeltaUsd = positions.reduce((acc, p) => acc + (p.side === 'LONG' ? p.notionalUsd : -p.notionalUsd), 0);
      const totalPnl = positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);
      
      let netDeltaBase: number | undefined;
      if (groupBy === 'ASSET') {
        netDeltaBase = positions.reduce((acc, p) => acc + (p.side === 'LONG' ? p.quantity : -p.quantity), 0);
      }

      return {
        label: key,
        positions,
        netDeltaUsd,
        netDeltaBase,
        totalPnl
      };
    }).sort((a, b) => b.label.localeCompare(a.label));
  }, [assetGroups, groupBy]);

  if (loading) return <div className="h-full flex items-center justify-center text-cyan-500 font-mono animate-pulse uppercase">Connecting to Portfolio Engine...</div>;

  return (
    <div className="h-full flex flex-col bg-black font-mono text-xs overflow-hidden">
        
        {/* TOP RISK STRIP - Bloomberg Style */}
        <div className="flex items-center justify-between bg-neutral-900 border-b border-gray-800 p-3 shrink-0">
            <div className="flex gap-10">
                <div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Total Equity</div>
                    <div className="text-white font-bold text-lg">{formatUSD(metrics?.totalEquity || 0)}</div>
                </div>
                <div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Unrealized PnL</div>
                    <div className={`font-bold text-lg ${ (metrics?.totalPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatPnl(metrics?.totalPnl || 0)}
                    </div>
                </div>
                <div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Net Delta ($)</div>
                    <div className={`font-bold text-lg ${ (metrics?.netDeltaUsd || 0) > 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                        {formatPnl(metrics?.netDeltaUsd || 0)}
                    </div>
                </div>
                <div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Leverage</div>
                    <div className="text-yellow-600 font-bold text-lg">{(metrics?.leverage || 0).toFixed(2)}x</div>
                </div>
            </div>

            {/* CARRY TICKER */}
            <div className="flex gap-6 items-center border-l border-gray-800 pl-6 h-10">
                <span className="text-cyan-500 font-bold tracking-tighter">CARRY:</span>
                {carry.map(c => (
                    <div key={c.baseAsset} className="flex flex-col items-center">
                        <span className="text-gray-400 font-bold text-[10px] uppercase">{c.baseAsset}</span>
                        <span className={`font-bold ${c.impliedCarryApr > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {(c.impliedCarryApr).toFixed(1)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>

        {/* GROUP BY CONTROLS ROW */}
        <div className="bg-neutral-900/50 border-b border-gray-800 p-2 flex items-center gap-3 shrink-0">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] ml-2">Group By:</span>
            <div className="flex gap-2">
                {(['ASSET', 'STRATEGY', 'TRADER', 'VENUE'] as GroupByMode[]).map(mode => (
                    <button
                        key={mode}
                        onClick={() => { setGroupBy(mode); setExpandedGroups({}); }}
                        className={`px-4 py-1 text-[10px] font-bold border transition-all rounded-sm uppercase tracking-tighter ${
                            groupBy === mode 
                                ? 'bg-cyan-900 text-cyan-50 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                                : 'bg-neutral-800 border-neutral-700 text-gray-500 hover:text-gray-300 hover:border-gray-500'
                        }`}
                    >
                        {mode}
                    </button>
                ))}
            </div>
        </div>

        {/* MAIN SPLIT */}
        <div className="flex-1 flex min-h-0">
            
            {/* LEFT: MASTER GRID */}
            <div className="flex-1 overflow-auto border-r border-gray-800">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead className="bg-neutral-900 sticky top-0 z-10 text-[10px] uppercase text-gray-600 font-bold">
                        <tr>
                            <th className="px-2 py-2 border-r border-gray-800 w-10"></th>
                            <th className="px-2 py-2 border-r border-gray-800">Group / Inst</th>
                            <th className="px-2 py-2 border-r border-gray-800 text-right">Qty</th>
                            <th className="px-2 py-2 border-r border-gray-800 text-right">Value ($)</th>
                            <th className="px-2 py-2 border-r border-gray-800 text-right">Entry</th>
                            <th className="px-2 py-2 border-r border-gray-800 text-right">Mark</th>
                            <th className="px-2 py-2 text-right">PnL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900/50">
                        {processedGroups.map(group => {
                            const isExpanded = expandedGroups[group.label];
                            return (
                                <React.Fragment key={group.label}>
                                    {/* GROUP HEADER ROW */}
                                    <tr 
                                        onClick={() => toggleGroup(group.label)}
                                        className="bg-neutral-900/80 hover:bg-neutral-800 cursor-pointer text-gray-300 font-bold h-8 transition-colors"
                                    >
                                        <td className="px-2 py-1 text-center text-gray-500">{isExpanded ? '▼' : '▶'}</td>
                                        <td className="px-2 py-1 text-cyan-400 uppercase tracking-widest">{group.label} {groupBy === 'ASSET' ? 'NET' : ''}</td>
                                        <td className={`px-2 py-1 text-right font-mono ${group.netDeltaUsd > 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                                            {group.netDeltaBase !== undefined ? formatQty(group.netDeltaBase) : '0.00'}
                                        </td>
                                        <td className="px-2 py-1 text-right text-white font-mono">
                                            {formatUSD(group.positions.reduce((a,b) => a + b.notionalUsd, 0))}
                                        </td>
                                        <td className="px-2 py-1 text-right text-gray-600 italic">---</td>
                                        <td className="px-2 py-1 text-right text-gray-600 italic">---</td>
                                        <td className={`px-2 py-1 text-right font-mono ${group.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {formatPnl(group.totalPnl)}
                                        </td>
                                    </tr>

                                    {/* POSITIONS DRILL-DOWN */}
                                    {isExpanded && group.positions.map(pos => (
                                        <tr key={pos.id} className="hover:bg-gray-900/40 text-gray-400 h-7 text-[10px]">
                                            <td className="px-2 py-1 border-r border-gray-900"></td>
                                            <td className="px-2 py-1 border-r border-gray-900 flex items-center gap-2">
                                                <span className={`w-1 h-3 rounded-full ${pos.side === 'LONG' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                                                <span className={pos.venue === 'SPOT' ? 'text-white' : 'text-amber-500'}>
                                                    {pos.symbol.replace('USDT','')} <span className="text-[8px] text-gray-700 opacity-60">[{pos.venue.split('_')[0]}]</span>
                                                </span>
                                            </td>
                                            <td className="px-2 py-1 border-r border-gray-800 text-right font-mono">
                                                {formatQty(pos.quantity)}
                                            </td>
                                            <td className="px-2 py-1 border-r border-gray-800 text-right font-mono">
                                                {formatUSD(pos.notionalUsd)}
                                            </td>
                                            <td className="px-2 py-1 border-r border-gray-800 text-right font-mono text-gray-500">
                                                {pos.avgEntryPrice.toLocaleString()}
                                            </td>
                                            <td className="px-2 py-1 border-r border-gray-800 text-right font-mono text-cyan-600">
                                                {pos.markPrice.toLocaleString()}
                                            </td>
                                            <td className={`px-2 py-1 text-right font-mono ${pos.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatPnl(pos.unrealizedPnl)}
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* RIGHT PANEL: GLOBAL RISK & BASIS MONITOR */}
            <div className="w-80 flex flex-col bg-neutral-900/10 border-l border-gray-800">
                {/* Global Tenor Risk */}
                <div className="p-4 border-b border-gray-800">
                    <h3 className="text-cyan-500 font-bold mb-4 uppercase text-[10px] tracking-[0.2em] border-b border-gray-800 pb-1">Global Tenor Risk</h3>
                    <div className="space-y-3">
                        <RiskBucketRow label="SPOT / CASH" delta={assetGroups.reduce((a,g) => a + g.positions.filter(p=>p.venue==='SPOT').reduce((x,y)=>x+y.notionalUsd,0), 0)} />
                        <RiskBucketRow label="PERP (0d)" delta={assetGroups.reduce((a,g) => a - g.positions.filter(p=>p.venue.includes('PERP')).reduce((x,y)=>x+y.notionalUsd,0), 0)} />
                        <RiskBucketRow label="FUTURES (<30d)" delta={0} /> 
                        <RiskBucketRow label="FUTURES (>30d)" delta={assetGroups.reduce((a,g) => a - g.positions.filter(p=>p.venue.includes('FUTURE')).reduce((x,y)=>x+y.notionalUsd,0), 0)} />
                    </div>
                </div>

                {/* Basis Detail Monitor */}
                <div className="flex-1 p-4 overflow-auto">
                    <h3 className="text-cyan-500 font-bold mb-3 uppercase text-[10px] tracking-[0.2em] border-b border-gray-800 pb-1">Basis Monitor (BPS)</h3>
                    <table className="w-full text-right">
                        <thead className="text-[9px] text-gray-600 uppercase">
                            <tr>
                                <th className="text-left font-normal">Asset</th>
                                <th className="font-normal">Basis</th>
                                <th className="font-normal">Fund/8h</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-[10px]">
                            {carry.map(c => (
                                <tr key={c.baseAsset} className="border-b border-gray-900 hover:bg-gray-800/20">
                                    <td className="text-left py-2 text-gray-300 font-bold">{c.baseAsset}</td>
                                    <td className={`py-2 ${c.basisBps > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {c.basisBps.toFixed(1)}
                                    </td>
                                    <td className={`py-2 ${c.fundingRate > 0 ? 'text-orange-400' : 'text-blue-400'}`}>
                                        {(c.fundingRate * 100).toFixed(4)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};

const RiskBucketRow = ({ label, delta }: { label: string, delta: number }) => (
    <div className="flex justify-between items-center text-[10px]">
        <span className="text-gray-500 uppercase tracking-tighter">{label}</span>
        <div className="flex flex-col items-end">
            <span className={`font-bold font-mono text-sm ${delta >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                {formatUSD(Math.abs(delta))} <span className="text-[10px] ml-1">{delta >= 0 ? 'L' : 'S'}</span>
            </span>
        </div>
    </div>
);

export default PortfolioWidget;
