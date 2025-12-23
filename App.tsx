
import React, { useState } from 'react';
import CryptoDashboard from './components/CryptoDashboard';
import LoginScreen from './components/LoginScreen';
import configService from './services/configService';
import accountRegistryService from './services/accountRegistryService';
import strategyService from './services/strategyService';
import riskConfigService from './services/riskConfigService';
import paperExecutionService from './services/paperExecutionService';

type ViewState = 'LOGIN' | 'DASHBOARD';

function App() {
  const [view, setView] = useState<ViewState>('LOGIN');

  const resetServices = () => {
    accountRegistryService.reset();
    strategyService.reset();
    riskConfigService.reset();
    paperExecutionService.reset();
  };

  const handleLogin = () => {
    configService.setDemoMode(false);
    resetServices();
    setView('DASHBOARD');
  };

  const handleDemo = () => {
    configService.setDemoMode(true);
    resetServices();
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
