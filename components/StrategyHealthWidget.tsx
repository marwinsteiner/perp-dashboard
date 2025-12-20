
import React, { useState, useEffect } from 'react';
import { useStrategyAnalytics } from '../hooks/useStrategyAnalytics';
import { StrategyInstance, StrategyState, BacktestConfig, BacktestResult } from '../types';
import backtestEngine from '../services/backtestEngine';
import strategyService from '../services/strategyService';
import researchService from '../services/researchService';
import ControlSignOffModal from './ControlSignOffModal';

const formatUSD = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const StateBadge = ({ state }: { state: StrategyState }) => {
  let colorClass = 'bg-gray-800 text-gray-400';
  if (state === 'RUNNING') colorClass = 'bg-green-900/50 text-green-400 border border-green-900';
  if (state === 'PAUSED') colorClass = 'bg-yellow-900/50 text-yellow-400 border border-yellow-900';
  if (state === 'DRAINING') colorClass = 'bg-orange-900/50 text-orange-400 border border-orange-900';
  if (state === 'BACKTESTING') colorClass = 'bg-indigo-900/50 text-indigo-400 border border-indigo-900 animate-pulse';
  if (state === 'ERROR') colorClass = 'bg-red-900/50 text-red-400 border border-red-900 animate-pulse';

  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${colorClass}`}>
      {state}
    </span>
  );
};

const ResearchTab: React.FC<{ dbConfig: any, setDbConfig: React.Dispatch<React.SetStateAction<any>> }> = ({ dbConfig, setDbConfig }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const runBacktest = async () => {
    setIsRunning(true);
    setProgress(0);
    setResult(null);

    const config: BacktestConfig = {
      id: 'bt-' + Date.now(),
      strategyId: 'ARB_DELTA_NEUTRAL',
      symbols: ['BTCUSDT'],
      startTime: Date.now() - 86400000 * 1,
      endTime: Date.now(),
      initialCapital: 1000000,
      slippageBps: 1.0,
      latencyMs: 25,
      parameters: { signal_threshold: 0.05, ema_period: 14 }
    };

    try {
      const res = await backtestEngine.run(config, (p) => setProgress(p));
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  const promoteParams = () => {
      if (!result) return;
      strategyService.updateParams(result.config.strategyId, result.config.parameters, 'ADMIN_USER');
      alert(`Parameters promoted to ${result.config.strategyId} prod instances.`);
  };

  const saveDbSettings = () => {
      researchService.updateConfig(dbConfig);
      setShowSettings(false);
  };

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
      {/* Settings Overlay */}
      {showSettings && (
          <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-8">
              <div className="bg-neutral-900 border border-indigo-500 w-full max-w-md p-6 shadow-[0_0_50px_rgba(79,70,229,0.3)]">
                  <h3 className="text-white text-xs font-bold uppercase mb-6 border-b border-gray-800 pb-2">Market Data Storage Configuration</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-[10px] text-gray-500 uppercase mb-1">DuckDB Remote Host</label>
                          <input 
                            type="text" value={dbConfig.host} 
                            onChange={e => setDbConfig({...dbConfig, host: e.target.value})}
                            className="w-full bg-black border border-gray-800 text-indigo-400 px-3 py-2 text-xs font-mono focus:border-indigo-500 outline-none"
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] text-gray-500 uppercase mb-1">SQL Bridge Port</label>
                          <input 
                            type="number" value={dbConfig.port} 
                            onChange={e => setDbConfig({...dbConfig, port: parseInt(e.target.value)})}
                            className="w-full bg-black border border-gray-800 text-indigo-400 px-3 py-2 text-xs font-mono focus:border-indigo-500 outline-none"
                          />
                      </div>
                      <div>
                          <label className="block text-[10px] text-gray-500 uppercase mb-1">Access Token</label>
                          <input 
                            type="password" value={dbConfig.token} 
                            onChange={e => setDbConfig({...dbConfig, token: e.target.value})}
                            className="w-full bg-black border border-gray-800 text-indigo-400 px-3 py-2 text-xs font-mono focus:border-indigo-500 outline-none"
                          />
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-8">
                      <button onClick={() => setShowSettings(false)} className="px-4 py-2 text-[10px] text-gray-500 hover:text-white uppercase">Cancel</button>
                      <button onClick={saveDbSettings} className="px-4 py-2 bg-indigo-900 text-white text-[10px] font-bold uppercase">Save & Test Connection</button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-800 text-white p-1 rounded">
             <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
               <path d="M12 1a1 1 0 0 1 1-1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8zM4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4z"/>
               <path d="M4 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-7zm0 9a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-1z"/>
             </svg>
          </div>
          <div>
            <h3 className="text-white text-sm font-bold tracking-tight uppercase">Quant Operations & Notebook Sync</h3>
            <p className="text-[10px] text-gray-600 font-mono tracking-tighter uppercase">Remote Engine: {dbConfig.host}:{dbConfig.port} | Mode: Production-Parity Replay</p>
          </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowSettings(true)}
                className="p-2 border border-gray-800 hover:border-indigo-500 text-gray-600 hover:text-indigo-400"
                title="Storage Settings"
            >
                ⚙️
            </button>
            <button 
                onClick={runBacktest}
                disabled={isRunning}
                className={`px-8 py-2 bg-indigo-900 text-white text-xs font-bold uppercase border border-indigo-700 hover:bg-indigo-800 transition-all ${isRunning ? 'opacity-50 animate-pulse' : ''}`}
            >
                {isRunning ? 'SQL ENGINE PROCESSING...' : 'EXECUTE SIMULATION'}
            </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Progress & Sidebar */}
        <div className="w-1/3 flex flex-col gap-4">
          <div className="bg-neutral-900/50 border border-gray-800 p-4">
            <h4 className="text-[10px] text-indigo-500 font-bold uppercase mb-3 flex justify-between">
                <span>Simulation Environment</span>
                <span className="text-[8px] text-green-800 font-bold">● CONNECTED</span>
            </h4>
            <div className="space-y-3 text-[10px] font-mono">
              <div className="flex justify-between border-b border-gray-900 pb-1">
                <span className="text-gray-500">PARQUET_STORE</span><span className="text-white">v2_MAINNET_L3</span>
              </div>
              <div className="flex justify-between border-b border-gray-900 pb-1">
                <span className="text-gray-500">MATCH_MODEL</span><span className="text-white">FIFO_LATENCY_AWARE</span>
              </div>
              <div className="flex justify-between border-b border-gray-900 pb-1">
                <span className="text-gray-500">NOTEBOOK_SYNC</span><span className="text-cyan-500 animate-pulse">ACTIVE_JUPYTER</span>
              </div>
            </div>
            
            {isRunning && (
              <div className="mt-8 border-t border-indigo-900 pt-4">
                <div className="flex justify-between text-[9px] mb-2 font-bold">
                  <span className="text-indigo-400">SEQUENTIAL EVENT REPLAY</span>
                  <span className="text-white">{(progress * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 bg-neutral-900/10 border border-gray-800 p-4 overflow-auto">
             <h4 className="text-[10px] text-gray-600 font-bold uppercase mb-3">Notebook Experiments</h4>
             <div className="space-y-2">
               <div className="p-2 bg-black border border-gray-900 hover:border-indigo-500 cursor-pointer group">
                 <div className="flex justify-between text-[9px] font-bold">
                   <span className="text-indigo-800 group-hover:text-indigo-400 transition-colors">ALPHA_GEN_V3 (Jupyter)</span>
                   <span className="text-green-900">3.4 SR</span>
                 </div>
                 <div className="text-[8px] text-gray-700 mt-1 italic">Last push: 14 mins ago</div>
               </div>
             </div>
          </div>
        </div>

        {/* Results Pane */}
        <div className="flex-1 bg-[#050505] border border-gray-800 p-4 overflow-auto flex flex-col">
          {result ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                  <div className="grid grid-cols-4 gap-4 flex-1">
                    <MetricCard label="Total Return" value={`${result.metrics.totalReturnPct.toFixed(2)}%`} color="text-green-500" />
                    <MetricCard label="Sharpe (SQL)" value={result.metrics.sharpeRatio.toFixed(2)} color="text-indigo-400" />
                    <MetricCard label="Max Drawdown" value={`-${result.metrics.maxDrawdown.toFixed(2)}%`} color="text-red-500" />
                    <MetricCard label="Profit Factor" value={result.metrics.profitFactor.toFixed(2)} color="text-gray-300" />
                  </div>
                  <button 
                    onClick={promoteParams}
                    className="ml-4 px-4 py-2 bg-green-900 border border-green-700 text-green-100 text-[10px] font-bold uppercase hover:bg-green-800"
                  >
                    🚀 Promote to Prod
                  </button>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <h4 className="text-[10px] text-gray-600 font-bold uppercase mb-4 tracking-widest flex justify-between items-center">
                   <span>Performance Equity Curve</span>
                   <span className="text-[8px] font-normal lowercase">calculated via DuckDB window query</span>
                </h4>
                <div className="flex-1 flex items-end gap-1 px-4 border-l border-b border-gray-900 mb-8 pb-1">
                  {result.equityCurve.map((p, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-indigo-900/40 hover:bg-indigo-500 transition-all group relative min-w-[2px]"
                      style={{ height: `${((p.equity - 980000) / 40000) * 100}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-neutral-800 px-2 py-0.5 text-[8px] text-white whitespace-nowrap z-50 font-mono">
                        ${p.equity.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                <h4 className="text-[10px] text-gray-600 font-bold uppercase mb-4 tracking-widest border-b border-gray-900 pb-2">Remote Simulation Audit</h4>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-[10px] font-mono">
                    <thead className="text-gray-700 sticky top-0 bg-[#050505]">
                      <tr className="uppercase text-left">
                        <th className="py-2">Time</th>
                        <th className="py-2">Symbol</th>
                        <th className="text-right py-2">Price</th>
                        <th className="text-right py-2">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900">
                      {result.executionLog.slice(0, 15).map((t, i) => (
                        <tr key={i} className="text-gray-400">
                          <td className="py-2 text-gray-600">{new Date(t.venueTime).toLocaleTimeString()}</td>
                          <td className="py-2 text-cyan-800 font-bold">{t.symbol}</td>
                          <td className="text-right py-2">{t.price.toFixed(2)}</td>
                          <td className="text-right py-2">{t.qty.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-800 text-center px-12">
              <div className="mb-6 opacity-10">
                <svg width="80" height="80" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M15 13v1H1.5l.5-2 1.5-1 1.5 1 1.5-1 1.5 1 1.5-1 1.5 1.5V13zM1 12.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zM.146 8.354a.5.5 0 0 1 .708 0L3 10.5l3-3 3 3 3-3 2.146 2.146a.5.5 0 0 1-.708.708L12 9.207l-3 3-3-3-3 3-2.146-2.146a.5.5 0 0 1 0-.708z"/>
                  <path d="M1 2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2z"/>
                </svg>
              </div>
              <p className="uppercase font-bold text-xs tracking-[0.2em] mb-3">Simulation Console Idle</p>
              <p className="text-[10px] lowercase leading-relaxed max-w-xs text-gray-700">
                The platform is synced with external Jupyter kernels. Backtests run on the remote SQL bridge to ensure production parity.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, color }: { label: string, value: string, color: string }) => (
  <div className="bg-neutral-900/30 border border-gray-800 p-3 rounded-sm flex-1">
    <span className="text-[8px] text-gray-600 uppercase block mb-1 tracking-widest">{label}</span>
    <span className={`text-lg font-bold ${color}`}>{value}</span>
  </div>
);

const StrategyHealthWidget: React.FC = () => {
  const { instances, loading } = useStrategyAnalytics();
  const [activeTab, setActiveTab] = useState<'LIVE' | 'RESEARCH'>('LIVE');
  const [filter, setFilter] = useState<string>('ALL');
  
  const [dbConfig, setDbConfig] = useState(researchService.getConfig());
  const [stratInstances, setStratInstances] = useState<StrategyInstance[]>([]);

  // State for Sign-off Modal
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ id: string, action: 'HALT' | 'SOFT_KILL' | 'KILL' } | null>(null);
  
  useEffect(() => {
    setStratInstances(instances);
  }, [instances]);

  const initiateControl = (id: string, action: 'HALT' | 'SOFT_KILL' | 'KILL') => {
      setPendingAction({ id, action });
      setIsSignOffOpen(true);
  };

  const finalizeControl = (user: string, reason: string) => {
      if (!pendingAction) return;
      const { id, action } = pendingAction;
      
      if (action === 'HALT') strategyService.halt(id, user, reason);
      if (action === 'SOFT_KILL') strategyService.softKill(id, user, reason);
      if (action === 'KILL') strategyService.kill(id, user, reason);
      
      setStratInstances([...strategyService.getInstances()]);
      setIsSignOffOpen(false);
      setPendingAction(null);
  };

  const filtered = stratInstances.filter(s => filter === 'ALL' || s.state === filter || (filter === 'ERROR' && s.riskFlags.length > 0));

  if (loading) return <div className="h-full flex items-center justify-center text-cyan-500 font-mono animate-pulse uppercase">Connecting to Strategy Engine...</div>;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono relative">
      {/* Tab Switcher */}
      <div className="flex bg-neutral-900 border-b border-gray-800 h-8 shrink-0">
        <button 
          onClick={() => setActiveTab('LIVE')}
          className={`px-6 text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'LIVE' ? 'bg-black text-cyan-500 border-t-2 border-cyan-500' : 'text-gray-600 hover:text-gray-400'}`}
        >
          LIVE OPERATIONS
        </button>
        <button 
          onClick={() => setActiveTab('RESEARCH')}
          className={`px-6 text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'RESEARCH' ? 'bg-black text-indigo-500 border-t-2 border-indigo-500' : 'text-gray-600 hover:text-gray-400'}`}
        >
          QUANT RESEARCH
        </button>
      </div>

      {activeTab === 'RESEARCH' ? (
        <ResearchTab dbConfig={dbConfig} setDbConfig={setDbConfig} />
      ) : (
        <>
          <div className="bg-neutral-900/50 border-b border-gray-800 p-2 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-cyan-900 text-black px-2 py-0.5 font-bold text-[10px]">STRAT</div>
              <h2 className="text-white text-[10px] font-bold tracking-tighter uppercase">Strategy Control & OMS Lifecycle</h2>
            </div>
            <div className="flex gap-2">
              {['ALL', 'RUNNING', 'PAUSED', 'DRAINING', 'ERROR'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[9px] px-2 py-0.5 font-bold border rounded-sm ${filter === f ? 'bg-cyan-900 text-cyan-100 border-cyan-600' : 'text-gray-500 border-gray-800 hover:border-gray-600'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-neutral-900/80 sticky top-0 z-10 text-[9px] uppercase text-gray-500 border-b border-gray-800">
                <tr>
                  <th className="px-2 py-2 w-1/4">Strategy Name / ID</th>
                  <th className="px-2 py-2 w-24">State</th>
                  <th className="px-2 py-2">Owner</th>
                  <th className="px-2 py-2 text-right">Gross USD</th>
                  <th className="px-2 py-2 text-right">Net USD</th>
                  <th className="px-2 py-2">PnL Snapshot</th>
                  <th className="px-2 py-2">Health</th>
                  <th className="px-2 py-2 text-right w-64">OMS Controls</th>
                </tr>
              </thead>
              <tbody>
                  {filtered.map(strat => (
                      <StrategyRow 
                          key={strat.id} 
                          strat={strat} 
                          onControl={initiateControl} 
                      />
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* FOOTER STATUS */}
      <div className="bg-neutral-900 border-t border-gray-800 p-1 flex justify-between items-center px-4 shrink-0 h-6 text-[8px] text-gray-600">
          <div className="flex gap-4">
              <span>ACTIVE INSTANCES: <span className="text-white">{stratInstances.filter(i => i.state === 'RUNNING').length}</span></span>
              <span>TOTAL GROSS: <span className="text-cyan-500 font-bold">{formatUSD(stratInstances.reduce((acc, i) => acc + (i.grossNotionalUsd || 0), 0))}</span></span>
          </div>
          <div>AUTH: ADMIN_X | REMOTE_DB: {dbConfig.host} | MONITOR_FREQ: 100ms</div>
      </div>

      {/* Emergency Modal - Rendered at bottom for portal-like layering */}
      <ControlSignOffModal 
        isOpen={isSignOffOpen} 
        onClose={() => setIsSignOffOpen(false)}
        onConfirm={finalizeControl}
        id={pendingAction?.id || ''}
        action={pendingAction?.action || 'HALT'}
      />
    </div>
  );
};

const StrategyRow: React.FC<{ strat: StrategyInstance, onControl: (id: string, action: 'HALT' | 'SOFT_KILL' | 'KILL') => void }> = ({ strat, onControl }) => (
  <tr className="border-b border-gray-900 hover:bg-gray-900/40 text-[10px]">
    <td className="px-2 py-2">
      <div className="text-white font-bold">{strat.name}</div>
      <div className="text-[9px] text-gray-600 font-mono">{strat.id}</div>
    </td>
    <td className="px-2 py-2"><StateBadge state={strat.state} /></td>
    <td className="px-2 py-2 text-gray-500">{strat.owner}</td>
    <td className="px-2 py-2 text-right font-mono text-cyan-600">{formatUSD(strat.grossNotionalUsd || 0)}</td>
    <td className="px-2 py-2 text-right font-mono">{formatUSD(strat.netNotionalUsd || 0)}</td>
    <td className="px-2 py-2 text-gray-500">PnL: {formatUSD(strat.pnlDay)}</td>
    <td className="px-2 py-2 text-gray-600">REJ: {strat.rejectRate}%</td>
    <td className="px-2 py-2 text-right">
      <div className="flex justify-end gap-1">
          <button 
            onClick={() => onControl(strat.id, 'HALT')}
            disabled={strat.state === 'PAUSED'}
            className="bg-yellow-900/20 text-yellow-600 border border-yellow-900 px-2 py-1 text-[8px] font-bold hover:bg-yellow-900/40 uppercase disabled:opacity-20 transition-all"
          >
            Halt
          </button>
          <button 
            onClick={() => onControl(strat.id, 'SOFT_KILL')}
            disabled={strat.state === 'DRAINING'}
            className="bg-orange-900/20 text-orange-600 border border-orange-900 px-2 py-1 text-[8px] font-bold hover:bg-orange-900/40 uppercase disabled:opacity-20 transition-all"
          >
            Soft Kill
          </button>
          <button 
            onClick={() => onControl(strat.id, 'KILL')}
            disabled={strat.state === 'ERROR'}
            className="bg-red-900 text-white px-2 py-1 text-[8px] font-bold hover:bg-red-800 uppercase disabled:opacity-20 transition-all"
          >
            Kill
          </button>
      </div>
    </td>
  </tr>
);

export default StrategyHealthWidget;
