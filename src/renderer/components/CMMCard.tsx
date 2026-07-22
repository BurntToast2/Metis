import { motion } from 'framer-motion';
import { CMMRecord } from '../../shared/types/cmm';

interface CMMCardProps {
  cmm: CMMRecord;
  stale?: boolean;
  onClick?: (cmm: CMMRecord) => void;
}

export function CMMCard({ cmm, stale, onClick }: CMMCardProps) {
  return (
    <motion.div
      className={`cmm-card ${stale ? 'cmm-card--stale' : ''}`}
      onClick={() => onClick?.(cmm)}
      whileHover={{ y: -3, boxShadow: '0 4px 12px rgba(12, 31, 63, 0.1)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <h3 className="cmm-card__name">{cmm.title}</h3>
      {cmm.cmmNumber && <p className="cmm-card__number">{cmm.cmmNumber}</p>}
      {cmm.manufacturer && <p className="cmm-card__manufacturer">{cmm.manufacturer}</p>}
      {cmm.revision && <p className="cmm-card__revision">{cmm.revision}</p>}
    </motion.div>
  );
}