
import React, { useState, useEffect, useRef } from 'react';
import { useMarketData } from '../hooks/useMarketData';
import TerminalRow from './TerminalRow';

interface WatchlistWidgetProps {
  onSelectSymbol: (symbol: string) => void;
  isActiveContext: boolean;
}

const WatchlistWidget: React.FC<WatchlistWidgetProps> = ({ onSelectSymbol, isActiveContext }) => {
  const marketData = useMarketData();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const rowRefs = useRef<{[key: string]: HTMLTableRowElement | null}>({});

  // Keyboard navigation for watchlist when context is active
  useEffect(() => {
    if (!isActiveContext) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing a command
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
            const next = Math.min(prev + 1, marketData.length - 1);
            rowRefs.current[marketData[next]?.symbol]?.scrollIntoView({ block: 'nearest' });
            return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
            const next = Math.max(prev - 1, 0);
            rowRefs.current[marketData[next]?.symbol]?.scrollIntoView({ block: 'nearest' });
            return next;
        });
      } else if (e.key === 'Enter') {
          if (marketData[selectedIndex]) {
              onSelectSymbol(marketData[selectedIndex].symbol);
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActiveContext, marketData, selectedIndex, onSelectSymbol]);

  return (
    <div className="h-full flex flex-col bg-black">
        <div className="bg-neutral-900 border-b border-gray-800 p-1 px-3 flex items-center justify-between shrink-0">
             <span className="text-xs font-bold text-gray-500">CRYPTO SCREENER</span>
             <span className="text-[10px] text-gray-600">Scanning {marketData.length} Assets</span>
        </div>

        <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse relative">
                <thead className="bg-neutral-900 sticky top-0 z-10 text-xs uppercase tracking-wider border-b border-gray-700 shadow-sm">
                    <tr>
                    <th className="px-4 py-2 text-cyan-500 font-normal border-r border-gray-800 w-24">Symbol</th>
                    <th className="px-4 py-2 text-green-600 font-normal border-r border-gray-800 text-right">Spot Bid</th>
                    <th className="px-4 py-2 text-red-600 font-normal border-r border-gray-800 text-right">Spot Ask</th>
                    <th className="px-4 py-2 text-fuchsia-500 font-normal border-r border-gray-800 text-right">Spread</th>
                    <th className="px-4 py-2 text-yellow-500 font-normal border-r border-gray-800 text-right">Perp Mark</th>
                    <th className="px-4 py-2 text-blue-400 font-normal border-r border-gray-800 text-right">Basis %</th>
                    <th className="px-4 py-2 text-orange-400 font-normal text-right">Fund</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                    {marketData.map((data, idx) => (
                    <TerminalRow 
                        key={data.symbol} 
                        data={data} 
                        isSelected={idx === selectedIndex}
                        // Wrap assignment in curly braces to ensure the callback returns void.
                        innerRef={(el) => { rowRefs.current[data.symbol] = el; }}
                    />
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default WatchlistWidget;
