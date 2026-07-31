import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { MissingReference } from '../../../../shared/types/referenceManuals';

interface MissingReferenceCardProps {
  reference: MissingReference;
  onUploaded: () => void;
}

export function MissingReferenceCard({ reference, onUploaded }: MissingReferenceCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const filePath = window.api.getPathForFile(file);
      await window.api.uploadReferenceManual({
        filePath,
        manualType: reference.manualType,
        platform: reference.platform,
      });
      onUploaded();
    } catch (err) {
      console.error(`upload failed for reference "${reference.key}":`, err);
      setError('Upload failed — try again.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  // taskIds and sourcePages are parallel arrays (same index = same
  // citation) — zip them for display rather than showing a bare count.
  const citations = reference.taskIds.map((taskId, i) => ({
    taskId,
    page: reference.sourcePages[i],
  }));

  return (
    <div className="missing-reference-card">
      <div className="missing-reference-card__info">
        <p className="missing-reference-card__manual">
          {reference.manualType} {reference.rawDocNumber}
        </p>
        <ul className="missing-reference-card__citations">
          {citations.map(({ taskId, page }) => (
            <li key={taskId} className="missing-reference-card__citation">
              Task {taskId}{page ? `, p. ${page}` : ''}
            </li>
          ))}
        </ul>
        {error && <p className="missing-reference-card__error">{error}</p>}
      </div>

      <label className="missing-reference-card__upload">
        {isUploading ? 'Uploading…' : 'Upload'}
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={isUploading}
          className="missing-reference-card__input"
        />
      </label>
    </div>
  );
}