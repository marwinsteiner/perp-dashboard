import React, { useState, useEffect, useRef } from 'react';

interface SaveScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

const SaveScreenModal: React.FC<SaveScreenModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setName('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div 
        className="bg-neutral-900 border border-cyan-700 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-cyan-900/20 px-4 py-2 border-b border-cyan-800 flex justify-between items-center">
          <h3 className="text-cyan-400 font-bold font-mono tracking-wider">SAVE WORKSPACE</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white font-mono">[x]</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Configuration Name</label>
            <input 
              ref={inputRef}
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-black border border-gray-700 text-white font-mono px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none uppercase placeholder-gray-800"
              placeholder="E.G. MAIN_ARB_SETUP"
              maxLength={20}
              required
            />
          </div>
          
          <div className="flex justify-end gap-2 mt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-1.5 bg-transparent border border-gray-700 text-gray-400 font-mono text-xs hover:border-gray-500 hover:text-white transition-colors"
            >
              CANCEL
            </button>
            <button 
              type="submit"
              className="px-4 py-1.5 bg-cyan-900 border border-cyan-700 text-cyan-100 font-mono text-xs font-bold hover:bg-cyan-800 transition-colors"
            >
              SAVE SCREEN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveScreenModal;