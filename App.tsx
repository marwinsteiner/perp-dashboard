
import React, { useState } from 'react';
import CryptoDashboard from './components/CryptoDashboard';
import LoginScreen from './components/LoginScreen';
import configService from './services/configService';

type ViewState = 'LOGIN' | 'DASHBOARD';

function App() {
  const [view, setView] = useState<ViewState>('LOGIN');

  const handleLogin = () => {
    configService.setDemoMode(false);
    setView('DASHBOARD');
  };

  const handleDemo = () => {
    configService.setDemoMode(true);
    setView('DASHBOARD');
  };

  const handleLogout = () => {
    // Reset any session state here if needed
    setView('LOGIN');
  };

  if (view === 'LOGIN') {
    return <LoginScreen onLogin={handleLogin} onDemo={handleDemo} />;
  }

  return (
    <CryptoDashboard onLogout={handleLogout} />
  );
}

export default App;
