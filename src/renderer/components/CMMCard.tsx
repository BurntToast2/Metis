import { CMMRecord } from '../../shared/types/cmm';

interface CMMCardProps {
  cmm: CMMRecord;
  onClick?: (cmm: CMMRecord) => void;
}

export function CMMCard({ cmm, onClick }: CMMCardProps) {
  return (
    <div className="cmm-card" onClick={() => onClick?.(cmm)}>
      <div className="cmm-card__thumbnail">
        <div className="cmm-card__thumbnail-placeholder" />
      </div>
      <div className="cmm-card__body">
        <h3 className="cmm-card__name">{cmm.title}</h3>
        {cmm.cmmNumber && <p className="cmm-card__number">{cmm.cmmNumber}</p>}
        {cmm.manufacturer && <p className="cmm-card__manufacturer">{cmm.manufacturer}</p>}
        {cmm.revision && <p className="cmm-card__revision">{cmm.revision}</p>}
      </div>
    </div>
  );
}