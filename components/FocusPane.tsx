import React, { useRef } from 'react';
import BinanceService from '../services/binanceService';
import { useFocusSymbol } from '../hooks/useFocusSymbol';
import DepthLadder from './DepthLadder';
import RecentTrades from './RecentTrades';
import MetricsPanel from './MetricsPanel';

interface FocusPaneProps {
  symbol: string;
  serviceRef: React.MutableRefObject<BinanceService | null>;
  onClose: () => void;
}

const FocusPane: React.FC<FocusPaneProps> = ({ symbol, serviceRef, onClose }) => {
  const { spotDepth, futuresDepth, recentTrades, metrics } = useFocusSymbol(symbol, serviceRef);

  return (
    <div className="h-full flex flex-col border-l border-cyan-900/50 bg-black">
      <div className="bg-cyan-900/20 p-2 border-b border-cyan-900/30 flex justify-between items-center">
        <h2 className="text-cyan-400 font-bold text-sm tracking-wider">FOCUS: {symbol.replace('USDT','')}</h2>
        <div className="flex items-center gap-3">
            <span className="text-[10px] text-cyan-600 animate-pulse">LIVE FEED</span>
            <button 
                onClick={onClose}
                className="text-gray-500 hover:text-red-500 font-mono font-bold text-xs"
                title="Close Focus Pane (x)"
            >
                [x]
            </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="border-b border-gray-800">
        <MetricsPanel metrics={metrics} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Spot Depth */}
        <div className="w-1/3 min-w-0">
          <DepthLadder title="SPOT" book={spotDepth} />
        </div>
        
        {/* Futures Depth */}
        <div className="w-1/3 min-w-0">
          <DepthLadder title="PERP" book={futuresDepth} />
        </div>

        {/* Trades */}
        <div className="w-1/3 min-w-0 border-l border-gray-800">
           <RecentTrades trades={recentTrades} />
        </div>
      </div>
    </div>
  );
};

export default FocusPane;