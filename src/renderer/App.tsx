import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { CMMLibrary } from './pages/CMMLibrary';
import { AddNewCMM } from './pages/AddNewCMM/AddNewCMM';
import { CMMCardDash } from './pages/CMMCardDash';
import { CMMRecord } from '../shared/types/cmm';
import './App.css';

export function App() {
  const [activePage, setActivePage] = useState('library');
  const [selectedCmm, setSelectedCmm] = useState<CMMRecord | null>(null);

  const handleSelectCmm = (cmm: CMMRecord) => {
    setSelectedCmm(cmm);
    setActivePage('cmm-dash');
  };

  const handleBackToLibrary = () => {
    setActivePage('library');
  };

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="app-content">
        {activePage === 'library' && <CMMLibrary onSelectCmm={handleSelectCmm} />}
        {activePage === 'cmm-add' && <AddNewCMM />}
        {activePage === 'cmm-dash' && selectedCmm && (
          <CMMCardDash cmm={selectedCmm} onBack={handleBackToLibrary} />
        )}
        {activePage === 'settings' && <p style={{ padding: 32 }}>Settings — coming soon.</p>}
      </main>
    </div>
  );
}