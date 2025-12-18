import React from 'react';
import { Trade } from '../types';

interface RecentTradesProps {
  trades: Trade[];
}

const RecentTrades: React.FC<RecentTradesProps> = ({ trades }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-900 px-2 py-1 text-[10px] uppercase text-cyan-500 font-bold border-b border-gray-800">
        Recent Perp Prints
      </div>
      <div className="flex-1 overflow-hidden">
        <table className="w-full text-[10px] font-mono">
          <thead className="text-gray-500 text-left">
            <tr>
              <th className="px-2 py-1 font-normal">Time</th>
              <th className="px-2 py-1 font-normal text-right">Price</th>
              <th className="px-2 py-1 font-normal text-right">Size</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="hover:bg-gray-900/50">
                <td className="px-2 py-0.5 text-gray-400">
                  {new Date(t.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                </td>
                <td className={`px-2 py-0.5 text-right ${!t.isBuyerMaker ? 'text-green-400' : 'text-red-400'}`}>
                  {t.price.toFixed(2)}
                </td>
                <td className="px-2 py-0.5 text-right text-gray-300">
                  {t.qty.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentTrades;
