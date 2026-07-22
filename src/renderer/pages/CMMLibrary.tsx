import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CMMRecord } from '../../shared/types/cmm';
import { CMMCard } from '../components/CMMCard';
import './CMMLibrary.css';

export function CMMLibrary() {
  const [cmms, setCmms] = useState<CMMRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.api.getAllCMMs()
      .then(setCmms)
      .catch((err) => console.error('getAllCMMs failed:', err))
      .finally(() => setIsLoading(false));
  }, []);

  

  const filteredCMMs = cmms;
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

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
          <p className="cmm-library__loading">Loading...</p>
        ) : (
          filteredCMMs.map((cmm, i) => {
            const isStale = cmm.uploadedAt !== null && new Date(cmm.uploadedAt) < twoMonthsAgo;
            return (
              <motion.div
                key={cmm.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: i * 0.05 }}
              >
                <CMMCard cmm={cmm} stale={isStale} />
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}