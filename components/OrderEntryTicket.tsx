
import React, { useState } from 'react';
import routingEngine from '../services/routingEngine';
import { Venue, Side, OrderType, RoutingMode, ExecutionAlgo } from '../types';

const OrderEntryTicket: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [routingMode, setRoutingMode] = useState<RoutingMode>('DIRECT');
  const [venue, setVenue] = useState<Venue>('BINANCE');
  const [algo, setAlgo] = useState<ExecutionAlgo>('VENUE_DEFAULT');
  const [side, setSide] = useState<Side>('LONG');
  const [type, setType] = useState<OrderType>('LIMIT');
  const [qty, setQty] = useState<string>('');
  const [price, setPrice] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !qty) return;

    await routingEngine.submitOrder({
      symbol: symbol.toUpperCase(),
      side,
      qty: parseFloat(qty),
      type,
      price: type === 'LIMIT' ? parseFloat(price) : undefined,
      routingMode,
      venue: routingMode === 'DIRECT' ? venue : undefined,
      executionAlgo: algo,
      traderId: 'MANUAL_TRADER',
      strategyId: 'DISCRETIONARY'
    });

    setQty('');
  };

  const isBuy = side === 'LONG';

  return (
    <div className="h-full flex flex-col bg-black font-mono border-t border-cyan-900/50">
      <div className="bg-neutral-900 px-3 py-1 text-[10px] text-gray-500 font-bold uppercase tracking-widest border-b border-gray-800 flex justify-between items-center">
          <span>Execution Ticket</span>
          <span className="text-cyan-700">MULTI_VENUE_ENABLED</span>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 flex-1 overflow-auto">
          {/* Routing Logic */}
          <div className="flex gap-2">
              <div className="flex-1">
                  <label className="block text-[8px] text-gray-600 uppercase mb-1 font-bold">Route Strategy</label>
                  <div className="flex bg-gray-900 p-0.5 rounded-sm">
                      <button type="button" onClick={() => setRoutingMode('DIRECT')} className={`flex-1 py-1 text-[9px] font-bold ${routingMode === 'DIRECT' ? 'bg-cyan-900 text-white' : 'text-gray-600'}`}>DIRECT</button>
                      <button type="button" onClick={() => setRoutingMode('BEST')} className={`flex-1 py-1 text-[9px] font-bold ${routingMode === 'BEST' ? 'bg-purple-900 text-white' : 'text-gray-600'}`}>BEST (SOR)</button>
                  </div>
              </div>
              {routingMode === 'DIRECT' && (
                <div className="flex-1 animate-in fade-in zoom-in-95 duration-200">
                    <label className="block text-[8px] text-gray-600 uppercase mb-1 font-bold">Venue</label>
                    <select value={venue} onChange={e => setVenue(e.target.value as Venue)} className="w-full bg-gray-900 border border-gray-700 text-gray-300 px-2 py-1 text-xs outline-none">
                        <option value="BINANCE">BINANCE</option>
                        <option value="COINBASE">COINBASE</option>
                        <option value="KRAKEN">KRAKEN</option>
                        <option value="HYPERLIQUID">HYPERLIQUID</option>
                    </select>
                </div>
              )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
                <label className="block text-[8px] text-gray-600 uppercase mb-1 font-bold">Execution Algo</label>
                <select value={algo} onChange={e => setAlgo(e.target.value as ExecutionAlgo)} className="w-full bg-gray-900 border border-gray-700 text-cyan-500 px-2 py-1 text-[10px] outline-none font-bold">
                    <option value="VENUE_DEFAULT">DEFAULT (VENUE)</option>
                    <option value="TWAP">TWAP (60 MIN)</option>
                    <option value="PASSIVE_REBATE">PASSIVE REBATE (POST)</option>
                    <option value="SMART_SWEEP">ICEBERG SWEEP</option>
                </select>
            </div>
            <div className="w-24">
                <label className="block text-[8px] text-gray-600 uppercase mb-1 font-bold">Inst.</label>
                <input type="text" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 text-xs outline-none" />
            </div>
          </div>

          {/* Side Toggle */}
          <div className="flex bg-gray-900 p-0.5 rounded-sm h-8">
             <button type="button" onClick={() => setSide('LONG')} className={`flex-1 text-xs font-bold uppercase transition-all ${isBuy ? 'bg-green-700 text-white' : 'text-gray-600 hover:text-gray-400'}`}>BUY</button>
             <button type="button" onClick={() => setSide('SHORT')} className={`flex-1 text-xs font-bold uppercase transition-all ${!isBuy ? 'bg-red-700 text-white' : 'text-gray-600 hover:text-gray-400'}`}>SELL</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-[8px] text-gray-600 uppercase mb-1">Quantity</label>
                  <input type="number" step="0.001" value={qty} onChange={e => setQty(e.target.value)} className="w-full bg-black border border-gray-800 text-white px-2 py-2 text-sm font-bold focus:border-cyan-500 outline-none" placeholder="0.00" />
              </div>
              <div>
                  <label className="block text-[8px] text-gray-600 uppercase mb-1">Price</label>
                  <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-black border border-gray-800 text-white px-2 py-2 text-sm font-bold focus:border-cyan-500 outline-none" placeholder="0.00" />
              </div>
          </div>

          <div className="mt-auto pt-4 border-t border-gray-800">
              <button type="submit" className={`w-full py-3 font-bold text-xs uppercase tracking-widest transition-all ${isBuy ? 'bg-green-800 hover:bg-green-700 text-green-100' : 'bg-red-800 hover:bg-red-700 text-red-100'}`}>
                  Route {side} Order {routingMode === 'BEST' ? '(SOR)' : `(${venue})`}
              </button>
          </div>
      </form>
    </div>
  );
};

export default OrderEntryTicket;
