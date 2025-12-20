
import React, { useState, useRef, useEffect } from 'react';
import { Venue } from '../types';

interface AddCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (cred: { accountId: string; venue: Venue; apiKey: string; secretKey: string }) => void;
}

const AddCredentialModal: React.FC<AddCredentialModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    accountId: '',
    venue: 'BINANCE_USDT_M' as Venue,
    apiKey: '',
    secretKey: ''
  });
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setFormData({ accountId: '', venue: 'BINANCE_USDT_M', apiKey: '', secretKey: '' });
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.accountId && formData.apiKey && formData.secretKey) {
      onAdd(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border-2 border-indigo-800 w-full max-w-md shadow-[0_0_50px_rgba(67,56,202,0.3)] animate-in zoom-in-95 duration-200">
        <div className="bg-indigo-900/20 px-4 py-2 border-b border-indigo-800 flex justify-between items-center">
          <h3 className="text-indigo-400 font-bold font-mono tracking-wider uppercase text-sm">Registry: New Credential</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white font-mono">[x]</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 font-mono">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Account ID</label>
              <input 
                ref={inputRef}
                type="text" 
                value={formData.accountId}
                onChange={e => setFormData({ ...formData, accountId: e.target.value.toUpperCase() })}
                className="w-full bg-black border border-gray-800 text-white px-3 py-2 text-xs focus:border-indigo-500 outline-none"
                placeholder="E.G. SUB_ACC_01"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Venue</label>
              <select 
                value={formData.venue}
                onChange={e => setFormData({ ...formData, venue: e.target.value as Venue })}
                className="w-full bg-black border border-gray-800 text-white px-3 py-2 text-xs focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value="BINANCE_SPOT">BINANCE SPOT</option>
                <option value="BINANCE_USDT_M">BINANCE USDT-M</option>
                <option value="BINANCE_COIN_M">BINANCE COIN-M</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">API Key</label>
            <input 
              type="text" 
              value={formData.apiKey}
              onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
              className="w-full bg-black border border-gray-800 text-gray-400 px-3 py-2 text-xs focus:border-indigo-500 outline-none"
              placeholder="vX6...9kL"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Secret Key</label>
            <input 
              type="password" 
              value={formData.secretKey}
              onChange={e => setFormData({ ...formData, secretKey: e.target.value })}
              className="w-full bg-black border border-gray-800 text-gray-400 px-3 py-2 text-xs focus:border-indigo-500 outline-none"
              placeholder="••••••••••••••••"
              required
            />
          </div>

          <div className="mt-4 p-2 bg-indigo-900/10 border border-indigo-900/30 text-[9px] text-indigo-400 italic leading-relaxed">
            SYSTEM_NOTE: Credentials are encrypted in transit and used exclusively by the OMS engine.
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-1.5 border border-gray-800 text-gray-500 text-[10px] hover:text-white hover:border-gray-600 transition-colors uppercase"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-1.5 bg-indigo-900 border border-indigo-700 text-indigo-100 text-[10px] font-bold hover:bg-indigo-800 transition-all uppercase"
            >
              Register Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCredentialModal;
