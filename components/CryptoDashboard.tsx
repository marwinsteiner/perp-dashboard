import React, { useState, useEffect, useRef } from 'react';
import { useMarketData } from '../hooks/useMarketData';
import { useFuturesCurve } from '../hooks/useFuturesCurve';
import TerminalRow from './TerminalRow';
import TerminalHeader from './TerminalHeader';
import FocusPane from './FocusPane';
import BasisChart from './BasisChart';
import TermStructureChart from './TermStructureChart';
import BinanceService from '../services/binanceService';
import { CombinedMarketData } from '../types';

const CryptoDashboard: React.FC = () => {
  const marketData = useMarketData();
  
  // State
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocusPaneOpen, setIsFocusPaneOpen] = useState(true);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isFuturesOpen, setIsFuturesOpen] = useState(false); // New Tab State
  const [showExitModal, setShowExitModal] = useState(false);
  const [isAppTerminated, setIsAppTerminated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<{[key: string]: HTMLTableRowElement | null}>({});
  const focusServiceRef = useRef<BinanceService | null>(null);

  // Initialize Focus Service
  if (!focusServiceRef.current) {
    focusServiceRef.current = new BinanceService([]); 
  }

  const selectedSymbol = marketData[selectedIndex]?.symbol || 'BTCUSDT';

  // Hook for Curve Data (Only active when tab is open)
  // We conditionally pass the symbol or null to control fetching
  const curveDataSymbol = isFuturesOpen ? selectedSymbol : '';
  const { curveData } = useFuturesCurve(curveDataSymbol, focusServiceRef);

  // Auto-scroll to selected row
  useEffect(() => {
    if (marketData[selectedIndex]) {
        const sym = marketData[selectedIndex].symbol;
        rowRefs.current[sym]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, marketData]);

  // Global Keyboard Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAppTerminated) return;

      // 1. Exit Modal State
      if (showExitModal) {
        e.preventDefault(); // Lock focus
        const key = e.key.toLowerCase();
        if (key === 'x') {
            setIsAppTerminated(true);
        } else if (key === 'e' || e.key === 'Escape') {
            setShowExitModal(false);
        }
        return;
      }

      const isSearchFocused = document.activeElement === searchInputRef.current;

      // 2. Search Input State
      if (isSearchFocused) {
          if (e.key === 'Escape') {
              searchInputRef.current?.blur();
          } else if (e.key === 'Enter') {
              // Commit search
              const query = searchInputRef.current?.value.toUpperCase().trim() || '';
              if (query) {
                  const idx = marketData.findIndex(d => 
                    d.symbol.startsWith(query) || d.symbol.replace('USDT','').startsWith(query)
                  );
                  
                  if (idx !== -1) {
                      setSelectedIndex(idx);
                      setIsFocusPaneOpen(true);
                      searchInputRef.current?.blur();
                  }
              }
          }
          return;
      }

      // 3. Normal Dashboard Navigation
      if (e.key === '/') {
        e.preventDefault();
        setSearchTerm(''); // Clear input
        searchInputRef.current?.focus();
        return;
      }

      if (e.key.toLowerCase() === 'f') {
        setIsFocusPaneOpen(true);
        // If entering focus, maybe close others or keep stacking?
        // Let's keep them independent but maybe exclusive for cleanliness if screen is small
        return;
      }

      if (e.key.toLowerCase() === 'c') {
        setIsChartOpen(prev => !prev);
        if (isFuturesOpen) setIsFuturesOpen(false); // Exclusive toggle
        return;
      }

      // New 'q' key for Futures Term Structure
      if (e.key.toLowerCase() === 'q') {
        setIsFuturesOpen(prev => !prev);
        if (isChartOpen) setIsChartOpen(false); // Exclusive toggle
        return;
      }

      if (e.key.toLowerCase() === 'x') {
        // Priority Close: Futures > Chart > Focus > Exit Modal
        if (isFuturesOpen) {
            setIsFuturesOpen(false);
        } else if (isChartOpen) {
            setIsChartOpen(false);
        } else if (isFocusPaneOpen) {
            setIsFocusPaneOpen(false);
        } else {
            setShowExitModal(true);
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, marketData.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [marketData, isAppTerminated, showExitModal, isFocusPaneOpen, isChartOpen, isFuturesOpen]);

  if (isAppTerminated) {
    return (
        <div className="h-screen bg-black flex flex-col items-center justify-center text-red-600 font-mono tracking-widest animate-pulse">
            <h1 className="text-4xl font-bold mb-4">SESSION TERMINATED</h1>
            <p className="text-gray-600 text-sm">Refresh to restart terminal</p>
        </div>
    );
  }

  // Calculate Layout Cols
  // Logic: 
  // - Futures Open? It takes the Center/Right slot (Col 4-12). Watchlist (4). Focus hidden.
  // - Chart Open? Watchlist (4) + Chart (8). Focus hidden.
  // - Default? Watchlist (8) + Focus (4).
  
  let watchlistCols = 'col-span-12';
  let centerPaneCols = 'hidden';
  let centerPaneContent: React.ReactNode = null;
  let focusCols = 'hidden';

  if (isFuturesOpen) {
      watchlistCols = 'col-span-4';
      centerPaneCols = 'col-span-8';
      centerPaneContent = <TermStructureChart data={curveData} symbol={selectedSymbol} />;
      focusCols = 'hidden'; // Hide focus pane when curve is open to give space
  } else if (isChartOpen) {
      watchlistCols = 'col-span-4';
      centerPaneCols = 'col-span-8';
      centerPaneContent = <BasisChart symbol={selectedSymbol} service={focusServiceRef.current!} />;
      focusCols = 'hidden';
  } else if (isFocusPaneOpen) {
      watchlistCols = 'col-span-8';
      focusCols = 'col-span-4';
  }

  return (
    <div className="h-screen bg-black text-gray-300 font-mono flex flex-col overflow-hidden relative">
      <TerminalHeader />
      
      <div className="flex-1 grid grid-cols-12 min-h-0">
        {/* Left: Watchlist */}
        <div className={`${watchlistCols} overflow-auto border-r border-gray-800 flex flex-col transition-all duration-200`}>
            {/* Inline Search Bar */}
            <div className="bg-neutral-900 border-b border-gray-800 p-1 px-3 flex items-center sticky top-0 z-20">
                <span className={`mr-2 text-xs font-bold ${document.activeElement === searchInputRef.current ? 'text-cyan-400' : 'text-gray-600'}`}>/ SEARCH:</span>
                <input 
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-cyan-400 text-sm font-bold uppercase w-full placeholder-gray-800"
                    placeholder="SYMBOL..."
                    spellCheck={false}
                    autoComplete="off"
                />
            </div>

            <table className="w-full text-left border-collapse">
                <thead className="bg-neutral-900 sticky top-8 z-10 text-xs uppercase tracking-wider border-b border-gray-700">
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
                        innerRef={(el) => (rowRefs.current[data.symbol] = el)}
                    />
                    ))}
                </tbody>
            </table>
        </div>

        {/* Center Pane: Futures Curve OR Candle Chart */}
        {centerPaneCols !== 'hidden' && (
             <div className={`${centerPaneCols} h-full min-h-0 animate-in fade-in duration-300`}>
                {centerPaneContent}
             </div>
        )}

        {/* Right: Focus Pane */}
        {isFocusPaneOpen && !isFuturesOpen && !isChartOpen && (
            <div className={`${focusCols} h-full min-h-0 animate-in fade-in slide-in-from-right duration-200`}>
                <FocusPane 
                    symbol={selectedSymbol} 
                    serviceRef={focusServiceRef} 
                    onClose={() => setIsFocusPaneOpen(false)}
                />
            </div>
        )}
      </div>

      <div className="bg-neutral-900 border-t border-gray-800 p-1 text-[10px] text-gray-500 flex justify-between px-4 shrink-0">
        <div className="flex gap-4">
            <span>DATA: BINANCE</span>
            <span><span className="text-cyan-600 font-bold">/</span> SEARCH</span>
            <span><span className="text-cyan-600 font-bold">F</span> FOCUS</span>
            <span><span className="text-cyan-600 font-bold">C</span> CHART</span>
            <span><span className="text-cyan-600 font-bold">Q</span> FUTURES</span>
            <span><span className="text-cyan-600 font-bold">X</span> CLOSE</span>
        </div>
        <span>MONITORING {marketData.length} SYMBOLS</span>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-red-800 w-96 shadow-2xl p-6">
                <h2 className="text-red-500 font-bold text-xl mb-6 text-center tracking-wider border-b border-red-900/30 pb-4">
                    EXIT PLATFORM?
                </h2>
                
                <div className="flex gap-3 justify-center">
                    <button 
                        className="bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-800 px-6 py-2 text-sm font-bold transition-colors"
                        onClick={() => setIsAppTerminated(true)}
                    >
                        [X] EXIT
                    </button>
                    <button 
                        className="bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600 px-6 py-2 text-sm font-bold transition-colors"
                        onClick={() => setShowExitModal(false)}
                    >
                        [E] CANCEL
                    </button>
                </div>

                <div className="mt-6 text-center text-[10px] text-gray-500 uppercase tracking-wide">
                    Press <span className="text-white">x</span> to confirm &bull; <span className="text-white">e</span> or <span className="text-white">Esc</span> to cancel
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CryptoDashboard;