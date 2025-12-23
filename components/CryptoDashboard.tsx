
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WindowState, ViewType, Venue } from '../types';
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
import auditLogService from '../services/auditLogService';
import configService from '../services/configService';

interface CryptoDashboardProps {
  onLogout?: () => void;
}

const CryptoDashboard: React.FC<CryptoDashboardProps> = ({ onLogout }) => {
  // Global dashboard state
  const [windows, setWindows] = useState<WindowState[]>([
    { id: 'cs-main', type: 'SCREENER', title: 'CRYPTO SCREENER', venue: 'BINANCE', isFloating: false, isMinimized: false, zIndex: 1, x: 0, y: 0, w: 0, h: 0 }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('cs-main');
  const [maximizedTabId, setMaximizedTabId] = useState<string | null>(null);
  const [activeVenue, setActiveVenue] = useState<Venue>('BINANCE');
  
  // Command Mode state
  const [commandMode, setCommandMode] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const cmdInputRef = useRef<HTMLInputElement>(null);

  // Global Key Listener for Command Mode (/)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Trigger command mode with /
      if (e.key === '/' && !commandMode && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setCommandMode(true);
      } 
      // Close command mode with Escape
      else if (e.key === 'Escape' && commandMode) {
        setCommandMode(false);
        setCommandInput('');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [commandMode]);

  // Focus the input when command mode is enabled
  useEffect(() => {
    if (commandMode) {
      // Use requestAnimationFrame to ensure the element is painted/mounted
      requestAnimationFrame(() => {
        if (cmdInputRef.current) {
          cmdInputRef.current.focus();
        }
      });
    }
  }, [commandMode]);

  const setWindowVenue = (id: string, venue: Venue) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, venue } : w));
    if (id === activeTabId) setActiveVenue(venue);
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
      case 'F': // Focus
        if (arg) createWindow('FOCUS', arg.endsWith('USDT') ? arg : arg + 'USDT');
        break;
      case 'C': // Chart
        if (arg) createWindow('CHART', arg.endsWith('USDT') ? arg : arg + 'USDT');
        break;
      case 'Q': // Curve
        if (arg) createWindow('CURVE', arg.endsWith('USDT') ? arg : arg + 'USDT');
        break;
      default: 
        auditLogService.log('UI', 'SYSTEM', `Unknown Command: ${cmd}`, 'USER');
    }
    
    setCommandInput('');
    setCommandMode(false);
  };

  const createWindow = (type: ViewType, symbol?: string) => {
    const id = uuidv4();
    let title = symbol ? `${type}: ${symbol.replace('USDT','')}` : type;
    
    if (type === 'SCREENER') title = 'CRYPTO SCREENER';
    if (type === 'PORTFOLIO') title = 'PORTFOLIO & CARRY';
    if (type === 'MARS') title = 'MARS RISK SYSTEM';
    if (type === 'STRAT') title = 'STRATEGY HEALTH';
    if (type === 'CORE') title = 'CORE INFRA';
    if (type === 'ACCT') title = 'ACCOUNT REGISTRY';
    
    let w = 600, h = 400;
    if (type === 'TICKET') { w = 350; h = 550; } 
    if (type === 'OMS' || type === 'BLOTTER') { w = 800; h = 450; }
    if (type === 'FLOW') { w = 1000; h = 600; }
    if (type === 'CURVE') { w = 900; h = 500; }
    if (type === 'FOCUS') { w = 550; h = 650; }
    if (type === 'CHART') { w = 800; h = 500; }

    const newWin: WindowState = { 
      id, 
      type, 
      title, 
      symbol, 
      venue: activeVenue, // Inherit the dashboard's current active venue
      isFloating: false, 
      isMinimized: false, 
      zIndex: Math.max(1, ...windows.map(w => w.zIndex)) + 1, 
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
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isFloating: !w.isFloating, zIndex: Math.max(1, ...prev.map(p => p.zIndex)) + 1 } : w));
  };

  const renderContent = (w: WindowState, isActiveContext: boolean) => {
    switch (w.type) {
      case 'SCREENER': 
        return <WatchlistWidget venue={w.venue} onSetVenue={(v) => { setWindowVenue(w.id, v); setActiveVenue(v); }} isActiveContext={isActiveContext} onSelectSymbol={(sym) => createWindow('FOCUS', sym)} />;
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
      case 'FOCUS': return w.symbol ? <FocusPane symbol={w.symbol} venue={w.venue} onClose={() => closeWindow(w.id)} /> : null;
      case 'CHART': return w.symbol ? <BasisChart symbol={w.symbol} venue={w.venue} /> : null;
      case 'CURVE': return w.symbol ? <TermStructureChart symbol={w.symbol} venue={w.venue} /> : null;
      default: return null;
    }
  };

  const dockedWindows = windows.filter(w => !w.isFloating);
  const floatingWindows = windows.filter(w => w.isFloating);
  const maximizedWindow = maximizedTabId ? windows.find(w => w.id === maximizedTabId) : null;
  const activeDocked = dockedWindows.find(w => w.id === activeTabId);

  return (
    <div className="h-screen bg-black text-gray-300 font-mono flex flex-col overflow-hidden relative selection:bg-cyan-900 selection:text-white">
      {/* TERMINAL TOP BAR */}
      <div className="bg-neutral-900 border-b border-gray-800 flex h-8 shrink-0">
          <div className="flex items-center px-4 bg-cyan-900 text-black font-bold text-xs select-none uppercase tracking-tighter">TERMIFI HUB</div>
          <div className="flex-1 flex items-end px-2 gap-1 overflow-x-auto scrollbar-hide">
              {windows.filter(w => !w.isMinimized).map(w => (
                  <div 
                    key={w.id} 
                    onClick={() => { setActiveTabId(w.id); setMaximizedTabId(w.id); }} 
                    className={`px-4 h-7 text-[10px] flex items-center gap-2 cursor-pointer border-t border-l border-r rounded-t-sm select-none transition-colors ${w.id === activeTabId ? 'bg-black border-gray-700 text-cyan-400 font-bold z-10' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}
                  >
                      <span className="truncate max-w-[120px]">{w.title}</span>
                      <button onClick={(e) => { e.stopPropagation(); closeWindow(w.id); }} className="hover:text-red-500 font-bold transition-colors">×</button>
                  </div>
              ))}
          </div>
          <div onClick={onLogout} className="flex items-center px-3 text-[10px] font-bold border-l border-gray-800 cursor-pointer hover:bg-red-900/20 text-gray-600 transition-colors uppercase">Logout</div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="flex-1 relative bg-black min-h-0">
          {maximizedWindow && !maximizedWindow.isFloating ? (
              <div className="w-full h-full relative bg-black">{renderContent(maximizedWindow, !commandMode)}</div>
          ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-800 text-[10px] uppercase">
                <div className="text-center">
                    <p className="mb-2">No Active Workspace</p>
                    <p className="opacity-40 animate-pulse font-bold tracking-widest">Press '/' to Initialize Command</p>
                </div>
              </div>
          )}
          {floatingWindows.map(w => (
              <FloatingWindow 
                key={w.id} 
                id={w.id} 
                title={w.title} 
                x={w.x} y={w.y} w={w.w} h={w.h} 
                zIndex={w.zIndex} 
                onClose={() => closeWindow(w.id)} 
                onToggleDock={() => toggleDock(w.id)} 
                onMinimize={()=>{}} 
                onFocus={()=>{ setActiveTabId(w.id); }} 
                onMove={(id, x, y) => setWindows(prev => prev.map(win => win.id === id ? { ...win, x, y } : win))}
                onResize={(id, w, h) => setWindows(prev => prev.map(win => win.id === id ? { ...win, w, h } : win))}
              >
                  {renderContent(w, false)}
              </FloatingWindow>
          ))}
      </div>

      {/* BLOOMBERG STYLE COMMAND BAR */}
      {commandMode && (
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 max-w-2xl bg-black border-2 border-amber-600 shadow-[0_0_150px_rgba(217,119,6,0.3)] z-[1000] p-4 flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center mb-3">
                <div className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.3em]">Command Execution Interface</div>
                <div className="text-[8px] text-gray-600 uppercase">ESC TO DISCARD</div>
              </div>
              <div className="flex items-center gap-3 bg-neutral-900/50 p-3 border border-gray-800">
                  <span className="text-amber-500 font-bold text-2xl">/</span>
                  <input 
                    ref={cmdInputRef} 
                    type="text" 
                    className="flex-1 bg-transparent border-none outline-none text-xl font-mono text-amber-500 uppercase placeholder:text-gray-900" 
                    placeholder="ENTER MNEMONIC (CS, F, MARS, HELP)..." 
                    value={commandInput} 
                    onChange={e => setCommandInput(e.target.value)} 
                    onKeyDown={e => {
                        if (e.key === 'Enter') executeCommand(commandInput);
                    }} 
                  />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-4">
                  <div className="flex flex-col"><span className="text-[8px] text-gray-700 font-bold uppercase">Markets</span><span className="text-[9px] text-gray-500 italic">CS, F, C, Q</span></div>
                  <div className="flex flex-col"><span className="text-[8px] text-gray-700 font-bold uppercase">Ops</span><span className="text-[9px] text-gray-500 italic">PORT, STRAT, CORE</span></div>
                  <div className="flex flex-col"><span className="text-[8px] text-gray-700 font-bold uppercase">Risk</span><span className="text-[9px] text-gray-500 italic">MARS, SHOCK</span></div>
                  <div className="flex flex-col"><span className="text-[8px] text-gray-700 font-bold uppercase">Trade</span><span className="text-[9px] text-gray-500 italic">OMS, FLOW, TICKET</span></div>
              </div>
          </div>
      )}

      {/* SYSTEM STATUS FOOTER */}
      <div className="bg-neutral-900 border-t border-gray-800 p-1 text-[9px] text-gray-600 flex justify-between items-center px-4 h-8 shrink-0">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>UPLINK: <span className="text-green-500 font-bold uppercase">Optimal</span></span>
            </div>
            <span>|</span>
            <span>SYSTEM: <span className="text-white font-bold uppercase">V2.5.0 STABLE</span></span>
            <span>|</span>
            <span className="text-cyan-600 font-bold">VENUE: <span className="text-cyan-400">{activeVenue}</span></span>
        </div>
        <div className="flex items-center gap-6">
            <span>{new Date().toISOString().replace('T',' ').substring(0,19)}</span>
            <span className="text-gray-700 font-bold tracking-widest">NODE_ID: {activeVenue}_PRIMARY</span>
        </div>
      </div>
    </div>
  );
};

export default CryptoDashboard;
