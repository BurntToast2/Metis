import { useState, useEffect } from 'react';
import { CMMRecord } from '../../shared/types/cmm';
import { CMMCard } from '../components/CMMCard';

export function CMMLibrary() {
  const [cmms, setCmms] = useState<CMMRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.api.getAllCMMs()
      .then(setCmms)
      .finally(() => setIsLoading(false));
  }, []);

  const filteredCMMs = cmms;

  return (
    <div className="cmm-library">
      <div className="cmm-library__header">
        <input
          type="text"
          placeholder="Search CMMs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="cmm-library__search"
        />
      </div>

      <div className="cmm-library__grid">
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          filteredCMMs.map((cmm) => <CMMCard key={cmm.id} cmm={cmm} />)
        )}
      </div>
    </div>
  );
}