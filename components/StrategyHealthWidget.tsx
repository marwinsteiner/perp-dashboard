
import React, { useState } from 'react';
import { useStrategyAnalytics } from '../hooks/useStrategyAnalytics';
import { StrategyInstance, StrategyState, StrategyLog } from '../types';
import strategyService from '../services/strategyService';

const formatUSD = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const StateBadge = ({ state }: { state: StrategyState }) => {
  let colorClass = 'bg-gray-800 text-gray-400';
  if (state === 'RUNNING') colorClass = 'bg-green-900/50 text-green-400 border border-green-900';
  if (state === 'PAUSED') colorClass = 'bg-yellow-900/50 text-yellow-400 border border-yellow-900';
  if (state === 'DRAINING') colorClass = 'bg-blue-900/50 text-blue-400 border border-blue-900';
  if (state === 'ERROR') colorClass = 'bg-red-900/50 text-red-400 border border-red-900 animate-pulse';

  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>
      {state}
    </span>
  );
};

const StrategyRow: React.FC<{ 
    strat: StrategyInstance, 
    onControl: (id: string, action: string) => void 
}> = ({ strat, onControl }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const logs = strategyService.getLogs().filter(l => l.strategyId === strat.id).slice(-5);

  return (
    <>
      <tr 
        className={`border-b border-gray-800/50 hover:bg-gray-900/40 text-[10px] cursor-pointer ${strat.state === 'ERROR' ? 'bg-red-900/5' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <td className="px-2 py-2">
            <div className="flex items-center gap-2">
                <span className="text-gray-600 w-3">{isExpanded ? '▼' : '▶'}</span>
                <div>
                    <div className="text-white font-bold">{strat.name}</div>
                    <div className="text-[9px] text-gray-500 font-mono">{strat.id}</div>
                </div>
            </div>
        </td>
        <td className="px-2 py-2"><StateBadge state={strat.state} /></td>
        <td className="px-2 py-2">
            <div className="text-gray-400">{strat.owner}</div>
            <div className="text-[8px] text-gray-600 uppercase">{strat.desk}</div>
        </td>
        <td className="px-2 py-2 text-right font-mono font-bold text-cyan-400">{formatUSD(strat.grossNotionalUsd || 0)}</td>
        <td className={`px-2 py-2 text-right font-mono ${(strat.netNotionalUsd || 0) >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            {formatUSD(strat.netNotionalUsd || 0)}
        </td>
        <td className="px-2 py-2">
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[9px]">
                    <span className="text-gray-600">DAY PnL</span>
                    <span className={strat.pnlDay >= 0 ? 'text-green-500' : 'text-red-500'}>{formatUSD(strat.pnlDay)}</span>
                </div>
                <div className="flex justify-between items-center text-[9px]">
                    <span className="text-gray-600">HIT RT</span>
                    <span className="text-gray-300">{strat.hitRate}%</span>
                </div>
            </div>
        </td>
        <td className="px-2 py-2">
             <div className="flex flex-col gap-0.5">
                <div className={`text-[9px] ${strat.rejectRate > 0.5 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                    REJ: {strat.rejectRate.toFixed(2)}%
                </div>
                <div className={`text-[9px] ${strat.lastTickAgeMs > 500 ? 'text-yellow-500' : 'text-gray-400'}`}>
                    LAT: {strat.lastTickAgeMs}ms
                </div>
             </div>
        </td>
        <td className="px-2 py-2 text-right" onClick={e => e.stopPropagation()}>
            <div className="flex gap-1 justify-end">
                <button 
                    onClick={() => onControl(strat.id, 'PAUSE')}
                    className="px-1.5 py-0.5 bg-gray-800 hover:bg-yellow-600 hover:text-black text-gray-500 rounded text-[9px] font-bold"
                    title="Stop new entries"
                >||</button>
                <button 
                    onClick={() => onControl(strat.id, 'DRAIN')}
                    className="px-1.5 py-0.5 bg-gray-800 hover:bg-blue-600 hover:text-black text-gray-500 rounded text-[9px] font-bold"
                    title="Exit all positions"
                >DRAIN</button>
                <button 
                    onClick={() => onControl(strat.id, 'KILL')}
                    className="px-1.5 py-0.5 bg-gray-800 hover:bg-red-600 hover:text-black text-red-900 rounded text-[9px] font-bold"
                    title="Hard Kill"
                >KILL</button>
            </div>
        </td>
      </tr>
      {isExpanded && (
          <tr className="bg-neutral-900/30 border-b border-gray-800">
              <td colSpan={8} className="px-10 py-4">
                  <div className="grid grid-cols-3 gap-8">
                      <div>
                          <h4 className="text-[9px] text-gray-600 uppercase mb-2 border-b border-gray-800 pb-1">Performance Details</h4>
                          <div className="space-y-1 text-[10px]">
                              <div className="flex justify-between"><span className="text-gray-500">Sharpe Ratio</span><span className="text-white font-mono">{strat.sharpeRatio.toFixed(2)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Profit Factor</span><span className="text-white font-mono">{strat.profitFactor.toFixed(2)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Avg Trade Size</span><span className="text-white font-mono">{formatUSD(strat.avgTradeSizeUsd)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">PnL (MTD)</span><span className={`font-mono ${strat.pnlMtd >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatUSD(strat.pnlMtd)}</span></div>
                          </div>
                      </div>
                      <div>
                          <h4 className="text-[9px] text-gray-600 uppercase mb-2 border-b border-gray-800 pb-1">Operational Metrics</h4>
                          <div className="space-y-1 text-[10px]">
                              <div className="flex justify-between"><span className="text-gray-500">Avg Slippage</span><span className="text-white font-mono">{strat.avgSlippageBps} bps</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Median Fill</span><span className="text-white font-mono">{strat.medianTimeToFillMs} ms</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Instruments</span><span className="text-cyan-600 font-mono truncate max-w-[120px]">{strat.instruments.join(', ')}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Venues</span><span className="text-gray-400 font-mono text-[8px]">{strat.venues.join(' | ')}</span></div>
                          </div>
                      </div>
                      <div>
                          <h4 className="text-[9px] text-gray-600 uppercase mb-2 border-b border-gray-800 pb-1">Instance Audit Trail</h4>
                          <div className="space-y-2 max-h-24 overflow-auto">
                              {logs.length === 0 && <div className="text-gray-700 text-[9px] italic">No recent log entries</div>}
                              {logs.map((log, i) => (
                                  <div key={i} className="text-[8px] text-gray-500">
                                      <span className="text-gray-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.action} by {log.user}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  
                  {/* Flags */}
                  {strat.riskFlags.length > 0 && (
                      <div className="mt-4 flex gap-2">
                          {strat.riskFlags.map(f => (
                              <span key={f} className="bg-red-900/20 text-red-500 border border-red-900/50 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter">
                                  🚩 {f.replace(/_/g, ' ')}
                              </span>
                          ))}
                      </div>
                  )}
              </td>
          </tr>
      )}
    </>
  );
};

const StrategyHealthWidget: React.FC = () => {
  const { instances, loading } = useStrategyAnalytics();
  const [filter, setFilter] = useState<string>('ALL');
  const [showControlStrip, setShowControlStrip] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ id: string, action: string } | null>(null);
  const [reason, setReason] = useState('');

  const filtered = instances.filter(s => filter === 'ALL' || s.state === filter || (filter === 'ERROR' && s.riskFlags.length > 0));

  const handleAction = () => {
      if (!confirmModal) return;
      const { id, action } = confirmModal;
      
      let newState: StrategyState = 'RUNNING';
      if (action === 'PAUSE') newState = 'PAUSED';
      else if (action === 'DRAIN') newState = 'DRAINING';
      else if (action === 'KILL') newState = 'ERROR';

      strategyService.updateState(id, newState, 'ADMIN_X', reason || 'UI_COMMAND');
      setConfirmModal(null);
      setReason('');
  };

  if (loading) return <div className="h-full flex items-center justify-center text-cyan-500 font-mono animate-pulse uppercase">Connecting to Strategy Engine...</div>;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* HEADER */}
      <div className="bg-neutral-900 border-b-2 border-cyan-800 p-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-900 text-black px-2 py-0.5 font-bold text-[10px]">STRAT</div>
          <h2 className="text-white text-xs font-bold tracking-tighter uppercase">Strategy Control & Health v1.0</h2>
        </div>
        <div className="flex gap-4 items-center">
            <div className="flex gap-2">
                {['ALL', 'RUNNING', 'PAUSED', 'ERROR'].map(f => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`text-[9px] px-2 py-0.5 font-bold border rounded-sm ${filter === f ? 'bg-cyan-900 text-cyan-100 border-cyan-600' : 'text-gray-500 border-gray-800 hover:border-gray-600'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>
            <div className="h-4 w-px bg-gray-800"></div>
            <button 
                onClick={() => setShowControlStrip(!showControlStrip)}
                className={`text-[9px] px-2 py-1 font-bold border ${showControlStrip ? 'bg-amber-600 text-black border-amber-600' : 'text-amber-500 border-amber-900 hover:border-amber-600'}`}
            >
                {showControlStrip ? 'HIDE GLOBAL TARGETS' : 'GLOBAL RISK TARGETS'}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-neutral-900/80 sticky top-0 z-10 text-[9px] uppercase text-gray-500 border-b border-gray-800">
              <tr>
                <th className="px-2 py-2 w-1/4">Strategy Name / ID</th>
                <th className="px-2 py-2 w-24">State</th>
                <th className="px-2 py-2">Owner</th>
                <th className="px-2 py-2 text-right">Gross USD</th>
                <th className="px-2 py-2 text-right">Net USD</th>
                <th className="px-2 py-2">Snapshot Stats</th>
                <th className="px-2 py-2">Health</th>
                <th className="px-2 py-2 text-right w-24">Controls</th>
              </tr>
            </thead>
            <tbody>
                {filtered.map(strat => (
                    <StrategyRow 
                        key={strat.id} 
                        strat={strat} 
                        onControl={(id, action) => setConfirmModal({ id, action })} 
                    />
                ))}
            </tbody>
          </table>
      </div>

      {/* FOOTER STATUS */}
      <div className="bg-neutral-900 border-t border-gray-800 p-1 flex justify-between items-center px-4 shrink-0 h-6 text-[8px] text-gray-600">
          <div className="flex gap-4">
              <span>ACTIVE INSTANCES: <span className="text-white">{instances.filter(i => i.state === 'RUNNING').length}</span></span>
              <span>TOTAL GROSS: <span className="text-cyan-500 font-bold">{formatUSD(instances.reduce((acc, i) => acc + (i.grossNotionalUsd || 0), 0))}</span></span>
          </div>
          <div>AUTH_ID: ADMIN_X | AUTH_SESSION_V: 0x93FF | MONITOR_FREQ: 100ms</div>
      </div>

      {/* CONFIRMATION OVERLAY */}
      {confirmModal && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-neutral-900 border-2 border-amber-600 w-full max-w-sm p-6 shadow-2xl">
                  <h3 className="text-amber-500 font-bold text-xs uppercase mb-4 tracking-widest">
                      Confirm Authority Action
                  </h3>
                  <div className="text-gray-300 text-[10px] mb-6 space-y-2">
                      <p>Target Strategy: <span className="text-white font-bold">{confirmModal.id}</span></p>
                      <p>Action: <span className="text-red-500 font-bold">{confirmModal.action}</span></p>
                      <p className="bg-black/50 p-2 border border-gray-800 italic text-gray-500">
                          {confirmModal.action === 'KILL' 
                            ? "CRITICAL: Hard kill will attempt to flatten all positions immediately at market. This may incur substantial slippage."
                            : "WARNING: This change will propagate to the systematic execution engine immediately."}
                      </p>
                  </div>
                  
                  <div className="mb-6">
                      <label className="block text-[8px] text-gray-600 uppercase mb-1">Reason for override</label>
                      <input 
                        type="text" 
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Manual halt per risk desk..."
                        className="w-full bg-black border border-gray-800 px-2 py-1 text-xs text-white outline-none focus:border-amber-600 font-mono"
                      />
                  </div>

                  <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => setConfirmModal(null)}
                        className="px-4 py-1 text-xs font-bold text-gray-500 hover:text-white"
                      >CANCEL</button>
                      <button 
                        onClick={handleAction}
                        className="px-4 py-1 bg-amber-600 text-black font-bold text-xs hover:bg-amber-500"
                      >EXECUTE OVERRIDE</button>
                  </div>
              </div>
          </div>
      )}

      {/* GLOBAL CONTROL STRIP */}
      {showControlStrip && (
          <div className="bg-neutral-900 border-t border-amber-600 p-4 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between mb-2">
                  <h3 className="text-amber-500 font-bold text-xs uppercase">Global Desk Risk Targets</h3>
              </div>
              <div className="grid grid-cols-4 gap-4">
                   <div className="space-y-1">
                       <label className="text-[8px] text-gray-600 uppercase">Max Gross Desk ($)</label>
                       <input className="w-full bg-black border border-gray-800 text-amber-500 px-2 py-1 text-xs font-mono" defaultValue="50000000" />
                   </div>
                   <div className="space-y-1">
                       <label className="text-[8px] text-gray-600 uppercase">Global Stop Loss (Day)</label>
                       <input className="w-full bg-black border border-gray-800 text-red-500 px-2 py-1 text-xs font-mono" defaultValue="-250000" />
                   </div>
                   <div className="space-y-1">
                       <label className="text-[8px] text-gray-600 uppercase">Circuit Breaker (bps/10s)</label>
                       <input className="w-full bg-black border border-gray-800 text-amber-500 px-2 py-1 text-xs font-mono" defaultValue="200" />
                   </div>
                   <div className="flex items-end">
                        <button className="w-full py-1 bg-amber-900/50 border border-amber-600 text-amber-500 text-[9px] font-bold uppercase hover:bg-amber-600 hover:text-black transition-all">Update Global Params</button>
                   </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StrategyHealthWidget;
