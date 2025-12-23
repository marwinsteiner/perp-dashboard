
import React, { useState, useEffect } from 'react';
import paperExecutionService from '../services/paperExecutionService';
import { Order } from '../types';

const OmsWidget: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
        setOrders([...paperExecutionService.getOrders().reverse()]); // Newest first
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const handleCancel = (id: string) => {
      paperExecutionService.cancelOrder(id);
      setOrders([...paperExecutionService.getOrders().reverse()]);
  };

  const activeOrders = orders.filter(o => ['NEW', 'PARTIALLY_FILLED'].includes(o.status));

  return (
    <div className="h-full flex flex-col bg-black font-mono text-[10px]">
         <div className="bg-neutral-900 border-b border-gray-800 px-3 py-1 flex justify-between items-center">
             <span className="text-gray-500 font-bold uppercase tracking-widest">Active Order Flow</span>
             <span className="text-gray-600">WORKING: {activeOrders.length}</span>
         </div>

         <div className="flex-1 overflow-auto">
             <table className="w-full text-left border-collapse">
                 <thead className="bg-neutral-900/50 text-gray-600 uppercase sticky top-0">
                     <tr>
                         <th className="px-2 py-1">Time</th>
                         <th className="px-2 py-1">ID</th>
                         <th className="px-2 py-1">Sym</th>
                         <th className="px-2 py-1">Side</th>
                         <th className="px-2 py-1 text-right">Qty</th>
                         <th className="px-2 py-1 text-right">Price</th>
                         <th className="px-2 py-1 text-right">Filled</th>
                         <th className="px-2 py-1">Status</th>
                         <th className="px-2 py-1 text-right">Action</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-900">
                     {orders.map(o => (
                         <tr key={o.id} className={`hover:bg-gray-900/30 ${o.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                             <td className="px-2 py-1 text-gray-500 whitespace-nowrap">{new Date(o.timestamp).toLocaleTimeString()}</td>
                             <td className="px-2 py-1 text-gray-600 truncate max-w-[50px]">{o.id.substring(0,6)}</td>
                             <td className="px-2 py-1 text-cyan-500 font-bold">{o.symbol}</td>
                             <td className={`px-2 py-1 font-bold ${o.side === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>{o.side}</td>
                             <td className="px-2 py-1 text-right text-gray-300">{o.qty}</td>
                             <td className="px-2 py-1 text-right text-gray-300">{o.type === 'MARKET' ? 'MKT' : o.price}</td>
                             <td className="px-2 py-1 text-right text-gray-400">{o.filledQty}</td>
                             <td className={`px-2 py-1 font-bold ${o.status === 'FILLED' ? 'text-blue-500' : o.status === 'NEW' ? 'text-yellow-500' : 'text-gray-600'}`}>
                                 {o.status}
                             </td>
                             <td className="px-2 py-1 text-right">
                                 {['NEW', 'PARTIALLY_FILLED'].includes(o.status) && (
                                     <button onClick={() => handleCancel(o.id)} className="text-red-500 hover:text-white border border-red-900 bg-red-900/20 px-1 rounded">
                                         CNCL
                                     </button>
                                 )}
                             </td>
                         </tr>
                     ))}
                     {orders.length === 0 && (
                         <tr><td colSpan={9} className="text-center py-4 text-gray-700 italic">NO ACTIVE FLOW</td></tr>
                     )}
                 </tbody>
             </table>
         </div>
    </div>
  );
};

export default OmsWidget;
