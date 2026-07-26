import { ManualView } from '../pages/Sections/Shared/ManualView';
import './CMMViewer.css';

interface CMMViewerProps {
  cmmId: number;
  title: string;
  initialPage: number;
  onBack: () => void;
}

export function CMMViewer({ cmmId, title, initialPage, onBack }: CMMViewerProps) {
  return (
    <div className="cmm-viewer">
      <div className="cmm-viewer__header">
        <button className="cmm-viewer__back" onClick={onBack}>
          ← Back
        </button>
        <h2 className="cmm-viewer__title">{title}</h2>
      </div>
      <ManualView cmmId={cmmId} page={initialPage} />
    </div>
  );
}