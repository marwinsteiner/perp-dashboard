
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WindowState, ViewType, ScreenConfig } from '../types';
import FloatingWindow from './FloatingWindow';
import WatchlistWidget from './WatchlistWidget';
import PortfolioWidget from './PortfolioWidget';
import FocusPane from './FocusPane';
import BasisChart from './BasisChart';
import TermStructureChart from './TermStructureChart';
import RiskLimitsWidget from './RiskLimitsWidget';
import StrategyHealthWidget from './StrategyHealthWidget';
import ShockWidget from './ShockWidget';
import FlowWidget from './FlowWidget';
import HelpWidget from './HelpWidget';
import SaveScreenModal from './SaveScreenModal';
import BinanceService from '../services/binanceService';
import { useFuturesCurve } from '../hooks/useFuturesCurve';

// --- SERVICE WRAPPERS ---

const FocusWrapper = ({ symbol }: { symbol: string }) => {
    const serviceRef = useRef<BinanceService | null>(null);
    if (!serviceRef.current) {
        serviceRef.current = new BinanceService([]);
        serviceRef.current.connect();
    }
    useEffect(() => {
        return () => serviceRef.current?.disconnect();
    }, []);
    return <FocusPane symbol={symbol} serviceRef={serviceRef} onClose={() => {}} />;
};

const ChartWrapper = ({ symbol }: { symbol: string }) => {
    const serviceRef = useRef<BinanceService | null>(null);
    if (!serviceRef.current) {
        serviceRef.current = new BinanceService([]);
    }
    return <BasisChart symbol={symbol} service={serviceRef.current} />;
};

const CurveWrapper = ({ symbol }: { symbol: string }) => {
    const serviceRef = useRef<BinanceService | null>(null);
    if (!serviceRef.current) {
        serviceRef.current = new BinanceService([]);
        serviceRef.current.connect();
    }
    const { curveData } = useFuturesCurve(symbol, serviceRef);
    return <TermStructureChart data={curveData} symbol={symbol} />;
};

// --- MAIN SHELL ---

