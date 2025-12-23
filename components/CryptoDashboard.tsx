
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WindowState, ViewType, ScreenConfig, Venue } from '../types';
import FloatingWindow from './FloatingWindow';
import WatchlistWidget from './WatchlistWidget';
import PortfolioWidget from './PortfolioWidget';
import FocusPane from './FocusPane';
import BasisChart from './BasisChart';
import TermStructureChart from './TermStructureChart';
import RiskLimitsWidget from './RiskLimitsWidget';
import StrategyHealthWidget from './StrategyHealthWidget';
import HelpWidget from './HelpWidget';
import CoreInfraWidget from './CoreInfraWidget';
import AccountManagerWidget from './AccountManagerWidget';
import OrderEntryTicket from './OrderEntryTicket';
import OmsWidget from './OmsWidget';
import BlotterWidget from './BlotterWidget';
import RiskShockWidget from './RiskShockWidget';
import FlowAnalyticsWidget from './FlowAnalyticsWidget';
import SaveScreenModal from './SaveScreenModal';
import BinanceService from '../services/binanceService';
import { useFuturesCurve } from '../hooks/useFuturesCurve';
import auditLogService from '../services/auditLogService';
import configService from '../services/configService';

// --- SERVICE WRAPPERS ---

const FocusWrapper = ({ symbol, venue }: { symbol: string, venue: Venue }) => {
    const serviceRef = useRef<BinanceService | null>(new BinanceService([]));
    useEffect(() => {
        serviceRef.current?.connect();
        return () => serviceRef.current?.disconnect();
    }, []);
    return <FocusPane symbol={symbol} serviceRef={serviceRef} onClose={() => {}} />;
};

const ChartWrapper = ({ symbol, venue }: { symbol: string, venue: Venue }) => {
    const service = useRef(new BinanceService([])).current;
    useEffect(() => {
        service.connect();
        return () => service.disconnect();
    }, [service]);
    return <BasisChart symbol={symbol} service={service} />;
};

const CurveWrapper = ({ symbol }: { symbol: string }) => {
    const serviceRef = useRef<BinanceService | null>(new BinanceService([]));
    useEffect(() => {
        serviceRef.current?.connect();
        return () => serviceRef.current?.disconnect();
    }, []);
    const { curveData } = useFuturesCurve(symbol, serviceRef);
    return <TermStructureChart data={curveData} symbol={symbol} />;
};

// --- MAIN SHELL ---

interface CryptoDashboardProps {
  onLogout?: () => void;
}

