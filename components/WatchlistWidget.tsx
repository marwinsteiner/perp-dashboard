
import React, { useState, useEffect, useRef } from 'react';
import { useMarketData } from '../hooks/useMarketData';
import VenueSelector from './VenueSelector';
import { Venue } from '../types';

interface WatchlistWidgetProps {
  onSelectSymbol: (symbol: string) => void;
  isActiveContext: boolean;
  venue: Venue;
  onSetVenue: (venue: Venue) => void;
}

const formatPrice = (price: number | undefined) => {
  if (price === undefined) return '---';
  if (price > 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price > 1) return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return price.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 });
};

const WatchlistWidget: React.FC<WatchlistWidgetProps> = ({ onSelectSymbol, isActiveContext, venue, onSetVenue }) => {
  const marketData = useMarketData(venue);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isActiveContext) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, marketData.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
          if (marketData[selectedIndex]) onSelectSymbol(marketData[selectedIndex].symbol);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActiveContext, marketData, selectedIndex, onSelectSymbol]);

  return (
    <div className="h-full flex flex-col bg-black">
        <div className="bg-neutral-900 border-b border-gray-800 p-1 px-3 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cross-Exchange Screener</span>
                <VenueSelector activeVenue={venue} onSelect={onSetVenue} />
             </div>
             <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-700 font-mono">NODE_UPLINK: {venue}_PRIMARY</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
             </div>
        </div>

        <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse relative">
                <thead className="bg-[#0a0a0a] sticky top-0 z-10 text-[10px] uppercase tracking-wider border-b border-gray-700 shadow-sm">
                    <tr>
                    <th className="px-4 py-2 text-cyan-500 font-bold border-r border-gray-800 w-24">Symbol</th>
                    <th className="px-4 py-2 text-green-600 font-bold border-r border-gray-800 text-right">Bid ({venue})</th>
                    <th className="px-4 py-2 text-red-600 font-bold border-r border-gray-800 text-right">Ask ({venue})</th>
                    <th className="px-4 py-2 text-fuchsia-500 font-bold border-r border-gray-800 text-right">Spread</th>
                    <th className="px-4 py-2 text-blue-400 font-bold border-r border-gray-800 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                    {marketData.map((data, idx) => {
                      const bid = data.quote?.bidPrice;
                      const ask = data.quote?.askPrice;
                      const spreadBps = (bid && ask && bid > 0) ? ((ask - bid) / bid) * 10000 : 0;

                      return (
                        <tr 
                          key={data.symbol} 
                          onClick={() => setSelectedIndex(idx)}
                          onDoubleClick={() => onSelectSymbol(data.symbol)}
                          className={`h-9 border-b border-gray-900 font-mono text-[11px] cursor-pointer transition-colors duration-75 ${idx === selectedIndex ? 'bg-cyan-900/20' : 'hover:bg-gray-900'}`}
                        >
                          <td className="px-4 py-1 text-cyan-400 font-bold border-r border-gray-800">
                            {idx === selectedIndex && <span className="text-cyan-500 mr-1">▶</span>}
                            {data.symbol.replace('USDT','')}
                          </td>
                          <td className="px-4 py-1 text-right text-green-500 font-bold border-r border-gray-800 tabular-nums">
                            {formatPrice(bid)}
                          </td>
                          <td className="px-4 py-1 text-right text-red-500 font-bold border-r border-gray-800 tabular-nums">
                            {formatPrice(ask)}
                          </td>
                          <td className={`px-4 py-1 text-right border-r border-gray-800 tabular-nums ${spreadBps > 10 ? 'text-amber-500' : 'text-fuchsia-400'}`}>
                            {bid ? `${spreadBps.toFixed(1)} bps` : '---'}
                          </td>
                          <td className="px-4 py-1 text-right">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-bold ${bid ? 'bg-green-900/40 text-green-500 border border-green-800' : 'bg-gray-800 text-gray-600'}`}>
                              {bid ? 'LIVE' : 'WAIT'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
            </table>
            {marketData.length === 0 && (
              <div className="py-20 text-center text-gray-700 font-mono italic uppercase">
                Synchronizing {venue} orderbooks...
              </div>
            )}
        </div>
        <div className="bg-neutral-900 border-t border-gray-800 p-1 px-3 text-[9px] text-gray-600 flex justify-between uppercase">
            <span>Aggregating L1/L2 Normalized Feeds</span>
            <span>Venue Priority: {venue}</span>
        </div>
    </div>
  );
};

export default WatchlistWidget;
