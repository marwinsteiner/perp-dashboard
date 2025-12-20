
import React, { useState, useRef, useEffect } from 'react';

interface ControlSignOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (user: string, reason: string) => void;
  id: string;
  action: 'HALT' | 'SOFT_KILL' | 'KILL';
}

const ControlSignOffModal: React.FC<ControlSignOffModalProps> = ({ isOpen, onClose, onConfirm, id, action }) => {
  const [user, setUser] = useState('');
  const [reason, setReason] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setUser('');
      setReason('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user.trim() && reason.trim()) {
      onConfirm(user.trim().toUpperCase(), reason.trim());
    }
  };

  if (!isOpen) return null;

  const actionColor = action === 'KILL' ? 'bg-red-600 border-red-800' : action === 'SOFT_KILL' ? 'bg-orange-600 border-orange-800' : 'bg-yellow-600 border-yellow-800';

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border-2 border-red-900 w-full max-w-md shadow-[0_0_100px_rgba(220,38,38,0.2)] animate-in zoom-in-95 duration-200">
        <div className={`${actionColor} px-4 py-2 border-b flex justify-between items-center`}>
          <h3 className="text-black font-bold font-mono tracking-wider uppercase text-xs">EMERGENCY SIGN-OFF: {action}</h3>
          <button onClick={onClose} className="text-black hover:text-white font-mono font-bold">[X]</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 font-mono">
          <div className="p-3 bg-red-900/10 border border-red-900/30 text-[11px] text-red-500 font-bold mb-2">
            WARNING: YOU ARE TRIGGERING A {action} FOR {id}. ALL PENDING ORDERS MAY BE CANCELLED AND POSITIONS MAY BE LIQUIDATED.
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Authorized Person / ID</label>
            <input 
              ref={inputRef}
              type="text" 
              value={user}
              onChange={e => setUser(e.target.value)}
              className="w-full bg-black border border-gray-800 text-white px-3 py-2 text-xs focus:border-red-600 outline-none uppercase"
              placeholder="E.G. ALICE_OPS_MGR"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Reason for Intervention</label>
            <textarea 
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-black border border-gray-800 text-gray-400 px-3 py-2 text-xs h-20 focus:border-red-600 outline-none resize-none"
              placeholder="E.G. UNEXPECTED BASIS VOLATILITY EXCEEDING SAFETY PARAMS"
              required
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-gray-800 text-gray-500 text-[10px] hover:text-white hover:border-gray-600 transition-colors uppercase"
            >
              Abuse / Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-red-900 border border-red-700 text-white text-[10px] font-bold hover:bg-red-800 transition-all uppercase"
            >
              Confirm & Execute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ControlSignOffModal;
