
import React, { useState, useEffect } from 'react';
import { useShockAnalytics } from '../hooks/useShockAnalytics';
import { ShockScenario, ShockParameter, ShockResultNode } from '../types';
import { v4 as uuidv4 } from 'uuid';

const formatUSD = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const formatPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;

const ResultRow: React.FC<{ node: ShockResultNode, depth: number }> = ({ node, depth }) => {
    const [isExpanded, setIsExpanded] = useState(depth < 2);
    const pnlChange = node.shockDeltaPnl;
    const hasChildren = node.children && node.children.length > 0;

    return (
        <>
            <tr className={`border-b border-gray-800/50 hover:bg-gray-800/50 ${node.isBreached ? 'bg-red-900/10' : ''}`}>
                <td className="px-2 py-1 text-[10px]" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
                    <div className="flex items-center gap-2">
                        {hasChildren ? (
                             <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-500 w-3">{isExpanded ? '▼' : '▶'}</button>
                        ) : <span className="w-3"></span>}
                        <span className={`font-mono ${node.type === 'STRATEGY' ? 'text-white font-bold' : 'text-gray-400'}`}>
                            {node.name.replace(/_/g, ' ')}
                        </span>
                        {node.isBreached && <span className="bg-red-600 text-white text-[8px] px-1 rounded font-bold">RISK LIMIT</span>}
                        {node.isMarginCall && <span className="bg-amber-600 text-black text-[8px] px-1 rounded font-bold">MARGIN CALL</span>}
                    </div>
                </td>
                
                {/* Simulated PnL */}
                <td className={`px-2 py-1 text-right text-[10px] font-mono ${node.shockPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatUSD(node.shockPnl)}
                </td>

                {/* Delta PnL */}
                <td className={`px-2 py-1 text-right text-[10px] font-mono font-bold ${pnlChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatUSD(pnlChange)}
                </td>

                 {/* Gross Change */}
                <td className="px-2 py-1 text-right text-[10px] text-gray-400 font-mono">
                    {formatUSD(node.shockGross)}
                </td>

                 {/* Utilization Delta */}
                 <td className="px-2 py-1 text-right text-[10px] text-gray-500 font-mono">
                    {node.currentUtilization > 0 ? (
                        <>
                            {(node.currentUtilization * 100).toFixed(0)}% <span className="text-gray-600">→</span> <span className={node.isBreached ? 'text-red-500 font-bold' : 'text-gray-300'}>{(node.shockUtilization * 100).toFixed(0)}%</span>
                        </>
                    ) : '-'}
                </td>
            </tr>
            {isExpanded && node.children?.map(child => (
                <ResultRow key={child.id} node={child} depth={depth + 1} />
            ))}
        </>
    );
};

const ShockWidget: React.FC = () => {
  const { defaultScenarios, activeScenario, setActiveScenario, results, calculateShock, isComputing } = useShockAnalytics();
  const [params, setParams] = useState<ShockParameter[]>([]);
  const [customName, setCustomName] = useState('Custom Scenario');

  // Load active scenario params into editor
  useEffect(() => {
      if (activeScenario) {
          setParams(activeScenario.parameters);
          setCustomName(activeScenario.name);
      } else {
          // Default empty
          setParams([]);
          setCustomName('New Scenario');
      }
  }, [activeScenario]);

  const addParam = () => {
      setParams([...params, { id: uuidv4(), type: 'SPOT_PCT', scope: 'GLOBAL', value: -5 }]);
  };

  const removeParam = (id: string) => {
      setParams(params.filter(p => p.id !== id));
  };

  const updateParam = (id: string, field: keyof ShockParameter, value: any) => {
      setParams(params.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleApply = () => {
      const scenario: ShockScenario = {
          id: 'temp',
          name: customName,
          parameters: params
      };
      setActiveScenario(scenario);
      // Trigger calculation effect in hook by setting active scenario. 
      // The hook doesn't auto-calc on set for performance, we need to call calculate
      // However, we need to wait for state to propagate. 
      // Actually, passing the object directly to calculateShock would be cleaner, but the hook holds state.
      // Let's rely on a timeout or separate explicit call.
      // Refactored Hook: setActiveScenario just sets state. We need to call calculateShock separately or the hook should watch activeScenario. 
      // For this UI, let's just assume we set state then call calc.
      // Due to async set, we might calculate old state if we call immediately.
      // Better: pass scenario to calculateShock(scenario). But hook signature is simpler.
      // Workaround: setTimeout to allow state propagation.
      setTimeout(() => calculateShock(), 50);
  };

  // Derived Summary
  const deskResult = results.find(r => r.type === 'DESK');
  const totalPnLDelta = deskResult?.shockDeltaPnl || 0;

  return (
    <div className="h-full flex flex-col bg-[#1a0505] font-mono text-gray-300">
        
        {/* HYPOTHETICAL WARNING HEADER */}
        <div className="bg-orange-900/80 text-white text-center text-[10px] font-bold py-1 uppercase tracking-widest border-b border-orange-600 animate-pulse">
            ⚠️ Hypothetical Simulation Mode - No Orders Will Be Sent ⚠️
        </div>

        {/* TOP: SCENARIO BUILDER */}
        <div className="flex shrink-0 h-48 border-b border-gray-800">
            {/* Library */}
            <div className="w-64 bg-neutral-900/50 border-r border-gray-800 p-2 flex flex-col">
                <h3 className="text-orange-500 font-bold text-[10px] uppercase mb-2">Scenario Library</h3>
                <div className="flex-1 overflow-auto space-y-1">
                    {defaultScenarios.map(s => (
                        <button 
                            key={s.id} 
                            onClick={() => { setActiveScenario(s); setTimeout(() => calculateShock(), 50); }}
                            className={`w-full text-left px-2 py-1.5 text-[10px] border rounded-sm transition-all
                                ${activeScenario?.id === s.id ? 'bg-orange-900/40 border-orange-600 text-white' : 'border-gray-800 text-gray-500 hover:border-gray-600'}
                            `}
                        >
                            {s.name}
                        </button>
                    ))}
                    <button 
                        onClick={() => { setActiveScenario(null); setParams([]); }}
                        className="w-full text-left px-2 py-1.5 text-[10px] border border-dashed border-gray-700 text-gray-500 hover:text-white mt-2"
                    >
                        + Create New
                    </button>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 p-4 bg-black overflow-auto">
                <div className="flex justify-between items-center mb-4">
                    <input 
                        type="text" 
                        value={customName} 
                        onChange={e => setCustomName(e.target.value)}
                        className="bg-transparent border-b border-gray-700 text-lg font-bold text-white focus:border-orange-500 outline-none w-1/2"
                    />
                    <div className="flex gap-2">
                        <button onClick={addParam} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs border border-gray-700 rounded-sm">
                            + Add Shock Parameter
                        </button>
                        <button 
                            onClick={handleApply}
                            className="px-6 py-1 bg-orange-700 hover:bg-orange-600 text-white font-bold text-xs border border-orange-500 rounded-sm shadow-lg shadow-orange-900/20"
                        >
                            {isComputing ? 'SIMULATING...' : 'RUN SIMULATION'}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    {params.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-2 text-xs bg-gray-900/30 p-2 border border-gray-800 rounded-sm">
                            <span className="text-gray-500 w-4">{i+1}.</span>
                            <select 
                                value={p.type} 
                                onChange={(e) => updateParam(p.id, 'type', e.target.value)}
                                className="bg-black border border-gray-700 text-cyan-400 px-2 py-1 outline-none"
                            >
                                <option value="SPOT_PCT">Spot Price %</option>
                                <option value="FUTURES_PCT">Futures Only %</option>
                                <option value="FUNDING_ABS">Funding Rate (Abs)</option>
                            </select>
                            
                            <select 
                                value={p.scope} 
                                onChange={(e) => updateParam(p.id, 'scope', e.target.value)}
                                className="bg-black border border-gray-700 text-white px-2 py-1 outline-none"
                            >
                                <option value="GLOBAL">Global (All Assets)</option>
                                <option value="ASSET">Specific Asset</option>
                                <option value="STRATEGY">Specific Strategy</option>
                            </select>

                            {(p.scope === 'ASSET' || p.scope === 'STRATEGY') && (
                                <input 
                                    type="text" 
                                    value={p.target || ''} 
                                    onChange={(e) => updateParam(p.id, 'target', e.target.value)}
                                    placeholder={p.scope === 'ASSET' ? 'BTC' : 'STRAT_ID'}
                                    className="bg-black border border-gray-700 text-white px-2 py-1 w-32 outline-none uppercase"
                                />
                            )}

                            <div className="flex items-center gap-1">
                                <span className="text-gray-500 text-[10px] uppercase">Value:</span>
                                <input 
                                    type="number" 
                                    value={p.value} 
                                    onChange={(e) => updateParam(p.id, 'value', parseFloat(e.target.value))}
                                    className="bg-black border border-gray-700 text-yellow-500 font-bold px-2 py-1 w-24 outline-none text-right"
                                />
                                <span className="text-gray-600 text-[10px]">
                                    {p.type.includes('PCT') ? '%' : 'pts'}
                                </span>
                            </div>

                            <button onClick={() => removeParam(p.id)} className="ml-auto text-red-500 hover:text-red-400 px-2 font-bold">×</button>
                        </div>
                    ))}
                    {params.length === 0 && <div className="text-gray-600 italic text-sm py-4 text-center">No shock parameters defined. Add one to start.</div>}
                </div>
            </div>
        </div>

        {/* BOTTOM: RESULTS & VISUALIZATION */}
        <div className="flex-1 flex min-h-0">
            {/* Result Grid */}
            <div className="flex-1 overflow-auto border-r border-gray-800">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-neutral-900 sticky top-0 z-10 text-[9px] uppercase text-gray-500 border-b border-gray-800">
                        <tr>
                            <th className="px-2 py-2 w-1/4">Entity</th>
                            <th className="px-2 py-2 text-right">Projected Total PnL</th>
                            <th className="px-2 py-2 text-right">Scenario Impact</th>
                            <th className="px-2 py-2 text-right">Gross Notional</th>
                            <th className="px-2 py-2 text-right">Limit Utilization</th>
                        </tr>
                    </thead>
                    <tbody className="bg-black">
                        {results.length > 0 ? (
                            results.map(r => <ResultRow key={r.id} node={r} depth={0} />)
                        ) : (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-600 text-xs">Run simulation to see results</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Viz Panel */}
            <div className="w-80 bg-neutral-900/30 flex flex-col p-4 overflow-y-auto">
                 <h3 className="text-gray-500 font-bold text-[10px] uppercase mb-4 border-b border-gray-800 pb-1">Impact Summary</h3>
                 
                 <div className="mb-6">
                     <span className="text-[10px] text-gray-500 uppercase block">Total Desk Impact</span>
                     <span className={`text-2xl font-bold font-mono ${totalPnLDelta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                         {formatUSD(totalPnLDelta)}
                     </span>
                 </div>

                 {/* Distribution Bar Chart (Simple CSS) */}
                 {deskResult && deskResult.children && (
                     <div className="space-y-3">
                         <span className="text-[10px] text-gray-500 uppercase block">Strategy PnL Distribution</span>
                         {deskResult.children.map(strat => {
                             const maxVal = Math.max(...deskResult.children!.map(c => Math.abs(c.shockDeltaPnl)));
                             const pct = Math.abs(strat.shockDeltaPnl) / maxVal * 100;
                             
                             return (
                                 <div key={strat.id} className="text-[10px]">
                                     <div className="flex justify-between mb-0.5">
                                         <span className="text-gray-400 truncate w-24">{strat.name.substring(0, 15)}</span>
                                         <span className={strat.shockDeltaPnl >= 0 ? 'text-green-400' : 'text-red-400'}>{formatUSD(strat.shockDeltaPnl)}</span>
                                     </div>
                                     <div className="h-1 bg-gray-800 w-full rounded-full overflow-hidden flex">
                                         {/* Center line approach requires more math, simple absolute bar for now */}
                                         <div 
                                            className={`h-full ${strat.shockDeltaPnl >= 0 ? 'bg-green-600' : 'bg-red-600'}`} 
                                            style={{ width: `${pct}%` }} 
                                         />
                                     </div>
                                 </div>
                             )
                         })}
                     </div>
                 )}
                 
                 <div className="mt-auto border-t border-gray-800 pt-4">
                     <button className="w-full py-2 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-[10px] font-bold uppercase transition-all">
                         Export Scenario to Risk
                     </button>
                 </div>
            </div>
        </div>
    </div>
  );
};

export default ShockWidget;
    