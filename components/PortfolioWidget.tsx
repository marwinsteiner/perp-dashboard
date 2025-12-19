
import React, { useState, useMemo } from 'react';
import { usePortfolioData } from '../hooks/usePortfolioData';
import { LivePosition, PortfolioGroup } from '../types';

const formatUSD = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const formatQty = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const formatPnl = (n: number) => {
    const s = n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    return n >= 0 ? `+${s}` : s;
};

type GroupMode = 'ASSET' | 'STRATEGY' | 'TRADER' | 'VENUE';

interface DisplayGroup {
    key: string;
    label: string;
    positions: LivePosition[];
    netDeltaBase: number;
    netDeltaUsd: number;
    totalPnl: number;
    totalGrossUsd: number;
}

interface PortfolioWidgetProps {
    onOpenOMS?: (context: any) => void;
}

const PortfolioWidget: React.FC<PortfolioWidgetProps> = ({ onOpenOMS }) => {
  const { allPositions, metrics, carry, loading } = usePortfolioData();
  const [groupMode, setGroupMode] = useState<GroupMode>('ASSET');
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, pos: LivePosition } | null>(null);

  const toggleGroup = (key: string) => {
      setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRightClick = (e: React.MouseEvent, pos: LivePosition) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, pos });
  };

  const closeMenu = () => setContextMenu(null);

  const triggerOMS = (action: 'TRADE' | 'FLATTEN' | 'HALVE') => {
      if (!contextMenu || !onOpenOMS) return;
      const { pos } = contextMenu;
      
      let side = 'BUY'; 
      // Default Trade action: no side pref, or maybe contra logic? Default BUY
      // Flatten: Opposite of current side
      if (action === 'FLATTEN' || action === 'HALVE') {
          side = pos.side === 'LONG' ? 'SELL' : 'BUY';
      }

      onOpenOMS({
          symbol: pos.symbol,
          venue: pos.venue,
          strategyId: pos.strategyId,
          traderId: pos.traderId,
          side: side,
          // Could pass quantity intent here if OMS supported it, OMS widget will handle logic if needed
      });
      closeMenu();
  };

  // Generic Grouping Logic
  const displayGroups: DisplayGroup[] = useMemo(() => {
      if (!allPositions.length) return [];

      const groups: Record<string, LivePosition[]> = {};
      const labels: Record<string, string> = {};
      
      allPositions.forEach(p => {
          let key = '';
          let label = '';
          
          if (groupMode === 'ASSET') {
              key = p.baseAsset;
              label = p.baseAsset;
          } else if (groupMode === 'STRATEGY') {
              key = p.strategyId || 'UNASSIGNED';
              label = key.replace(/_/g, ' ');
          } else if (groupMode === 'TRADER') {
              key = p.traderId || 'HOUSE';
              label = key;
          } else if (groupMode === 'VENUE') {
              key = p.venue;
              label = key.replace(/_/g, ' ');
          }

          if (!groups[key]) {
            groups[key] = [];
            labels[key] = label;
          }
          groups[key].push(p);
      });

      return Object.entries(groups).map(([key, positions]) => {
          const netDeltaBase = positions.reduce((acc, p) => acc + (p.side === 'LONG' ? p.quantity : -p.quantity), 0);
          const netDeltaUsd = positions.reduce((acc, p) => acc + (p.side === 'LONG' ? p.notionalUsd : -p.notionalUsd), 0);
          const totalPnl = positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);
          const totalGrossUsd = positions.reduce((acc, p) => acc + p.notionalUsd, 0);
          const label = labels[key];

          return {
              key,
              label: groupMode === 'ASSET' ? `${label} NET` : label,
              positions,
              netDeltaBase,
              netDeltaUsd,
              totalPnl,
              totalGrossUsd
          };
      }).sort((a,b) => b.totalGrossUsd - a.totalGrossUsd); // Sort by Size

  }, [allPositions, groupMode]);

  // Set initial expansion for Asset mode
  useMemo(() => {
      if (groupMode === 'ASSET') {
        const initial: Record<string, boolean> = {};
        displayGroups.forEach(g => initial[g.key] = true);
        if (Object.keys(expandedKeys).length === 0) setExpandedKeys(initial);
      }
  }, [groupMode]);

  if (loading) return <div className="h-full flex items-center justify-center text-cyan-500 font-mono animate-pulse">CONNECTING TO PAPER ENGINE...</div>;

  return (
    <div className="h-full flex flex-col bg-black font-mono text-xs overflow-hidden" onClick={closeMenu}>
        
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

        {/* HEADER & FILTER BAR */}
        <div className="bg-neutral-900/50 border-b border-gray-800 p-1 px-2 flex items-center gap-2">
            <span className="text-gray-500 text-[10px] uppercase font-bold mr-2">Group By:</span>
            {(['ASSET', 'STRATEGY', 'TRADER', 'VENUE'] as GroupMode[]).map(mode => (
                <button
                    key={mode}
                    onClick={() => setGroupMode(mode)}
                    className={`
                        px-2 py-0.5 text-[9px] font-bold uppercase border rounded-sm transition-all
                        ${groupMode === mode 
                            ? 'bg-cyan-900 border-cyan-500 text-cyan-100' 
                            : 'bg-black border-gray-700 text-gray-500 hover:text-white hover:border-gray-500'}
                    `}
                >
                    {mode}
                </button>
            ))}
        </div>

        {/* MAIN SPLIT */}
        <div className="flex-1 flex min-h-0">
            
            {/* LEFT: MASTER GRID */}
            <div className="flex-1 overflow-auto border-r border-gray-800 relative">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-900 sticky top-0 z-10 text-[10px] uppercase text-gray-500 shadow-sm">
                        <tr>
                            <th className="px-2 py-1 border-r border-gray-800 w-8"></th>
                            <th className="px-2 py-1 border-r border-gray-800 w-32">Group / Inst</th>
                            <th className="px-2 py-1 border-r border-gray-800 text-right">Qty</th>
                            <th className="px-2 py-1 border-r border-gray-800 text-right">Value ($)</th>
                            <th className="px-2 py-1 border-r border-gray-800 text-right">Entry</th>
                            <th className="px-2 py-1 border-r border-gray-800 text-right">Mark</th>
                            <th className="px-2 py-1 border-r border-gray-800 text-right">PnL</th>
                            <th className="px-2 py-1 text-right">%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900/50">
                        {displayGroups.map(group => {
                            const isExpanded = expandedKeys[group.key];
                            return (
                                <React.Fragment key={group.key}>
                                    {/* GROUP HEADER */}
                                    <tr 
                                        onClick={() => toggleGroup(group.key)}
                                        className="bg-gray-900 hover:bg-gray-800 cursor-pointer text-gray-300 font-bold border-b border-gray-800"
                                    >
                                        <td className="px-2 py-1 text-center text-[10px]">{isExpanded ? '▼' : '▶'}</td>
                                        <td className="px-2 py-1 text-cyan-400 font-mono truncate">{group.label}</td>
                                        
                                        {/* Dynamic Columns based on Group Mode logic */}
                                        <td className={`px-2 py-1 text-right ${group.netDeltaBase > 0 ? 'text-blue-400' : group.netDeltaBase < 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                                            {groupMode === 'ASSET' ? formatQty(group.netDeltaBase) : '---'}
                                        </td>
                                        <td className="px-2 py-1 text-right text-gray-300">
                                            {formatUSD(group.totalGrossUsd)}
                                        </td>
                                        <td className="px-2 py-1 text-right text-gray-500 italic">---</td>
                                        <td className="px-2 py-1 text-right text-gray-500 italic">---</td>
                                        <td className={`px-2 py-1 text-right ${group.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {formatPnl(group.totalPnl)}
                                        </td>
                                        <td className="px-2 py-1 text-right"></td>
                                    </tr>

                                    {/* POSITIONS */}
                                    {isExpanded && group.positions.map(pos => (
                                        <tr 
                                            key={pos.id} 
                                            className="hover:bg-gray-900/30 text-gray-400 text-[11px] cursor-context-menu"
                                            onContextMenu={(e) => handleRightClick(e, pos)}
                                        >
                                            <td className="px-2 py-1 border-r border-gray-800"></td>
                                            <td className="px-2 py-1 border-r border-gray-800 flex items-center gap-2">
                                                <span className={`w-1 h-3 shrink-0 ${pos.side === 'LONG' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                <div className="flex flex-col leading-none">
                                                    <span className="text-white font-bold">{pos.symbol.replace('USDT','')}</span>
                                                    <span className="text-[9px] text-gray-600">{pos.venue.replace('_USDT','')}</span>
                                                </div>
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

                {/* CONTEXT MENU */}
                {contextMenu && (
                    <div 
                        className="fixed z-50 bg-black border border-gray-700 shadow-xl py-1 rounded w-40 text-xs text-gray-300 animate-in fade-in duration-100"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-3 py-1.5 border-b border-gray-800 font-bold text-white bg-gray-900/50">
                            {contextMenu.pos.symbol}
                        </div>
                        <button 
                            onClick={() => triggerOMS('TRADE')}
                            className="w-full text-left px-3 py-1.5 hover:bg-cyan-900/30 hover:text-cyan-400"
                        >
                            Trade...
                        </button>
                        <div className="my-1 border-t border-gray-800"></div>
                        <button 
                            onClick={() => triggerOMS('HALVE')}
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-800"
                        >
                            Halve Position
                        </button>
                        <button 
                            onClick={() => triggerOMS('FLATTEN')}
                            className="w-full text-left px-3 py-1.5 hover:bg-red-900/30 hover:text-red-400"
                        >
                            Flatten
                        </button>
                    </div>
                )}
            </div>

            {/* RIGHT: RISK & BASIS PANEL */}
            <div className="w-80 flex flex-col bg-gray-900/20 border-l border-gray-800">
                {/* Tenor Risk (Global) */}
                <div className="p-2 border-b border-gray-800">
                    <h3 className="text-cyan-500 font-bold mb-2 uppercase text-[10px] tracking-wider">Global Tenor Risk</h3>
                    <div className="space-y-2">
                        <RiskBucketRow label="SPOT / CASH" delta={allPositions.filter(p=>p.venue==='SPOT').reduce((x,y)=>x+y.notionalUsd,0)} />
                        <RiskBucketRow label="PERP (0d)" delta={allPositions.filter(p=>p.venue.includes('PERP')).reduce((x,y)=>x + (y.side==='SHORT'? -y.notionalUsd : y.notionalUsd), 0)} />
                        <RiskBucketRow label="FUTURES (<30d)" delta={0} /> 
                        <RiskBucketRow label="FUTURES (>30d)" delta={allPositions.filter(p=>p.venue.includes('FUTURE')).reduce((x,y)=>x + (y.side==='SHORT'? -y.notionalUsd : y.notionalUsd), 0)} />
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
