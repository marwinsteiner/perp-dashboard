
import React, { useState } from 'react';
import { useFocusSymbol } from '../hooks/useFocusSymbol';
import DepthLadder from './DepthLadder';
import RecentTrades from './RecentTrades';
import MetricsPanel from './MetricsPanel';
import VenueSelector from './VenueSelector';
import { Venue } from '../types';

interface FocusPaneProps {
  symbol: string;
  venue: Venue;
  onClose: () => void;
}

const FocusPane: React.FC<FocusPaneProps> = ({ symbol, venue: initialVenue, onClose }) => {
  const [venue, setVenue] = useState<Venue>(initialVenue);
  const { book, recentTrades, metrics } = useFocusSymbol(symbol, venue);

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="bg-neutral-900 p-2 border-b border-gray-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
            <h2 className="text-cyan-400 font-bold text-xs tracking-widest uppercase">FOCUS: {symbol.replace('USDT','')}</h2>
            <VenueSelector activeVenue={venue} onSelect={setVenue} />
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-red-500 font-mono font-bold text-xs">[x]</button>
      </div>

      <div className="border-b border-gray-800 bg-black/40">
        <MetricsPanel metrics={metrics} />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-1/2 min-w-0 border-r border-gray-800">
          <DepthLadder title={`${venue} L2 BOOK`} book={book} />
        </div>
        <div className="w-1/2 min-w-0">
           <RecentTrades trades={recentTrades} />
        </div>
      </div>
    </div>
  );
};

export default FocusPane;
