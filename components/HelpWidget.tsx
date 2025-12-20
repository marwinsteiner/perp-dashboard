
import React from 'react';

interface CommandInfo {
  cmd: string;
  description: string;
  category: string;
  example?: string;
}

const COMMANDS: CommandInfo[] = [
  { cmd: 'CS', description: 'Open the Crypto Screener (Watchlist). Monitor real-time basis and funding.', category: 'Navigation' },
  { cmd: 'PORT', description: 'Open the Portfolio and Carry monitor. View positions and delta aggregates.', category: 'Navigation' },
  { cmd: 'MARS', description: 'Multi-Asset Risk System. Monitor desk/strategy/trader limits and utilization.', category: 'Risk Management' },
  { cmd: 'STRAT', description: 'Strategy Control & Health. Monitor systematic strategies and apply overrides.', category: 'Operations' },
  { cmd: 'CORE', description: 'Infrastructure & Connectivity Engine. Monitor feed health, latency, and system audit logs.', category: 'Operations' },
  { cmd: 'ACCT', description: 'Account & Credential Registry. Manage API keys, subaccounts, and live account states.', category: 'Operations' },
  { cmd: 'SAVE', description: 'Open the workspace save dialog to store the current window layout.', category: 'Utility' },
  { cmd: 'H', description: 'Open this Help & Documentation system.', category: 'Utility' },
  { cmd: 'F [SYM]', description: 'Focus View. Open depth ladders and micro-metrics for a symbol.', category: 'Analytical', example: 'F BTC' },
  { cmd: 'C [SYM]', description: 'Basis Chart. Open the interactive basis/funding candlestick chart.', category: 'Analytical', example: 'C ETH' },
  { cmd: 'Q [SYM]', description: 'Futures Curve. Open the futures term structure (dated futures vs perp).', category: 'Analytical', example: 'Q SOL' },
];

interface HelpWidgetProps {
  onTriggerCommand: (cmd: string) => void;
}

const HelpWidget: React.FC<HelpWidgetProps> = ({ onTriggerCommand }) => {
  const categories = Array.from(new Set(COMMANDS.map(c => c.category)));

  return (
    <div className="h-full flex flex-col bg-[#050505] font-mono p-6 overflow-auto">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="border-b-2 border-cyan-800 pb-4 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-cyan-900 text-black px-2 py-1 font-bold text-sm">HELP</span>
            <h1 className="text-white text-xl font-bold tracking-tighter">TermiFi Command Reference</h1>
          </div>
          <p className="text-gray-500 text-xs">
            TermiFi is a command-driven execution and monitoring cockpit. Use the <span className="text-amber-600 font-bold">/</span> key to enter command mode.
          </p>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {categories.map(cat => (
            <div key={cat} className="space-y-4">
              <h2 className="text-cyan-600 text-[10px] font-bold uppercase tracking-widest border-l-2 border-cyan-900 pl-2">{cat}</h2>
              <div className="space-y-3">
                {COMMANDS.filter(c => c.category === cat).map(item => (
                  <div 
                    key={item.cmd}
                    onClick={() => onTriggerCommand(item.cmd.split(' ')[0])}
                    className="group cursor-pointer bg-neutral-900/40 border border-gray-900 hover:border-cyan-800 p-3 transition-all duration-150"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-amber-500 font-bold text-sm">/{item.cmd}</span>
                      <span className="opacity-0 group-hover:opacity-100 text-[9px] text-cyan-600 font-bold">CLICK TO ENTER</span>
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      {item.description}
                    </p>
                    {item.example && (
                      <div className="mt-2 text-[9px] text-gray-600 font-mono italic">
                        Example: {item.example}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-12 pt-8 border-t border-gray-900 text-[10px] text-gray-700 leading-loose">
          <h3 className="text-gray-500 font-bold uppercase mb-2">Interface Keybindings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-400">/</span> - Activate command entry</div>
            <div><span className="text-gray-400">CTRL+S</span> - Quick save workspace</div>
            <div><span className="text-gray-400">ESC</span> - Close command mode or modals</div>
            <div><span className="text-gray-400">⌘+ARROWS</span> - Snapping windows (floating mode)</div>
            <div><span className="text-gray-400">1, 2, 3</span> - Switch chart timeframe (active chart)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpWidget;
