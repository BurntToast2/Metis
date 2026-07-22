import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { CMMLibrary } from './pages/CMMLibrary';
import './App.css';

export function App() {
  const [activePage, setActivePage] = useState('library');

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="app-content">
        {activePage === 'library' && <CMMLibrary />}
        {activePage === 'settings' && <p style={{ padding: 32 }}>Settings — coming soon.</p>}
      </main>
    </div>
  );
}