
import React, { useState } from 'react';
import { Venue } from '../types';

interface VenueSelectorProps {
  activeVenue: Venue;
  onSelect: (venue: Venue) => void;
  className?: string;
}

const VENUES: Venue[] = ['BINANCE', 'COINBASE', 'KRAKEN', 'BITFINEX', 'BITSTAMP', 'GEMINI', 'HYPERLIQUID'];

const VenueSelector: React.FC<VenueSelectorProps> = ({ activeVenue, onSelect, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative flex items-center ${className}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-0.5 bg-black border border-gray-800 rounded-sm hover:border-cyan-600 transition-all group"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.8)]"></div>
        <span className="text-[9px] font-bold text-gray-400 group-hover:text-cyan-400 uppercase tracking-tighter">{activeVenue}</span>
        <span className="text-[8px] text-gray-600 group-hover:text-gray-400">▼</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-28 bg-neutral-900 border border-gray-700 shadow-2xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-100">
            {VENUES.map(v => (
              <button 
                key={v}
                onClick={() => { onSelect(v); setIsOpen(false); }}
                className={`w-full text-left px-3 py-1 text-[9px] font-bold hover:bg-cyan-900/40 transition-colors ${activeVenue === v ? 'text-cyan-400 bg-cyan-900/20' : 'text-gray-400'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default VenueSelector;