const CryptoDashboard: React.FC<CryptoDashboardProps> = ({ onLogout }) => {
  const [windows, setWindows] = useState<WindowState[]>([
    { id: 'cs-main', type: 'SCREENER', title: 'CRYPTO SCREENER', venue: 'BINANCE', isFloating: false, isMinimized: false, zIndex: 1, x: 0, y: 0, w: 0, h: 0 }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('cs-main');
  const [maximizedTabId, setMaximizedTabId] = useState<string | null>(null);
  const [commandMode, setCommandMode] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [savedScreens, setSavedScreens] = useState<ScreenConfig[]>([]);
  const cmdInputRef = useRef<HTMLInputElement>(null);

  // Global Key Listener for Command Mode (/)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !commandMode && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setCommandMode(true);
      } else if (e.key === 'Escape' && commandMode) {
        setCommandMode(false);
        setCommandInput('');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [commandMode]);

  // Focus Command Input when mode is active
  useEffect(() => {
    if (commandMode && cmdInputRef.current) {
      cmdInputRef.current.focus();
    }
  }, [commandMode]);

  useEffect(() => {
      const saved = localStorage.getItem('termifi_screens');
      if (saved) try { setSavedScreens(JSON.parse(saved)); } catch (e) {}
      auditLogService.log('SYSTEM', 'SYSTEM', `Dashboard Multi-Venue Hub Active. Mode: ${configService.isDemoMode ? 'DEMO' : 'PRODUCTION'}`);
  }, []);

  const setWindowVenue = (id: string, venue: Venue) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, venue } : w));
  };

  const executeCommand = (cmdStr: string) => {
    const cleanCmd = cmdStr.trim().toUpperCase();
    if (!cleanCmd) {
        setCommandMode(false);
        return;
    }

    const parts = cleanCmd.split(' ');
    const cmd = parts[0];
    const arg = parts[1];

    switch (cmd) {
      case 'CS': createWindow('SCREENER'); break;
      case 'PORT': createWindow('PORTFOLIO'); break;
      case 'MARS': createWindow('MARS'); break;
      case 'STRAT': createWindow('STRAT'); break;
      case 'CORE': createWindow('CORE'); break;
      case 'ACCT': createWindow('ACCT'); break;
      case 'TICKET': createWindow('TICKET'); break;
      case 'OMS': createWindow('OMS'); break;
      case 'BLOTTER': createWindow('BLOTTER'); break;
      case 'FLOW': createWindow('FLOW'); break;
      case 'SHOCK': createWindow('SHOCK'); break;
      case 'HELP': case 'H': createWindow('HELP'); break;
      case 'F': if (arg) createWindow('FOCUS', arg.endsWith('USDT') ? arg : arg + 'USDT'); break;
      case 'C': if (arg) createWindow('CHART', arg.endsWith('USDT') ? arg : arg + 'USDT'); break;
      case 'Q': if (arg) createWindow('CURVE', arg.endsWith('USDT') ? arg : arg + 'USDT'); break;
      case 'SAVE': setIsSaveModalOpen(true); break;
      default: 
        auditLogService.log('UI', 'SYSTEM', `Unknown Command: ${cmd}`, 'USER');
    }
    setCommandInput('');
    setCommandMode(false);
  };

  const createWindow = (type: ViewType, symbol?: string) => {
    const id = uuidv4();
    const title = symbol 
        ? `${type}: ${symbol.replace('USDT','')}` 
        : type === 'SCREENER' ? 'CRYPTO SCREENER' 
        : type === 'PORTFOLIO' ? 'PORTFOLIO' 
        : type === 'MARS' ? 'MARS RISK SYSTEM' 
        : type === 'STRAT' ? 'STRATEGY HEALTH'
        : type === 'CORE' ? 'CORE INFRA'
        : type === 'ACCT' ? 'ACCOUNT REGISTRY'
        : type === 'TICKET' ? 'ORDER ENTRY'
        : type === 'OMS' ? 'ORDER MANAGEMENT'
        : type === 'BLOTTER' ? 'TRADE BLOTTER'
        : type === 'SHOCK' ? 'SCENARIO SHOCK'
        : type === 'FLOW' ? 'EXECUTION ANALYTICS'
        : type === 'CURVE' ? `CURVE: ${symbol?.replace('USDT', '')}`
        : 'TERMINAL DOCUMENTATION';
    
    let w = 600, h = 400;
    if (type === 'TICKET') { w = 350; h = 550; } 
    if (type === 'OMS' || type === 'BLOTTER') { w = 800; h = 450; }
    if (type === 'FLOW') { w = 1000; h = 600; }
    if (type === 'CURVE') { w = 900; h = 500; }

    const newWin: WindowState = {
        id,
        type,
        title,
        symbol,
        venue: 'BINANCE',
        isFloating: false,
        isMinimized: false,
        zIndex: Math.max(0, ...windows.map(w => w.zIndex)) + 1,
        x: 100 + (windows.length * 20),
        y: 100 + (windows.length * 20),
        w,
        h
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
            zIndex: Math.max(0, ...prev.map(p => p.zIndex)) + 1
        };
    }));
  };

  const handleTabClick = (id: string) => {
      setActiveTabId(id);
      setMaximizedTabId(id);
  };

  const renderContent = (w: WindowState, isActiveContext: boolean) => {
      switch (w.type) {
          case 'SCREENER': 
            return <WatchlistWidget venue={w.venue} onSetVenue={(v) => setWindowVenue(w.id, v)} isActiveContext={isActiveContext} onSelectSymbol={(sym) => createWindow('FOCUS', sym)} />;
          case 'PORTFOLIO': return <PortfolioWidget />;
          case 'MARS': return <RiskLimitsWidget />;
          case 'STRAT': return <StrategyHealthWidget />;
          case 'CORE': return <CoreInfraWidget />;
          case 'ACCT': return <AccountManagerWidget />;
          case 'TICKET': return <OrderEntryTicket />;
          case 'OMS': return <OmsWidget />;
          case 'FLOW': return <FlowAnalyticsWidget />;
          case 'BLOTTER': return <BlotterWidget />;
          case 'SHOCK': return <RiskShockWidget />;
          case 'HELP': return <HelpWidget onTriggerCommand={(cmd) => executeCommand(cmd)} />;
          case 'FOCUS': return w.symbol ? <FocusWrapper symbol={w.symbol} venue={w.venue} /> : null;
          case 'CHART': return w.symbol ? <ChartWrapper symbol={w.symbol} venue={w.venue} /> : null;
          case 'CURVE': return w.symbol ? <CurveWrapper symbol={w.symbol} /> : null;
          default: return null;
      }
  };

  const dockedWindows = windows.filter(w => !w.isFloating);
  const floatingWindows = windows.filter(w => w.isFloating && !w.isMinimized);
  const maximizedWindow = maximizedTabId ? windows.find(w => w.id === maximizedTabId) : null;
  const activeDocked = dockedWindows.find(w => w.id === activeTabId);

  return (
    <div className="h-screen bg-black text-gray-300 font-mono flex flex-col overflow-hidden relative selection:bg-cyan-900 selection:text-white">
      {/* HEADER / TABS */}
      <div className="bg-neutral-900 border-b border-gray-800 flex h-8 shrink-0">
          <div className="flex items-center px-4 bg-cyan-900 text-black font-bold text-xs select-none">TERMIFI HUB</div>
          <div onClick={onLogout} className={`flex items-center px-3 text-[10px] font-bold border-r border-gray-800 select-none cursor-pointer hover:bg-white/5 transition-colors ${configService.isDemoMode ? 'bg-amber-900/40 text-amber-500' : 'bg-green-900/40 text-green-500'}`}>
             {configService.isDemoMode ? 'SIMULATION' : 'PRODUCTION'}
          </div>
          <div className="flex-1 flex items-end px-2 gap-1 overflow-x-auto">
              {windows.filter(w => !w.isMinimized).map(w => (
                  <div key={w.id} onClick={() => handleTabClick(w.id)} className={`group relative px-4 h-7 text-[10px] flex items-center gap-2 cursor-pointer border-t border-l border-r rounded-t-sm select-none ${w.id === activeTabId ? 'bg-black border-gray-700 text-cyan-400 font-bold z-10' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}>
                      <span>{w.title}</span>
                      <div className="w-0 overflow-hidden group-hover:w-auto flex gap-1 ml-2 transition-all">
                          <button onClick={(e) => { e.stopPropagation(); toggleDock(w.id); }}>{w.isFloating ? '↓' : '↗'}</button>
                          <button onClick={(e) => { e.stopPropagation(); closeWindow(w.id); }} className="hover:text-red-500">x</button>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      <div className="flex-1 relative bg-black min-h-0">
          {maximizedWindow ? (
              <div className="w-full h-full z-10 relative bg-black">{renderContent(maximizedWindow, !commandMode)}</div>
          ) : (
              <>
                <div className="w-full h-full">
                    {activeDocked ? renderContent(activeDocked, !commandMode) : (
                        dockedWindows.length === 0 && <div className="w-full h-full flex items-center justify-center text-gray-700 uppercase">PRESS '/' FOR COMMANDS</div>
                    )}
                </div>
                {floatingWindows.map(w => (
                    <FloatingWindow key={w.id} id={w.id} title={w.title} x={w.x} y={w.y} w={w.w} h={w.h} zIndex={w.zIndex} onClose={() => closeWindow(w.id)} onToggleDock={() => toggleDock(w.id)} onMinimize={() => {}} onFocus={() => {}} onMove={() => {}} onResize={() => {}}>
                        {renderContent(w, false)}
                    </FloatingWindow>
                ))}
              </>
          )}
      </div>

      {commandMode && (
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 max-w-2xl bg-black border-2 border-amber-600 shadow-[0_0_100px_rgba(217,119,6,0.2)] z-[1000] p-4 flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center mb-3">
                <div className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.3em]">Command Execution Interface</div>
                <div className="text-[8px] text-gray-600 uppercase">ESC TO CANCEL</div>
              </div>
              <div className="flex items-center gap-3 bg-neutral-900/50 p-3 border border-gray-800">
                  <span className="text-amber-500 font-bold text-2xl">/</span>
                  <input 
                    ref={cmdInputRef} 
                    type="text" 
                    className="flex-1 bg-transparent border-none outline-none text-xl font-mono text-amber-500 uppercase placeholder:text-gray-800" 
                    placeholder="ENTER COMMAND (E.G. CS, MARS, F BTC)..." 
                    value={commandInput} 
                    onChange={e => setCommandInput(e.target.value)} 
                    onKeyDown={e => {
                        if (e.key === 'Enter') executeCommand(commandInput);
                        if (e.key === 'Escape') setCommandMode(false);
                    }} 
                  />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-4">
                  <div className="flex flex-col"><span className="text-[8px] text-gray-700 font-bold uppercase">Markets</span><span className="text-[9px] text-gray-500 italic">CS, F, C, Q</span></div>
                  <div className="flex flex-col"><span className="text-[8px] text-gray-700 font-bold uppercase">Operations</span><span className="text-[9px] text-gray-500 italic">PORT, STRAT, CORE</span></div>
                  <div className="flex flex-col"><span className="text-[8px] text-gray-700 font-bold uppercase">Risk</span><span className="text-[9px] text-gray-500 italic">MARS, SHOCK</span></div>
                  <div className="flex flex-col"><span className="text-[8px] text-gray-700 font-bold uppercase">Trading</span><span className="text-[9px] text-gray-500 italic">OMS, FLOW, BLOTTER</span></div>
              </div>
          </div>
      )}

      <div className="bg-neutral-900 border-t border-gray-800 p-1 text-[10px] text-gray-500 flex justify-between items-center px-4 shrink-0 h-8">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>HUB_STATE: <span className="text-green-500 font-bold uppercase">Optimal</span></span>
            </div>
            <span className="text-gray-700">|</span>
            <span className="text-cyan-600">CROSS_VENUE_ROUTING: <span className="text-green-500 font-bold uppercase">Ready</span></span>
        </div>
        <div className="flex items-center gap-6">
            <span>{new Date().toISOString().replace('T',' ').substring(0,19)}</span>
            <span className="text-gray-700 font-bold">V2.5.0-STABLE</span>
        </div>
      </div>
    </div>
  );
};

export default CryptoDashboard;
