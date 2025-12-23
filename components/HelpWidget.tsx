
import React from 'react';

interface CommandInfo {
  cmd: string;
  description: string;
  category: string;
  example?: string;
}

const COMMANDS: CommandInfo[] = [
  { cmd: 'CS', description: 'Open the Crypto Screener (Watchlist). Monitor real-time basis and funding rates.', category: 'Navigation' },
  { cmd: 'PORT', description: 'Open the Portfolio and Carry monitor. Aggregate positions by Asset, Strategy, or Venue.', category: 'Navigation' },
  { cmd: 'TICKET', description: 'Order Entry Ticket. Place manual Limit or Market orders across venues.', category: 'Execution' },
  { cmd: 'OMS', description: 'Order Management System. View active working orders and manage order lifecycle.', category: 'Execution' },
  { cmd: 'FLOW', description: 'Execution Quality & Order Flow Analytics. Monitor slippage, fill ratios, and desk footprints.', category: 'Execution' },
  { cmd: 'BLOTTER', description: 'Trade Blotter. Historical view of all executed trades and fills.', category: 'Execution' },
  { cmd: 'SHOCK', description: 'Risk Scenario Analysis. Stress test portfolio against linear market moves.', category: 'Risk & Audit' },
  { cmd: 'MARS', description: 'Multi-Asset Risk System. Monitor global utilization, desk limits, and hard blocks.', category: 'Risk & Audit' },
  { cmd: 'STRAT', description: 'Strategy Health & Control. Manage lifecycle (Halt/Kill) and Quant Research sync.', category: 'Operations' },
  { cmd: 'CORE', description: 'Infrastructure Engine. View feed health, system latency, and append-only audit logs.', category: 'Operations' },
  { cmd: 'ACCT', description: 'Account Registry. Manage API credentials, subaccounts, and wallet balances.', category: 'Operations' },
  { cmd: 'SAVE', description: 'Capture the current window layout into a persistent named workspace.', category: 'Utility' },
  { cmd: 'H', description: 'Open this documentation and command reference guide.', category: 'Utility' },
  { cmd: 'F [SYM]', description: 'Focus View. Open depth ladders and micro-metrics for specific symbols.', category: 'Analytical', example: 'F BTC' },
  { cmd: 'C [SYM]', description: 'Basis Chart. High-fidelity basis and funding candlestick visualizer.', category: 'Analytical', example: 'C ETH' },
  { cmd: 'Q [SYM]', description: 'Futures Curve. Visualize term structure and implied yields across tenors.', category: 'Analytical', example: 'Q SOL' },
];

interface HelpWidgetProps {
  onTriggerCommand: (cmd: string) => void;
}

const HelpWidget: React.FC<HelpWidgetProps> = ({ onTriggerCommand }) => {
  const categories = Array.from(new Set(COMMANDS.map(c => c.category)));

  return (
    <div className="h-full flex flex-col bg-[#050505] font-mono p-8 overflow-auto">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header Section */}
        <div className="border-b-2 border-cyan-800 pb-6 mb-10">
          <div className="flex items-center gap-4 mb-3">
            <span className="bg-cyan-700 text-black px-3 py-1 font-bold text-sm tracking-widest">DOCS</span>
            <h1 className="text-white text-2xl font-bold tracking-tighter">TermiFi Operational Manual</h1>
          </div>
          <p className="text-gray-500 text-xs leading-relaxed max-w-2xl">
            TermiFi is an professional-grade command-and-control center. Navigation is primarily driven via the command line interface (<span className="text-amber-500 font-bold">/</span>). 
            All critical operations require multi-factor sign-off and are logged to the immutable audit trail.
          </p>
        </div>

        {/* Command Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {categories.map(cat => (
            <div key={cat} className="space-y-5">
              <h2 className="text-cyan-600 text-[10px] font-bold uppercase tracking-[0.3em] border-l-4 border-cyan-900 pl-3">{cat}</h2>
              <div className="space-y-4">
                {COMMANDS.filter(c => c.category === cat).map(item => (
                  <div 
                    key={item.cmd}
                    onClick={() => onTriggerCommand(item.cmd.split(' ')[0])}
                    className="group cursor-pointer bg-neutral-900/20 border border-gray-800 hover:border-cyan-700 p-4 transition-all duration-200 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-amber-500 font-bold text-sm tracking-tighter">/{item.cmd}</span>
                      <span className="opacity-0 group-hover:opacity-100 text-[9px] text-cyan-600 font-bold uppercase tracking-widest">Execute Command</span>
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed font-sans">
                      {item.description}
                    </p>
                    {item.example && (
                      <div className="mt-3 text-[9px] text-gray-600 font-mono italic bg-black/40 px-2 py-1 inline-block">
                        CMD> {item.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Workflow & Hotkeys Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-neutral-900">
          <div>
            <h3 className="text-gray-500 font-bold uppercase text-[10px] mb-4 tracking-[0.2em]">Operational Hotkeys</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-[11px]">
              <div className="flex justify-between border-b border-gray-900 pb-1"><span className="text-cyan-700">/</span> <span className="text-gray-400">Command Input</span></div>
              <div className="flex justify-between border-b border-gray-900 pb-1"><span className="text-cyan-700">ESC</span> <span className="text-gray-400">Exit Mode / Clear</span></div>
              <div className="flex justify-between border-b border-gray-900 pb-1"><span className="text-cyan-700">CTRL+S</span> <span className="text-gray-400">Save Workspace</span></div>
              <div className="flex justify-between border-b border-gray-900 pb-1"><span className="text-cyan-700">1 / 2 / 3</span> <span className="text-gray-400">Chart Timeframe</span></div>
              <div className="flex justify-between border-b border-gray-900 pb-1"><span className="text-cyan-700">ARROWS</span> <span className="text-gray-400">Watchlist Nav</span></div>
              <div className="flex justify-between border-b border-gray-900 pb-1"><span className="text-cyan-700">ENTER</span> <span className="text-gray-400">Focus Selection</span></div>
            </div>
          </div>

          <div className="bg-red-900/5 border border-red-900/30 p-5 rounded-sm">
            <h3 className="text-red-600 font-bold uppercase text-[10px] mb-4 tracking-[0.2em] flex items-center gap-2">
               <span className="animate-pulse">●</span> Emergency Intervention Workflow
            </h3>
            <p className="text-[10px] text-gray-500 leading-relaxed mb-4">
              When executing critical strategy controls (Halt, Soft Kill, Kill), the system enforces a <strong>Mandatory Sign-Off</strong>. Users must provide their authorized Personnel ID and a valid reason for intervention.
            </p>
            <div className="text-[9px] text-red-500 font-bold uppercase">
              All sign-offs are instantly broadcast to the CORE INFRA Audit Log with timestamps and actor metadata.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpWidget;
