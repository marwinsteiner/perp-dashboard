
import React, { useState, useEffect } from 'react';
import accountRegistryService from '../services/accountRegistryService';
import { AccountState, Credential } from '../types';
import AddCredentialModal from './AddCredentialModal';

const formatUSD = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const AccountManagerWidget: React.FC = () => {
  const [states, setStates] = useState<AccountState[]>(accountRegistryService.getAllStates());
  const [selectedAccountId, setSelectedAccountId] = useState<string>(states[0]?.accountId);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setStates([...accountRegistryService.getAllStates()]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAddCredential = (data: any) => {
    try {
      const newCred: Credential = {
        accountId: data.accountId,
        venue: data.venue,
        apiKey: data.apiKey,
        secretKey: data.secretKey,
        permissions: ['READ', 'TRADE'],
        env: 'MAINNET'
      };
      
      accountRegistryService.addCredential(newCred);
      setStates([...accountRegistryService.getAllStates()]);
      setSelectedAccountId(newCred.accountId);
      setIsModalOpen(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const activeState = states.find(s => s.accountId === selectedAccountId);

  return (
    <div className="h-full flex flex-col bg-black font-mono">
      {/* Header */}
      <div className="bg-neutral-900 border-b-2 border-indigo-800 p-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-900 text-black px-2 py-0.5 font-bold text-[10px]">ACCT</div>
          <h2 className="text-white text-xs font-bold tracking-tighter uppercase">Account & Credential Registry</h2>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-900 text-[10px] px-2 py-0.5 text-white font-bold hover:bg-indigo-800 transition-colors"
        >
          + ADD CREDENTIAL
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left: Account List */}
        <div className="w-64 border-r border-gray-800 bg-neutral-900/20">
          <div className="p-2 border-b border-gray-800 text-[9px] text-gray-500 uppercase font-bold">Registry List</div>
          <div className="overflow-auto h-full">
            {states.map(s => (
              <div 
                key={s.accountId}
                onClick={() => setSelectedAccountId(s.accountId)}
                className={`p-3 border-b border-gray-900 cursor-pointer transition-colors ${selectedAccountId === s.accountId ? 'bg-indigo-900/20 border-l-2 border-indigo-500' : 'hover:bg-gray-900/50'}`}
              >
                <div className="text-white text-[11px] font-bold mb-1">{s.accountId}</div>
                <div className="flex justify-between text-[9px]">
                  <span className="text-gray-600">{s.venue}</span>
                  <span className="text-green-800 font-bold tracking-tighter">VERIFIED</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Detailed State */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeState ? (
            <div className="flex-1 flex flex-col p-4 overflow-auto">
              {/* Balances Summary */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-neutral-900 p-3 border border-gray-800">
                  <span className="text-[9px] text-gray-500 uppercase block mb-1">Wallet Balance</span>
                  <span className="text-white text-lg font-bold">{formatUSD(activeState.totalWalletBalance)}</span>
                </div>
                <div className="bg-neutral-900 p-3 border border-gray-800">
                  <span className="text-[9px] text-gray-500 uppercase block mb-1">Unrealized PnL</span>
                  <span className={`text-lg font-bold ${activeState.totalUnrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatUSD(activeState.totalUnrealizedPnl)}
                  </span>
                </div>
                <div className="bg-neutral-900 p-3 border border-gray-800">
                  <span className="text-[9px] text-gray-500 uppercase block mb-1">Margin Balance</span>
                  <span className="text-indigo-400 text-lg font-bold">{formatUSD(activeState.totalMarginBalance)}</span>
                </div>
                <div className="bg-neutral-900 p-3 border border-gray-800">
                  <span className="text-[9px] text-gray-500 uppercase block mb-1">Available Funds</span>
                  <span className="text-green-400 text-lg font-bold">{formatUSD(activeState.availableBalance)}</span>
                </div>
              </div>

              {/* Positions Table (Reusing normalized state) */}
              <div>
                <h3 className="text-gray-500 font-bold text-[10px] uppercase mb-3 tracking-widest">Active Book Positions</h3>
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-neutral-900 text-gray-600 uppercase border-b border-gray-800">
                    <tr>
                      <th className="px-2 py-2">Symbol</th>
                      <th className="px-2 py-2">Side</th>
                      <th className="px-2 py-2 text-right">Size</th>
                      <th className="px-2 py-2 text-right">Notional</th>
                      <th className="px-2 py-2 text-right">PnL</th>
                      <th className="px-2 py-2 text-right">Mgn Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900">
                    {activeState.positions.length === 0 ? (
                      <tr><td colSpan={6} className="px-2 py-8 text-center text-gray-700 italic">NO ACTIVE RISK ON THIS ACCOUNT</td></tr>
                    ) : (
                      activeState.positions.map(p => (
                        <tr key={p.symbol} className="hover:bg-gray-900/50">
                          <td className="px-2 py-2 text-white font-bold">{p.symbol}</td>
                          <td className="px-2 py-2">
                            <span className={`px-1 rounded ${p.side === 'LONG' ? 'bg-green-900 text-green-500' : 'bg-red-900 text-red-500'}`}>{p.side}</span>
                          </td>
                          <td className="px-2 py-2 text-right font-mono">{p.quantity}</td>
                          <td className="px-2 py-2 text-right text-gray-400">{formatUSD(p.notionalUsd)}</td>
                          <td className={`px-2 py-2 text-right font-bold ${p.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatUSD(p.unrealizedPnl)}
                          </td>
                          <td className="px-2 py-2 text-right text-indigo-900">{p.marginType}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-800">SELECT AN ACCOUNT TO VIEW INFRA-STATE</div>
          )}
        </div>
      </div>

      <AddCredentialModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAddCredential}
      />
    </div>
  );
};

export default AccountManagerWidget;
