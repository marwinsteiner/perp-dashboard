
import React, { useState } from 'react';
import { useRiskAnalytics } from '../hooks/useRiskAnalytics';
import { RiskNode, RiskOverrideLog } from '../types';
import riskConfigService from '../services/riskConfigService';

const formatUSD = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const UtilizationBar = ({ value }: { value: number }) => {
  const pct = Math.min(100, value * 100);
  let colorClass = 'bg-green-500';
  if (pct >= 90) colorClass = 'bg-red-500 animate-pulse';
  else if (pct >= 70) colorClass = 'bg-yellow-500';

  return (
    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden flex items-center">
      <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const TrafficLight = ({ value }: { value: number }) => {
  if (value >= 0.9) return <span className="text-red-500">●</span>;
  if (value >= 0.7) return <span className="text-yellow-500">●</span>;
  return <span className="text-green-500">●</span>;
};

const RiskRow: React.FC<{ node: RiskNode, depth: number }> = ({ node, depth }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      <tr className={`border-b border-gray-800/50 hover:bg-gray-900/40 text-[10px] font-mono ${node.isBreached ? 'bg-red-900/10' : ''}`}>
        <td className="px-2 py-1.5 whitespace-nowrap" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-500 w-3">
                {isExpanded ? '▼' : '▶'}
              </button>
            ) : <span className="w-3"></span>}
            <span className={`
              ${node.type === 'DESK' ? 'text-cyan-400 font-bold' : ''}
              ${node.type === 'STRATEGY' ? 'text-white font-bold' : ''}
              ${node.type === 'TRADER' ? 'text-amber-500' : ''}
              ${node.type === 'SYMBOL' ? 'text-gray-300' : ''}
              ${node.type === 'VENUE' ? 'text-gray-500 italic' : ''}
            `}>
              {node.name}
            </span>
            {node.isBlocked && <span className="bg-red-600 text-[8px] text-white px-1 rounded font-bold">BLOCKED</span>}
          </div>
        </td>
        <td className="px-2 py-1.5 text-right font-bold">{formatUSD(node.grossExposureUsd)}</td>
        <td className={`px-2 py-1.5 text-right ${node.netExposureUsd >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
          {formatUSD(node.netExposureUsd)}
        </td>
        <td className="px-2 py-1.5 text-right text-gray-400">{formatUSD(node.limitUsd)}</td>
        <td className="px-4 py-1.5 min-w-[120px]">
          <div className="flex items-center gap-2">
            <div className="flex-1"><UtilizationBar value={node.utilization} /></div>
            <span className={`w-8 text-right font-bold ${node.utilization > 0.9 ? 'text-red-500' : 'text-gray-500'}`}>
              {(node.utilization * 100).toFixed(0)}%
            </span>
            <TrafficLight value={node.utilization} />
          </div>
        </td>
        <td className="px-2 py-1.5 text-right">
           {node.isBreached ? <span className="text-red-500 font-bold animate-pulse">BREACH</span> : <span className="text-green-800">OK</span>}
        </td>
      </tr>
      {hasChildren && isExpanded && node.children!.map(child => (
        <RiskRow key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
};

const RiskLimitsWidget: React.FC = () => {
  const { nodes, loading } = useRiskAnalytics();
  const [filterBreached, setFilterBreached] = useState(false);
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [logs, setLogs] = useState<RiskOverrideLog[]>(riskConfigService.getLogs());

  // Override Form State
  const [targetEntity, setTargetEntity] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [reason, setReason] = useState('');

  const handleOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEntity || !newLimit) return;
    riskConfigService.updateLimit(targetEntity, parseFloat(newLimit), 'RISK_MGR_01', reason);
    setLogs([...riskConfigService.getLogs()]);
    setTargetEntity('');
    setNewLimit('');
    setReason('');
    setShowOverridePanel(false);
  };

  if (loading) return <div className="h-full flex items-center justify-center text-cyan-500 font-mono animate-pulse">INITIALIZING MARS ENGINE...</div>;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* HEADER STRIP */}
      <div className="bg-neutral-900 border-b-2 border-amber-600/50 p-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-amber-600 text-black px-2 py-0.5 font-bold text-[10px]">MARS</div>
          <h2 className="text-white text-xs font-bold tracking-tighter uppercase">Multi-Asset Risk System v3.1</h2>
        </div>
        <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="breach-filter" 
                    checked={filterBreached} 
                    onChange={e => setFilterBreached(e.target.checked)}
                    className="accent-amber-600"
                />
                <label htmlFor="breach-filter" className="text-[10px] text-gray-500 uppercase cursor-pointer">Show Only Breached</label>
            </div>
            <button 
                onClick={() => setShowOverridePanel(!showOverridePanel)}
                className={`text-[10px] px-2 py-1 font-bold border ${showOverridePanel ? 'bg-amber-600 text-black border-amber-600' : 'text-amber-500 border-amber-900 hover:border-amber-600'}`}
            >
                {showOverridePanel ? 'HIDE CONTROL STRIP' : 'AUTH CONTROL STRIP'}
            </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* MAIN GRID */}
        <div className="flex-1 overflow-auto bg-black/50">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-neutral-900/80 sticky top-0 z-10 text-[9px] uppercase text-gray-500 border-b border-gray-800">
              <tr>
                <th className="px-2 py-2 w-1/4">Entity Hierarchy</th>
                <th className="px-2 py-2 text-right">Gross (USD)</th>
                <th className="px-2 py-2 text-right">Net (USD)</th>
                <th className="px-2 py-2 text-right">Limit (USD)</th>
                <th className="px-2 py-2 text-center">Utilization</th>
                <th className="px-2 py-2 text-right w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map(node => <RiskRow key={node.id} node={node} depth={0} />)}
            </tbody>
          </table>
        </div>

        {/* SIDE BAR: STATUS & LOGS */}
        <div className="w-80 border-l border-gray-800 flex flex-col bg-neutral-900/30">
            {/* Audit Logs */}
            <div className="p-3 border-b border-gray-800 flex-1 overflow-auto">
                <h3 className="text-amber-600 font-bold text-[10px] uppercase mb-2">Audit Logs</h3>
                <div className="space-y-3">
                    {logs.length === 0 && <div className="text-gray-700 text-[9px]">NO RECENT LIMIT ADJUSTMENTS</div>}
                    {logs.slice().reverse().map((log, i) => (
                        <div key={i} className="text-[9px] border-l border-amber-900 pl-2">
                            <div className="flex justify-between text-gray-500">
                                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                <span className="text-white font-bold">{log.user}</span>
                            </div>
                            <div className="text-gray-300 mt-0.5">
                                Set <span className="text-cyan-400 font-bold">{log.entityId}</span> to <span className="text-white">{formatUSD(log.newLimit)}</span>
                            </div>
                            <div className="text-gray-600 italic">"{log.reason}"</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Active Constraints */}
            <div className="p-3 bg-red-900/5">
                <h3 className="text-red-600 font-bold text-[10px] uppercase mb-2">Hard Constraints</h3>
                <div className="space-y-1">
                    {riskConfigService.getBlocks().map(block => (
                        <div key={block} className="flex items-center gap-2 text-[9px] text-red-400 bg-red-900/20 px-2 py-1 border border-red-900/30">
                            <span className="animate-pulse font-bold">!</span>
                            <span>{block.replace('_', ' ')}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* OVERRIDE OVERLAY */}
      {showOverridePanel && (
          <div className="bg-neutral-900 border-t border-amber-600 p-4 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-amber-500 font-bold text-xs uppercase">Authorized Limit Adjustment Strip</h3>
                  <div className="text-[9px] text-gray-500">AUTH_TOKEN: RISK_MGR_01 (VALID)</div>
              </div>
              <form onSubmit={handleOverride} className="flex gap-4 items-end">
                  <div className="flex-1">
                      <label className="block text-[8px] text-gray-600 uppercase mb-1">Entity ID (Trader/Strat/Desk)</label>
                      <input 
                        type="text" 
                        value={targetEntity}
                        onChange={e => setTargetEntity(e.target.value.toUpperCase())}
                        className="w-full bg-black border border-gray-800 text-amber-500 font-mono text-xs px-2 py-1 focus:border-amber-600 outline-none"
                        placeholder="E.G. MAIN_DESK"
                      />
                  </div>
                  <div className="w-48">
                      <label className="block text-[8px] text-gray-600 uppercase mb-1">New Limit Notional ($)</label>
                      <input 
                        type="number" 
                        value={newLimit}
                        onChange={e => setNewLimit(e.target.value)}
                        className="w-full bg-black border border-gray-800 text-amber-500 font-mono text-xs px-2 py-1 focus:border-amber-600 outline-none"
                        placeholder="10000000"
                      />
                  </div>
                  <div className="flex-1">
                      <label className="block text-[8px] text-gray-600 uppercase mb-1">Reason for Override</label>
                      <input 
                        type="text" 
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className="w-full bg-black border border-gray-800 text-gray-400 font-mono text-xs px-2 py-1 focus:border-amber-600 outline-none italic"
                        placeholder="Intraday delta hedging extension..."
                      />
                  </div>
                  <button type="submit" className="bg-amber-600 text-black font-bold px-6 py-1 text-xs hover:bg-amber-500 transition-colors">
                      APPLY OVERRIDE
                  </button>
              </form>
          </div>
      )}
    </div>
  );
};

export default RiskLimitsWidget;
