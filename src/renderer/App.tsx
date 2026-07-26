import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { CMMLibrary } from './pages/CMMLibrary';
import { AddNewCMM } from './pages/AddNewCMM/AddNewCMM';
import { CMMCardDash } from './pages/CMMCardDash';
import { CMMViewer } from './components/CMMViewer';
import { SearchPage } from './components/Search/SearchPage';
import { CMMRecord } from '../shared/types/cmm';
import './App.css';

export function App() {
  const [activePage, setActivePage] = useState('library');
  const [selectedCmm, setSelectedCmm] = useState<CMMRecord | null>(null);
  const [searchViewerTarget, setSearchViewerTarget] = useState<{
    cmmId: number;
    title: string;
    page: number;
  } | null>(null);

  const handleSelectCmm = (cmm: CMMRecord) => {
    setSelectedCmm(cmm);
    setActivePage('cmm-dash');
  };

  const handleBackToLibrary = () => {
    setActivePage('library');
  };

  const handleOpenSearchResult = (cmmId: number, title: string, page: number) => {
    setSearchViewerTarget({ cmmId, title, page });
    setActivePage('search-viewer');
  };

  const handleBackToSearch = () => {
    setSearchViewerTarget(null);
    setActivePage('search');
  };

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="app-content">
        {activePage === 'library' && <CMMLibrary onSelectCmm={handleSelectCmm} />}
        {activePage === 'cmm-add' && <AddNewCMM onCmmReady={handleSelectCmm} />}
        {activePage === 'cmm-dash' && selectedCmm && (
          <CMMCardDash cmm={selectedCmm} onBack={handleBackToLibrary} />
        )}
        {activePage === 'search' && <SearchPage onOpenResult={handleOpenSearchResult} />}
        {activePage === 'search-viewer' && searchViewerTarget && (
          <CMMViewer
            cmmId={searchViewerTarget.cmmId}
            title={searchViewerTarget.title}
            initialPage={searchViewerTarget.page}
            onBack={handleBackToSearch}
          />
        )}
        {activePage === 'settings' && <p style={{ padding: 32 }}>Settings — coming soon.</p>}
      </main>
    </div>
  );
}