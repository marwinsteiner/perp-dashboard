import React from 'react';

const TerminalHeader: React.FC = () => {
  return (
    <div className="bg-neutral-900 border-b-2 border-cyan-700 p-2 flex justify-between items-center text-xs font-mono uppercase tracking-wider mb-0 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <span className="bg-cyan-700 text-black px-2 py-1 font-bold">TERMIFI</span>
        <span className="text-cyan-500">USDT-M ARBITRAGE MONITOR</span>
        <span className="text-gray-500">LIVE CONNECTION: BINANCE PUBLIC</span>
      </div>
      <div className="flex gap-4 text-gray-400">
        <span>SPOT: <span className="text-green-500">ACTIVE</span></span>
        <span>FUTURES: <span className="text-green-500">ACTIVE</span></span>
        <span>{new Date().toISOString().split('T')[0]}</span>
      </div>
    </div>
  );
};

export default TerminalHeader;