const CryptoDashboard: React.FC = () => {
  const [windows, setWindows] = useState<WindowState[]>([
    { id: 'cs-main', type: 'SCREENER', title: 'CRYPTO SCREENER', isFloating: false, isMinimized: false, zIndex: 1, x: 0, y: 0, w: 0, h: 0 }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('cs-main');
  const [maximizedTabId, setMaximizedTabId] = useState<string | null>(null);

  const [commandMode, setCommandMode] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [savedScreens, setSavedScreens] = useState<ScreenConfig[]>([]);
  
  const cmdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const saved = localStorage.getItem('termifi_screens');
      if (saved) {
          try {
              setSavedScreens(JSON.parse(saved));
          } catch (e) {
              console.error("Failed to parse saved screens", e);
          }
      }
  }, []);

  const createWindow = (type: ViewType, symbol?: string) => {
    const id = uuidv4();
    let title = '';

    if (symbol) {
        title = `${type}: ${symbol.replace('USDT','')}`;
    } else {
        switch(type) {
            case 'SCREENER': title = 'CRYPTO SCREENER'; break;
            case 'PORTFOLIO': title = 'PORTFOLIO'; break;
            case 'MARS': title = 'MARS RISK SYSTEM'; break;
            case 'STRAT': title = 'STRATEGY HEALTH'; break;
            case 'SHOCK': title = 'SCENARIO ANALYSIS'; break;
            case 'FLOW': title = 'EXECUTION ANALYTICS'; break;
            case 'HELP': title = 'TERMINAL DOCUMENTATION'; break;
            default: title = 'WINDOW';
        }
    }
    
    const newWin: WindowState = {
        id,
        type,
        title,
        symbol,
        isFloating: false,
        isMinimized: false,
        zIndex: Math.max(0, ...windows.map(w => w.zIndex)) + 1,
        x: 100 + (windows.length * 20),
        y: 100 + (windows.length * 20),
        w: 600,
        h: 400
    };

    setWindows(prev => [...prev, newWin]);
    setActiveTabId(id);
    setMaximizedTabId(id);
  };

  const closeWindow = (id: string) => {
    setWindows(prev => {
        const next = prev.filter(w => w.id !== id);
        if (id === activeTabId) {
            const nextTab = next.length > 0 ? next[next.length - 1] : undefined;
            if (nextTab) {
                setActiveTabId(nextTab.id);
                if (maximizedTabId === id) setMaximizedTabId(nextTab.id);
            } else {
                setMaximizedTabId(null);
            }
        }
        return next;
    });
  };

  const toggleDock = (id: string) => {
    setWindows(prev => prev.map(w => {
        if (w.id !== id) return w;
        const willFloat = !w.isFloating;
        if (willFloat && maximizedTabId) setMaximizedTabId(null);
        if (!willFloat) setActiveTabId(id);
        return {
            ...w,
            isFloating: willFloat,
            isMinimized: false,
            x: willFloat ? 100 : w.x, 
            y: willFloat ? 100 : w.y, 
            w: willFloat ? 800 : w.w, 
            h: willFloat ? 500 : w.h,
            zIndex: Math.max(0, ...prev.map(p => p.zIndex)) + 1
        };
    }));
  };

  const minimizeWindow = (id: string) => {
      setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
      if (maximizedTabId === id) setMaximizedTabId(null);
  };

  const restoreWindow = (id: string) => {
      setWindows(prev => prev.map(w => {
          if (w.id !== id) return w;
          return { 
              ...w, 
              isMinimized: false, 
              zIndex: Math.max(0, ...prev.map(p => p.zIndex)) + 1 
          };
      }));
      setActiveTabId(id);
      setMaximizedTabId(id);
  };

  const focusWindow = (id: string) => {
     setWindows(prev => prev.map(w => ({
         ...w,
         zIndex: w.id === id ? Math.max(0, ...prev.map(p => p.zIndex)) + 1 : w.zIndex
     })));
     setActiveTabId(id);
  };

  const moveWindow = (id: string, x: number, y: number) => {
      setWindows(prev => prev.map(w => w.id === id ? { ...w, x, y } : w));
  };
  
  const resizeWindow = (id: string, w: number, h: number) => {
      setWindows(prev => prev.map(win => win.id === id ? { ...win, w, h } : win));
  };

  const loadScreen = (screen: ScreenConfig) => {
      setWindows(screen.windows);
      setActiveTabId(screen.activeTabId);
      setMaximizedTabId(null); 
  };

  const handleTabClick = (id: string) => {
      setActiveTabId(id);
      setMaximizedTabId(id);
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              setIsSaveModalOpen(true);
              return;
          }
          if (e.key === '/' && !commandMode && !isSaveModalOpen) {
              if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                  e.preventDefault();
                  setCommandMode(true);
                  setTimeout(() => cmdInputRef.current?.focus(), 10);
              }
          }
          if (commandMode && e.key === 'Escape') {
              setCommandMode(false);
              setCommandInput('');
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandMode, isSaveModalOpen]);

  const executeCommand = () => {
      const cmd = commandInput.toUpperCase().trim();
      setCommandMode(false);
      setCommandInput('');

      if (cmd === 'CS') {
          const existing = windows.find(w => w.type === 'SCREENER');
          existing ? handleTabClick(existing.id) : createWindow('SCREENER');
      } else if (cmd === 'PORT') {
          const existing = windows.find(w => w.type === 'PORTFOLIO');
          existing ? handleTabClick(existing.id) : createWindow('PORTFOLIO');
      } else if (cmd === 'MARS') {
          const existing = windows.find(w => w.type === 'MARS');
          existing ? handleTabClick(existing.id) : createWindow('MARS');
      } else if (cmd === 'STRAT') {
          const existing = windows.find(w => w.type === 'STRAT');
          existing ? handleTabClick(existing.id) : createWindow('STRAT');
      } else if (cmd === 'SHOCK') {
          const existing = windows.find(w => w.type === 'SHOCK');
          existing ? handleTabClick(existing.id) : createWindow('SHOCK');
      } else if (cmd === 'FLOW') {
          const existing = windows.find(w => w.type === 'FLOW');
          existing ? handleTabClick(existing.id) : createWindow('FLOW');
      } else if (cmd === 'H' || cmd === 'HELP') {
          const existing = windows.find(w => w.type === 'HELP');
          existing ? handleTabClick(existing.id) : createWindow('HELP');
      } else if (cmd.startsWith('F ')) {
          createWindow('FOCUS', cmd.substring(2).trim() + 'USDT');
      } else if (cmd.startsWith('C ')) {
          createWindow('CHART', cmd.substring(2).trim() + 'USDT');
      } else if (cmd.startsWith('Q ')) {
          createWindow('CURVE', cmd.substring(2).trim() + 'USDT');
      } else if (cmd === 'SAVE') {
          setIsSaveModalOpen(true);
      }
  };

  const handleHelpTrigger = (cmd: string) => {
    // Open command bar and pre-fill
    setCommandInput(cmd + ' ');
    setCommandMode(true);
    setTimeout(() => {
        if (cmdInputRef.current) {
            cmdInputRef.current.focus();
            // Move cursor to end
            const val = cmdInputRef.current.value;
            cmdInputRef.current.setSelectionRange(val.length, val.length);
        }
    }, 50);
  };

  const renderContent = (w: WindowState, isActiveContext: boolean) => {
      switch (w.type) {
          case 'SCREENER': 
            return <WatchlistWidget isActiveContext={isActiveContext} onSelectSymbol={(sym) => createWindow('FOCUS', sym)} />;
          case 'PORTFOLIO': return <PortfolioWidget />;
          case 'MARS': return <RiskLimitsWidget />;
          case 'STRAT': return <StrategyHealthWidget />;
          case 'SHOCK': return <ShockWidget />;
          case 'FLOW': return <FlowWidget />;
          case 'HELP': return <HelpWidget onTriggerCommand={handleHelpTrigger} />;
          case 'FOCUS': return w.symbol ? <FocusWrapper symbol={w.symbol} /> : null;
          case 'CHART': return w.symbol ? <ChartWrapper symbol={w.symbol} /> : null;
          case 'CURVE': return w.symbol ? <CurveWrapper symbol={w.symbol} /> : null;
          default: return null;
      }
  };

  const dockedWindows = windows.filter(w => !w.isFloating);
  const floatingWindows = windows.filter(w => w.isFloating && !w.isMinimized);
  const minimizedWindows = windows.filter(w => w.isMinimized);
  const maximizedWindow = maximizedTabId ? windows.find(w => w.id === maximizedTabId) : null;
  const activeDocked = dockedWindows.find(w => w.id === activeTabId);

  return (
    <div className="h-screen bg-black text-gray-300 font-mono flex flex-col overflow-hidden relative selection:bg-cyan-900 selection:text-white">
      {/* HEADER / TABS */}
      <div className="bg-neutral-900 border-b border-gray-800 flex h-8 shrink-0">
          <div className="flex items-center px-4 bg-cyan-900 text-black font-bold text-xs select-none">TERMIFI</div>
          <div className="flex-1 flex items-end px-2 gap-1 overflow-x-auto">
              {windows.filter(w => !w.isMinimized).map(w => (
                  <div 
                    key={w.id}
                    onClick={() => handleTabClick(w.id)}
                    className={`
                        group relative px-4 h-7 text-xs flex items-center gap-2 cursor-pointer border-t border-l border-r rounded-t-sm select-none
                        ${w.id === activeTabId 
                            ? 'bg-black border-gray-700 text-cyan-400 font-bold z-10' 
                            : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}
                    `}
                  >
                      <span>{w.title}</span>
                      {w.isFloating && <span className="text-[9px] text-gray-600 bg-gray-800 px-1 rounded">FLOAT</span>}
                      <div className="w-0 overflow-hidden group-hover:w-auto flex gap-1 ml-2 transition-all">
                          <button onClick={(e) => { e.stopPropagation(); toggleDock(w.id); }} className="hover:text-white">
                                {w.isFloating ? '↓' : '↗'}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); closeWindow(w.id); }} className="hover:text-red-500">x</button>
                      </div>
                  </div>
              ))}
              <button onClick={() => handleHelpTrigger('')} className="px-2 h-6 text-gray-600 hover:text-cyan-500 text-lg leading-none">+</button>
          </div>
      </div>

      <div className="flex-1 relative bg-black min-h-0">
          {maximizedWindow ? (
              <div className="w-full h-full z-10 relative bg-black">{renderContent(maximizedWindow, !commandMode)}</div>
          ) : (
              <>
                <div className="w-full h-full">
                    {activeDocked ? renderContent(activeDocked, !commandMode) : (
                        dockedWindows.length === 0 && (
                            <div className="w-full h-full flex items-center justify-center text-gray-700 uppercase">NO ACTIVE WORKSPACE. PRESS '/' FOR COMMANDS.</div>
                        )
                    )}
                </div>
                {floatingWindows.map(w => (
                    <FloatingWindow
                        key={w.id} id={w.id} title={w.title} x={w.x} y={w.y} w={w.w} h={w.h} zIndex={w.zIndex}
                        onClose={() => closeWindow(w.id)} onToggleDock={() => toggleDock(w.id)} onMinimize={() => minimizeWindow(w.id)}
                        onFocus={() => focusWindow(w.id)} onMove={moveWindow} onResize={resizeWindow}
                    >
                        {renderContent(w, false)}
                    </FloatingWindow>
                ))}
              </>
          )}
      </div>

      <SaveScreenModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={(name) => {
          const newScreen: ScreenConfig = { name, timestamp: Date.now(), windows, activeTabId };
          const updatedScreens = [...savedScreens.filter(s => s.name !== name), newScreen];
          setSavedScreens(updatedScreens);
          localStorage.setItem('termifi_screens', JSON.stringify(updatedScreens));
          setIsSaveModalOpen(false);
      }} />

      {commandMode && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 bg-black border-2 border-amber-600 shadow-2xl z-50 p-2 flex flex-col animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] text-amber-600 font-bold mb-1 uppercase tracking-wider">Execute Command</div>
              <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold text-xl">/</span>
                  <input ref={cmdInputRef} type="text" className="flex-1 bg-transparent border-none outline-none text-xl font-mono text-amber-500 uppercase" placeholder="CMD (E.G. FLOW, MARS)"
                    value={commandInput} onChange={e => setCommandInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && executeCommand()}
                  />
              </div>
              <div className="mt-2 text-[10px] text-gray-500 flex gap-4 uppercase">
                  <span><strong className="text-gray-300">FLOW</strong> ANALYTICS</span>
                  <span><strong className="text-gray-300">STRAT</strong> HEALTH</span>
                  <span><strong className="text-gray-300">MARS</strong> RISK</span>
                  <span><strong className="text-gray-300">PORT</strong> PORTFOLIO</span>
              </div>
          </div>
      )}

      <div className="bg-neutral-900 border-t border-gray-800 p-1 text-[10px] text-gray-500 flex justify-between items-center px-4 shrink-0 z-50 h-8">
        <div className="flex items-center gap-4">
            <span>MODE: <span className="text-cyan-500 font-bold">{maximizedTabId ? 'MAXIMIZED' : 'WORKSPACE'}</span></span>
            <span><span className="text-amber-600 font-bold">/</span> CMD</span>
            {savedScreens.length > 0 && (
                <>
                    <div className="h-4 w-px bg-gray-700 mx-2"></div>
                    <span className="text-gray-600 font-bold">SCREENS:</span>
                    <div className="flex gap-2">
                        {savedScreens.map(s => (
                            <button key={s.name} onClick={() => loadScreen(s)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded-sm border border-gray-700 uppercase font-bold text-[9px]">
                                {s.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
            {minimizedWindows.length > 0 && (
                <div className="flex gap-2 ml-4">
                    {minimizedWindows.map(w => (
                        <button key={w.id} onClick={() => restoreWindow(w.id)} className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-2 rounded-sm border border-gray-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>{w.title}
                        </button>
                    ))}
                </div>
            )}
        </div>
        <div className="flex items-center gap-4">
            <span className="text-gray-600">SAVE: <span className="text-white">CTRL+S</span></span>
            <span>{dockedWindows.length} TABS &bull; {floatingWindows.length} FLOAT</span>
        </div>
      </div>
    </div>
  );
};

export default CryptoDashboard;
