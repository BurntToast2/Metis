import { CMMRecord } from '../../shared/types/cmm';

interface CMMCardProps {
  cmm: CMMRecord;
  onClick?: (cmm: CMMRecord) => void;
}

export function CMMCard({ cmm, onClick }: CMMCardProps) {
  return (
    <div className="cmm-card" onClick={() => onClick?.(cmm)}>
      <div className="cmm-card__thumbnail">
        {cmm.thumbnailPath ? (
          <img src={cmm.thumbnailPath} alt={`${cmm.name} cover`} />
        ) : (
          <div className="cmm-card__thumbnail-placeholder" />
        )}
      </div>
      <div className="cmm-card__body">
        <h3 className="cmm-card__name">{cmm.name}</h3>
        <p className="cmm-card__description">{cmm.description}</p>
      </div>
    </div>
  );
}