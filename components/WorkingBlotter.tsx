
import React, { useState, useEffect } from 'react';
import paperExecutionService from '../services/paperExecutionService';
import { FlowOrder } from '../types';

interface WorkingBlotterProps {
    onPopOut?: () => void;
    isPoppedOut?: boolean;
}

const WorkingBlotter: React.FC<WorkingBlotterProps> = ({ onPopOut, isPoppedOut }) => {
    const [activeOrders, setActiveOrders] = useState<FlowOrder[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        // Polling active orders
        const update = () => setActiveOrders([...paperExecutionService.getActiveOrders()]);
        update(); // Initial
        const interval = setInterval(update, 500);
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    const handleCancel = (id: string) => {
        paperExecutionService.cancelOrder(id);
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full bg-[#0a0a0a]">
            <div className="bg-neutral-900 border-b border-gray-800 p-2 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-500 uppercase text-[10px]">Working Blotter</span>
                    <span className="bg-gray-800 text-gray-300 px-1.5 rounded text-[9px]">{activeOrders.length}</span>
                </div>
                {onPopOut && !isPoppedOut && (
                    <button onClick={onPopOut} className="text-[9px] text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-2 rounded-sm uppercase">
                        Pop Out ⇱
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-auto bg-[#050505]">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-neutral-900 z-10 text-[9px] uppercase text-gray-500 border-b border-gray-800">
                        <tr>
                            <th className="px-2 py-2">Time</th>
                            <th className="px-2 py-2">Symbol</th>
                            <th className="px-2 py-2 text-center">Side</th>
                            <th className="px-2 py-2 text-right">Qty</th>
                            <th className="px-2 py-2 text-right">Limit</th>
                            <th className="px-2 py-2">Strat</th>
                            <th className="px-2 py-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px]">
                        {activeOrders.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-gray-600 italic">No working orders</td>
                            </tr>
                        )}
                        {activeOrders.map(order => (
                            <tr key={order.id} className="border-b border-gray-800/50 hover:bg-gray-900">
                                <td className="px-2 py-1.5 text-gray-500">{new Date(order.timestamp).toLocaleTimeString()}</td>
                                <td className="px-2 py-1.5 font-bold text-cyan-500">{order.symbol}</td>
                                <td className={`px-2 py-1.5 text-center font-bold ${order.side === 'BUY' ? 'text-green-500' : 'text-red-500'}`}>
                                    {order.side}
                                </td>
                                <td className="px-2 py-1.5 text-right font-mono text-gray-300">{order.size}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-amber-500">{order.price.toFixed(2)}</td>
                                <td className="px-2 py-1.5 text-gray-500 truncate max-w-[80px]" title={order.strategyId}>{order.strategyId}</td>
                                <td className="px-2 py-1.5 text-right">
                                    <div className="flex justify-end gap-2">
                                        {/* Mock Fill Button for Demo */}
                                        <button 
                                            onClick={() => paperExecutionService.forceFillOrder(order.id, order.price)}
                                            className="text-[9px] text-blue-500 hover:text-white border border-blue-900 hover:bg-blue-900 px-1 rounded"
                                            title="Mock Fill"
                                        >
                                            FILL
                                        </button>
                                        <button 
                                            onClick={() => handleCancel(order.id)}
                                            className="text-[9px] text-red-500 hover:text-white border border-red-900 hover:bg-red-900 px-1 rounded"
                                        >
                                            CXL
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WorkingBlotter;
