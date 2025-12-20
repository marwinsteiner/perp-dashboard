
import React, { useState, useEffect } from 'react';
import coreDataService from '../services/coreDataService';
import auditLogService from '../services/auditLogService';
import { FeedHealth, AuditEntry } from '../types';

const CoreInfraWidget: React.FC = () => {
  const [health, setHealth] = useState<FeedHealth[]>(coreDataService.getHealth());
  const [logs, setLogs] = useState<AuditEntry[]>(auditLogService.getLogs().slice(-50));

  useEffect(() => {
    const timer = setInterval(() => {
      setHealth([...coreDataService.getHealth()]);
      setLogs([...auditLogService.getLogs().slice(-50)]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#050505] font-mono">
      {/* Header */}
      <div className="bg-neutral-900 border-b-2 border-cyan-800 p-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-900 text-black px-2 py-0.5 font-bold text-[10px]">CORE</div>
          <h2 className="text-white text-xs font-bold tracking-tighter uppercase">Infrastructure & Connectivity Engine</h2>
        </div>
        <div className="text-[10px] text-gray-500 uppercase">SYS_UPTIME: 142h 12m 04s</div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Health Matrix */}
        <div className="w-1/3 border-r border-gray-800 flex flex-col">
          <div className="p-3 border-b border-gray-800">
            <h3 className="text-cyan-600 font-bold text-[10px] uppercase mb-3 tracking-widest">Feed Health Matrix</h3>
            <div className="space-y-4">
              {health.map(f => (
                <div key={f.venue} className="bg-black border border-gray-900 p-2 rounded-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-300 text-[10px] font-bold">{f.venue.replace('BINANCE_', '')}</span>
                    <span className={`text-[9px] font-bold ${f.status === 'CONNECTED' ? 'text-green-500' : 'text-red-500'}`}>
                      {f.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[9px] text-gray-600">
                    <div className="flex justify-between"><span>LATENCY</span><span className="text-white">{f.latencyMs}ms</span></div>
                    <div className="flex justify-between"><span>MSGS</span><span className="text-white">{f.messageCount.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>ERRS</span><span className="text-red-800">{f.errorCount}</span></div>
                    <div className="flex justify-between"><span>SYNC</span><span className="text-cyan-900">100.0%</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-3 flex-1 overflow-auto">
            <h3 className="text-gray-500 font-bold text-[10px] uppercase mb-2">Storage Stats</h3>
            <div className="space-y-1 text-[10px]">
                <div className="flex justify-between"><span className="text-gray-700">L3 TICK DATABASE</span><span className="text-white">1.2 GB</span></div>
                <div className="flex justify-between"><span className="text-gray-700">AUDIT LOG VOL</span><span className="text-white">45.8 MB</span></div>
                <div className="flex justify-between"><span className="text-gray-700">COMPRESSION</span><span className="text-green-900">4.2x (LZ4)</span></div>
            </div>
          </div>
        </div>

        {/* Right: Unified Audit Log */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-2 bg-neutral-900/50 border-b border-gray-800 flex justify-between items-center">
            <span className="text-gray-500 font-bold text-[10px] uppercase">Append-Only Audit Log (Live)</span>
            <div className="flex gap-2">
                <button className="text-[8px] bg-gray-800 px-2 py-0.5 text-gray-400">EXPORT_JSON</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2 bg-black/40">
            <table className="w-full text-left table-fixed border-collapse">
              <thead className="text-[8px] text-gray-700 uppercase border-b border-gray-800 sticky top-0 bg-[#050505] z-10">
                <tr>
                  <th className="w-24 px-1 py-1">Timestamp</th>
                  <th className="w-20 px-1 py-1">Source</th>
                  <th className="w-16 px-1 py-1">Type</th>
                  <th className="w-28 px-1 py-1">Person/Trader</th>
                  <th className="px-1 py-1">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900/30">
                {logs.slice().reverse().map((entry, i) => (
                  <tr key={i} className="text-[9px] hover:bg-gray-900/20">
                    <td className="px-1 py-1 text-gray-500 whitespace-nowrap">{new Date(entry.timestamp).toISOString().split('T')[1].replace('Z','')}</td>
                    <td className="px-1 py-1 text-cyan-800 font-bold truncate">{entry.source}</td>
                    <td className={`px-1 py-1 font-bold ${
                      entry.type === 'TRADE' ? 'text-green-500' : 
                      entry.type === 'RISK' ? 'text-red-500' : 
                      entry.type === 'COMMAND' ? 'text-amber-500' : 'text-gray-600'
                    }`}>{entry.type}</td>
                    <td className="px-1 py-1 text-gray-300 font-mono truncate uppercase">{entry.user || 'SYSTEM'}</td>
                    <td className="px-1 py-1 text-gray-400 truncate">{entry.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoreInfraWidget;
