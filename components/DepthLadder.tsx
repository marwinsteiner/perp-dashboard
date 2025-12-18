import React from 'react';
import { OrderBook } from '../types';

interface DepthLadderProps {
  title: string;
  book: OrderBook;
}

const DepthLadder: React.FC<DepthLadderProps> = ({ title, book }) => {
  const maxTotal = Math.max(
    book.bids.length > 0 ? book.bids[book.bids.length - 1].total : 0,
    book.asks.length > 0 ? book.asks[book.asks.length - 1].total : 0
  );

  return (
    <div className="flex flex-col h-full border-r border-gray-800 last:border-r-0">
      <div className="bg-gray-900 px-2 py-1 text-[10px] uppercase text-cyan-500 font-bold border-b border-gray-800 text-center">
        {title}
      </div>
      <div className="flex-1 overflow-hidden text-[10px] relative">
        {/* Asks (Top, Red) */}
        {/* We use flex-col with reversed data (High -> Low) to put Highest Ask at top and Lowest Ask (Best Ask) at bottom adjacent to Best Bid */}
        <div className="flex flex-col">
            {book.asks.slice().reverse().map((level, i) => (
            <div key={`ask-${i}`} className="flex justify-between px-2 py-0.5 relative group">
                <div 
                    className="absolute top-0 right-0 bottom-0 bg-red-900/30 transition-all duration-200" 
                    style={{ width: `${(level.total / maxTotal) * 100}%` }} 
                />
                <span className="text-red-400 z-10 font-mono">{level.price.toFixed(2)}</span>
                <span className="text-gray-400 z-10 font-mono">{level.size.toFixed(3)}</span>
            </div>
            ))}
        </div>
        
        <div className="border-t border-gray-800 my-1"></div>

        {/* Bids (Bottom, Green) */}
        <div>
            {book.bids.map((level, i) => (
            <div key={`bid-${i}`} className="flex justify-between px-2 py-0.5 relative">
                 <div 
                    className="absolute top-0 right-0 bottom-0 bg-green-900/30 transition-all duration-200" 
                    style={{ width: `${(level.total / maxTotal) * 100}%` }} 
                />
                <span className="text-green-400 z-10 font-mono">{level.price.toFixed(2)}</span>
                <span className="text-gray-400 z-10 font-mono">{level.size.toFixed(3)}</span>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default DepthLadder;