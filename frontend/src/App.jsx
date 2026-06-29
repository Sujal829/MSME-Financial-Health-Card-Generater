import React, { useState } from 'react';
import LandingPage from './pages/LandingPage';
import MSMEPortal from './pages/MSMEPortal';
import BankPortal from './pages/BankPortal';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'msme' | 'bank'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
      {view === 'landing' && <LandingPage setView={setView} />}
      {view === 'msme' && <MSMEPortal setView={setView} />}
      {view === 'bank' && <BankPortal setView={setView} />}
    </div>
  );
}
