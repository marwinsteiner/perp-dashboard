
import React, { useState, useMemo } from 'react';
import { usePortfolioData } from '../hooks/usePortfolioData';

const RiskShockWidget: React.FC = () => {
  const { groups, metrics } = usePortfolioData();
  const [shockPct, setShockPct] = useState(0);

  const scenario = useMemo(() => {
    if (!groups) return [];
    return groups.map(g => {
        const deltaUsd = g.netDeltaUsd;
        // PnL impact = Notional * Shock % (approx for linear delta)
        const pnlImpact = deltaUsd * (shockPct / 100);
        return {
            asset: g.baseAsset,
            deltaUsd,
            pnlImpact
        };
    }).sort((a,b) => Math.abs(b.deltaUsd) - Math.abs(a.deltaUsd));
  }, [groups, shockPct]);

  const totalImpact = scenario.reduce((a, b) => a + b.pnlImpact, 0);
  const projEquity = (metrics?.totalEquity || 0) + totalImpact;

  return (
    <div className="h-full flex flex-col bg-black font-mono text-xs">
         <div className="bg-neutral-900 border-b border-gray-800 p-3 flex justify-between items-center">
             <span className="text-cyan-500 font-bold uppercase tracking-widest">Scenario Analysis (Linear Shock)</span>
         </div>
         
         <div className="p-4 border-b border-gray-800 bg-neutral-900/20">
             <div className="flex items-center gap-4 mb-4">
                 <span className="text-gray-500 uppercase font-bold">Market Shock:</span>
                 <input 
                    type="range" min="-50" max="50" step="1" 
                    value={shockPct} onChange={e => setShockPct(parseFloat(e.target.value))}
                    className="flex-1 accent-cyan-600 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                 />
                 <span className={`font-bold w-16 text-right ${shockPct > 0 ? 'text-green-500' : shockPct < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                     {shockPct > 0 ? '+' : ''}{shockPct}%
                 </span>
             </div>

             <div className="grid grid-cols-3 gap-4 text-center">
                 <div className="bg-black p-2 border border-gray-800">
                     <span className="text-gray-500 block text-[9px] uppercase">Current Equity</span>
                     <span className="text-white font-bold text-lg">${(metrics?.totalEquity || 0).toLocaleString()}</span>
                 </div>
                 <div className="bg-black p-2 border border-gray-800">
                     <span className="text-gray-500 block text-[9px] uppercase">Proj. PnL Impact</span>
                     <span className={`font-bold text-lg ${totalImpact >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {totalImpact >= 0 ? '+' : ''}{totalImpact.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                     </span>
                 </div>
                 <div className="bg-black p-2 border border-gray-800">
                     <span className="text-gray-500 block text-[9px] uppercase">Proj. Equity</span>
                     <span className="text-cyan-400 font-bold text-lg">${projEquity.toLocaleString()}</span>
                 </div>
             </div>
         </div>

         <div className="flex-1 overflow-auto">
             <table className="w-full text-left border-collapse">
                 <thead className="bg-neutral-900 text-gray-600 uppercase text-[9px]">
                     <tr>
                         <th className="px-3 py-2">Asset</th>
                         <th className="px-3 py-2 text-right">Net Delta ($)</th>
                         <th className="px-3 py-2 text-right">Shock PnL ($)</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-900">
                     {scenario.map(s => (
                         <tr key={s.asset} className="hover:bg-gray-900/30">
                             <td className="px-3 py-2 font-bold text-white">{s.asset}</td>
                             <td className={`px-3 py-2 text-right ${s.deltaUsd >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                                 {Math.round(s.deltaUsd).toLocaleString()}
                             </td>
                             <td className={`px-3 py-2 text-right font-bold ${s.pnlImpact >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                 {Math.round(s.pnlImpact).toLocaleString()}
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         </div>
    </div>
  );
};

export default RiskShockWidget;
