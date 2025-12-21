
import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: () => void;
  onDemo: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onDemo }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth delay
    setTimeout(() => {
        setLoading(false);
        onLogin();
    }, 800);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono selection:bg-cyan-900 selection:text-white relative overflow-hidden">
        {/* Grid Background Effect */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>

        <div className="w-full max-w-md p-8 relative z-10 border border-gray-800 bg-neutral-900/50 backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="text-center mb-8 border-b border-gray-800 pb-6">
                <h1 className="text-3xl font-bold text-cyan-500 tracking-tighter mb-2">TERMIFI</h1>
                <p className="text-xs text-gray-500 uppercase tracking-[0.3em]">Institutional OMS & Arbitrage Terminal</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-[10px] uppercase text-gray-500 mb-1 tracking-wider">Access ID</label>
                    <input 
                        type="text" 
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-black border border-gray-700 text-cyan-500 p-2 text-sm focus:border-cyan-500 outline-none transition-colors"
                        placeholder="TRADER_ID"
                    />
                </div>
                <div>
                    <label className="block text-[10px] uppercase text-gray-500 mb-1 tracking-wider">Secure Key</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-black border border-gray-700 text-cyan-500 p-2 text-sm focus:border-cyan-500 outline-none transition-colors"
                        placeholder="••••••••"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-cyan-900 border border-cyan-700 text-cyan-100 py-2 text-xs font-bold uppercase tracking-widest hover:bg-cyan-800 hover:border-cyan-500 transition-all disabled:opacity-50"
                >
                    {loading ? 'AUTHENTICATING...' : 'ESTABLISH UPLINK'}
                </button>
            </form>

            <div className="my-6 flex items-center gap-4">
                <div className="h-px bg-gray-800 flex-1"></div>
                <span className="text-[9px] text-gray-600 uppercase">Or</span>
                <div className="h-px bg-gray-800 flex-1"></div>
            </div>

            <button 
                onClick={onDemo}
                className="w-full bg-amber-900/20 border border-amber-900/50 text-amber-500 py-2 text-xs font-bold uppercase tracking-widest hover:bg-amber-900/40 hover:border-amber-600 transition-all"
            >
                Launch Simulation Environment
            </button>

            <div className="mt-8 text-center">
                <p className="text-[9px] text-gray-600">
                    SECURE CONNECTION :: ENCRYPTED 256-BIT
                    <br />
                    UNAUTHORIZED ACCESS IS PROHIBITED
                </p>
            </div>
        </div>

        <div className="absolute bottom-4 text-[9px] text-gray-700">
            TermiFi v2.4.0-Stable | System Status: <span className="text-green-800">OPTIMAL</span>
        </div>
    </div>
  );
};

export default LoginScreen;
