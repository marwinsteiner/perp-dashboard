
import React, { useState } from 'react';
import paperExecutionService from '../services/paperExecutionService';
import { Venue, Side, OrderType } from '../types';

const OrderEntryTicket: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [venue, setVenue] = useState<Venue>('BINANCE_USDT_M');
  const [side, setSide] = useState<Side>('LONG');
  const [type, setType] = useState<OrderType>('LIMIT');
  const [qty, setQty] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [tif, setTif] = useState('GTC');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !qty) return;

    paperExecutionService.placeOrder({
        symbol: symbol.toUpperCase(),
        venue,
        side,
        type,
        qty: parseFloat(qty),
        price: type === 'LIMIT' ? parseFloat(price) : undefined,
        traderId: 'MANUAL_TRADER',
        strategyId: 'DISCRETIONARY'
    });

    // Reset some fields
    setQty('');
    if (type === 'MARKET') setPrice('');
    
    // Flash feedback? (Handled by audit log visual usually)
  };

  const isBuy = side === 'LONG';

  return (
    <div className="h-full flex flex-col bg-black font-mono border-t border-cyan-900/50">
      <div className="bg-neutral-900 px-3 py-1 text-[10px] text-gray-500 font-bold uppercase tracking-widest border-b border-gray-800">
          Order Entry Ticket
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 flex-1 overflow-auto">
          {/* Symbol & Venue */}
          <div className="flex gap-2">
              <div className="flex-1">
                  <label className="block text-[9px] text-gray-600 uppercase mb-1">Symbol</label>
                  <input type="text" value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} 
                    className="w-full bg-gray-900 border border-gray-700 text-white px-2 py-1 text-xs focus:border-cyan-500 outline-none" 
                  />
              </div>
              <div className="flex-1">
                  <label className="block text-[9px] text-gray-600 uppercase mb-1">Venue</label>
                  <select value={venue} onChange={e => setVenue(e.target.value as Venue)}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-300 px-2 py-1 text-xs focus:border-cyan-500 outline-none"
                  >
                      <option value="BINANCE_SPOT">SPOT</option>
                      <option value="BINANCE_USDT_M">USDT-M</option>
                      <option value="BINANCE_COIN_M">COIN-M</option>
                  </select>
              </div>
          </div>

          {/* Side Toggle */}
          <div className="flex bg-gray-900 p-0.5 rounded-sm">
             <button 
                type="button" 
                onClick={() => setSide('LONG')}
                className={`flex-1 py-1 text-xs font-bold uppercase transition-all ${isBuy ? 'bg-green-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
             >
                 BUY / LONG
             </button>
             <button 
                type="button" 
                onClick={() => setSide('SHORT')}
                className={`flex-1 py-1 text-xs font-bold uppercase transition-all ${!isBuy ? 'bg-red-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
             >
                 SELL / SHORT
             </button>
          </div>

          {/* Type & TIF */}
          <div className="flex gap-2">
              <div className="flex-1">
                   <label className="block text-[9px] text-gray-600 uppercase mb-1">Order Type</label>
                   <select value={type} onChange={e => setType(e.target.value as OrderType)}
                        className="w-full bg-gray-900 border border-gray-700 text-gray-300 px-2 py-1 text-xs focus:border-cyan-500 outline-none"
                    >
                        <option value="LIMIT">LIMIT</option>
                        <option value="MARKET">MARKET</option>
                    </select>
              </div>
              <div className="w-20">
                   <label className="block text-[9px] text-gray-600 uppercase mb-1">TIF</label>
                   <select value={tif} onChange={e => setTif(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 text-gray-300 px-2 py-1 text-xs focus:border-cyan-500 outline-none"
                    >
                        <option value="GTC">GTC</option>
                        <option value="IOC">IOC</option>
                        <option value="FOK">FOK</option>
                    </select>
              </div>
          </div>

          {/* Price & Qty */}
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-[9px] text-gray-600 uppercase mb-1">Quantity</label>
                  <input type="number" step="0.001" value={qty} onChange={e => setQty(e.target.value)} 
                    className="w-full bg-black border border-gray-700 text-white px-2 py-1 text-sm font-bold focus:border-cyan-500 outline-none" 
                    placeholder="0.00"
                  />
              </div>
              <div>
                  <label className="block text-[9px] text-gray-600 uppercase mb-1">Price</label>
                  <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} disabled={type === 'MARKET'}
                    className={`w-full bg-black border border-gray-700 px-2 py-1 text-sm font-bold focus:border-cyan-500 outline-none ${type === 'MARKET' ? 'opacity-50 text-gray-500 cursor-not-allowed' : 'text-white'}`}
                    placeholder={type === 'MARKET' ? 'MARKET' : '0.00'}
                  />
              </div>
          </div>

          <div className="mt-auto pt-4 border-t border-gray-800">
              <button 
                type="submit"
                className={`w-full py-3 font-bold text-sm uppercase tracking-wider transition-all ${isBuy ? 'bg-green-800 hover:bg-green-700 text-green-100' : 'bg-red-800 hover:bg-red-700 text-red-100'}`}
              >
                  SUBMIT {side} ORDER
              </button>
          </div>
      </form>
    </div>
  );
};

export default OrderEntryTicket;
