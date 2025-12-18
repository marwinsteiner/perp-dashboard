import React, { useState } from 'react';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { LivePosition, PortfolioGroup } from '../types';

const formatUSD = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const formatQty = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const formatPnl = (n: number) => {
    const s = n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    return n >= 0 ? `+${s}` : s;
};

const PortfolioWidget: React.FC = () => {
  const { groups, metrics, carry, loading } = usePortfolioData();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ 'BTC': true, 'ETH': true });

  const toggleGroup = (base: string) => {
      setExpandedGroups(prev => ({ ...prev, [base]: !prev[base] }));
  };

  if (loading) return <div className="h-full flex items-center justify-center text-cyan-500 font-mono animate-pulse">CONNECTING TO PAPER ENGINE...</div>;

  return (
    <div className="h-full flex flex-col bg-black font-mono text-xs overflow-hidden">
        
        {/* TOP RISK STRIP */}
        <div className="flex items-center justify-between bg-neutral-900 border-b border-gray-800 p-2 shrink-0">
            <div className="flex gap-6">
                <div>
                    <div className="text-[9px] text-gray-500 uppercase">Total Equity</div>
                    <div className="text-white font-bold text-sm">{formatUSD(metrics?.totalEquity || 0)}</div>
                </div>
                <div>
                    <div className="text-[9px] text-gray-500 uppercase">Unrealized PnL</div>
                    <div className={`font-bold text-sm ${ (metrics?.totalPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatPnl(metrics?.totalPnl || 0)}
                    </div>
                </div>
                <div>
                    <div className="text-[9px] text-gray-500 uppercase">Net Delta ($)</div>
                    <div className={`font-bold text-sm ${ (metrics?.netDeltaUsd || 0) > 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                        {formatPnl(metrics?.netDeltaUsd || 0)}
                    </div>
                </div>
                <div>
                    <div className="text-[9px] text-gray-500 uppercase">Leverage</div>
                    <div className="text-yellow-500 font-bold text-sm">{(metrics?.leverage || 0).toFixed(2)}x</div>
                </div>
            </div>

            {/* CARRY TICKER */}
            <div className="flex gap-4 items-center border-l border-gray-800 pl-4">
                <span className="text-cyan-600 font-bold">CARRY:</span>
                {carry.map(c => (
                    <div key={c.baseAsset} className="flex flex-col items-end">
                        <span className="text-gray-400 font-bold">{c.baseAsset}</span>
                        <span className={`${c.impliedCarryApr > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {(c.impliedCarryApr).toFixed(1)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>

        {/* MAIN SPLIT */}
        <div className="flex-1 flex min-h-0">
            
            {/* LEFT: MASTER GRID */}
            <div className="flex-1 overflow-auto border-r border-gray-800">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-900 sticky top-0 z-10 text-[10px] uppercase text-gray-500">
                        <tr>
                            <th className="px-2 py-1 border-r border-gray-800 w-8"></th>
                            <th className="px-2 py-1 border-r border-gray-800">Instrument</th>
                            <th className="px-2 py-1 border-r border-gray-800 text-right">Qty</th>
                            <th className="px-2 py-1 border-r border-gray-800 text-right">Value ($)</th>
                            <th className="px-2 py-1 border-r border-gray-800 text-right">Entry</th>
                            <th className="px-2 py-1 border-r border-gray-800 text-right">Mark</th>
                            <th className="px-2 py-1 border-r border-gray-800 text-right">PnL</th>
                            <th className="px-2 py-1 text-right">%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900/50">
                        {groups.map(group => {
                            const isExpanded = expandedGroups[group.baseAsset];
                            return (
                                <React.Fragment key={group.baseAsset}>
                                    {/* GROUP HEADER */}
                                    <tr 
                                        onClick={() => toggleGroup(group.baseAsset)}
                                        className="bg-gray-900 hover:bg-gray-800 cursor-pointer text-gray-300 font-bold"
                                    >
                                        <td className="px-2 py-1 text-center text-[10px]">{isExpanded ? '▼' : '▶'}</td>
                                        <td className="px-2 py-1 text-cyan-400">{group.baseAsset} NET</td>
                                        <td className={`px-2 py-1 text-right ${group.netDeltaBase > 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                                            {formatQty(group.netDeltaBase)}
                                        </td>
                                        <td className="px-2 py-1 text-right text-gray-500 italic">---</td>
                                        <td className="px-2 py-1 text-right text-gray-500 italic">---</td>
                                        <td className="px-2 py-1 text-right text-gray-500 italic">---</td>
                                        <td className={`px-2 py-1 text-right ${group.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {formatPnl(group.totalPnl)}
                                        </td>
                                        <td className="px-2 py-1 text-right"></td>
                                    </tr>

                                    {/* POSITIONS */}
                                    {isExpanded && group.positions.map(pos => (
                                        <tr key={pos.id} className="hover:bg-gray-900/30 text-gray-400">
                                            <td className="px-2 py-1 border-r border-gray-800"></td>
                                            <td className="px-2 py-1 border-r border-gray-800 flex items-center gap-2">
                                                <span className={`w-1 h-3 ${pos.side === 'LONG' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                <span className={pos.venue === 'SPOT' ? 'text-white' : 'text-yellow-500'}>
                                                    {pos.venue.replace('_USDT','')}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1 border-r border-gray-800 text-right font-mono">
                                                {formatQty(pos.quantity)}
                                            </td>
                                            <td className="px-2 py-1 border-r border-gray-800 text-right">
                                                {formatUSD(pos.notionalUsd)}
                                            </td>
                                            <td className="px-2 py-1 border-r border-gray-800 text-right">
                                                {pos.avgEntryPrice.toLocaleString()}
                                            </td>
                                            <td className="px-2 py-1 border-r border-gray-800 text-right text-cyan-300">
                                                {pos.markPrice.toLocaleString()}
                                            </td>
                                            <td className={`px-2 py-1 border-r border-gray-800 text-right ${pos.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {formatPnl(pos.unrealizedPnl)}
                                            </td>
                                            <td className={`px-2 py-1 text-right ${pos.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {pos.pnlPercent.toFixed(2)}%
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* RIGHT: RISK & BASIS PANEL */}
            <div className="w-80 flex flex-col bg-gray-900/20">
                {/* Tenor Buckets */}
                <div className="p-2 border-b border-gray-800">
                    <h3 className="text-cyan-500 font-bold mb-2 uppercase text-[10px] tracking-wider">Tenor Risk Buckets</h3>
                    <div className="space-y-2">
                        <RiskBucketRow label="SPOT / CASH" delta={groups.reduce((a,g) => a + g.positions.filter(p=>p.venue==='SPOT').reduce((x,y)=>x+y.notionalUsd,0), 0)} />
                        <RiskBucketRow label="PERP (0d)" delta={groups.reduce((a,g) => a - g.positions.filter(p=>p.venue.includes('PERP')).reduce((x,y)=>x+y.notionalUsd,0), 0)} />
                        <RiskBucketRow label="FUTURES (<30d)" delta={0} /> 
                        <RiskBucketRow label="FUTURES (>30d)" delta={groups.reduce((a,g) => a - g.positions.filter(p=>p.venue.includes('FUTURE')).reduce((x,y)=>x+y.notionalUsd,0), 0)} />
                    </div>
                </div>

                {/* Basis Detail */}
                <div className="flex-1 p-2 overflow-auto">
                    <h3 className="text-cyan-500 font-bold mb-2 uppercase text-[10px] tracking-wider">Basis Monitor (BPS)</h3>
                    <table className="w-full text-right">
                        <thead className="text-[9px] text-gray-600">
                            <tr>
                                <th className="text-left">Asset</th>
                                <th>Basis</th>
                                <th>Fund/8h</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-[10px]">
                            {carry.map(c => (
                                <tr key={c.baseAsset} className="border-b border-gray-800/50">
                                    <td className="text-left py-1 text-white">{c.baseAsset}</td>
                                    <td className={`py-1 ${c.basisBps > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {c.basisBps.toFixed(1)}
                                    </td>
                                    <td className={`py-1 ${c.fundingRate > 0 ? 'text-orange-400' : 'text-blue-400'}`}>
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
        <span className="text-gray-500">{label}</span>
        <div className="flex flex-col items-end">
            <span className={`font-bold ${delta >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                {formatUSD(Math.abs(delta))} {delta >= 0 ? 'L' : 'S'}
            </span>
        </div>
    </div>
);

export default PortfolioWidget;