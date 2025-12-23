import React, { useState, useEffect } from 'react';
import paperExecutionService from '../services/paperExecutionService';
import { Trade } from '../types';

const BlotterWidget: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
        setTrades([...paperExecutionService.getTrades().reverse()]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full flex flex-col bg-black font-mono text-[10px]">
         <div className="bg-neutral-900 border-b border-gray-800 px-3 py-1 flex justify-between items-center">
             <span className="text-gray-500 font-bold uppercase tracking-widest">Execution Blotter</span>
             <span className="text-gray-600">COUNT: {trades.length}</span>
         </div>

         <div className="flex-1 overflow-auto">
             <table className="w-full text-left border-collapse">
                 <thead className="bg-neutral-900/50 text-gray-600 uppercase sticky top-0">
                     <tr>
                         <th className="px-2 py-1">Time</th>
                         <th className="px-2 py-1">ID</th>
                         <th className="px-2 py-1">Sym</th>
                         <th className="px-2 py-1">Venue</th>
                         <th className="px-2 py-1">Side</th>
                         <th className="px-2 py-1 text-right">Qty</th>
                         <th className="px-2 py-1 text-right">Price</th>
                         <th className="px-2 py-1 text-right">Notional</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-900">
                     {trades.map(t => (
                         <tr key={t.id} className="hover:bg-gray-900/30">
                             <td className="px-2 py-1 text-gray-500 whitespace-nowrap">{new Date(t.time).toLocaleTimeString()}</td>
                             {/* Fix: Ensure t.id is cast to string before calling substring as it can be string | number */}
                             <td className="px-2 py-1 text-gray-600 truncate max-w-[50px]">{String(t.id).substring(0,6)}</td>
                             <td className="px-2 py-1 text-white font-bold">{t.symbol}</td>
                             <td className="px-2 py-1 text-gray-500">{t.venue}</td>
                             <td className={`px-2 py-1 font-bold ${!t.isBuyerMaker ? 'text-green-500' : 'text-red-500'}`}>
                                 {!t.isBuyerMaker ? 'BUY' : 'SELL'}
                             </td>
                             <td className="px-2 py-1 text-right text-gray-300">{t.qty.toFixed(4)}</td>
                             <td className="px-2 py-1 text-right text-yellow-500">{t.price.toFixed(2)}</td>
                             <td className="px-2 py-1 text-right text-gray-400">{(t.price * t.qty).toLocaleString()}</td>
                         </tr>
                     ))}
                     {trades.length === 0 && (
                         <tr><td colSpan={8} className="text-center py-4 text-gray-700 italic">NO EXECUTIONS</td></tr>
                     )}
                 </tbody>
             </table>
         </div>
    </div>
  );
};

export default BlotterWidget;