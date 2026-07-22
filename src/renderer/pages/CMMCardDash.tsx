import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CMMRecord } from '../../shared/types/cmm';
import './CMMCardDash.css';

interface CMMSection {
  sectionId: string;
  startPage: number;
  endPage: number;
}

// ASSUMPTION: shape unknown — treating it as either a plain string or a
// flat object of label/value pairs. Swap this out once the real shape is known.
type CMMSummary = string | Record<string, string | number>;

interface CMMCardDashProps {
  cmm: CMMRecord;
  onBack: () => void;
}

function sectionLabel(sectionId: string): string {
  return sectionId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function CMMCardDash({ cmm, onBack }: CMMCardDashProps) {
  const [sections, setSections] = useState<CMMSection[]>([]);
  const [summary, setSummary] = useState<CMMSummary | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [previewsReady, setPreviewsReady] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    window.api.getCmmSections(cmm.id)
      .then((sectionsData) => {
        setSections(sectionsData);
        if (sectionsData.length > 0) setCurrentPage(sectionsData[0].startPage);
      })
      .catch((err) => console.error('sections load failed:', err));

    window.api.getCmmSummary(cmm.id)
      .then(setSummary)
      .catch((err) => console.error('summary load failed:', err));

    setIsLoading(false);
  }, [cmm.id]);

  useEffect(() => {
    setPreviewsReady(false);
    window.api.ensureCmmSectionPreviews(cmm.id)
      .then(() => setPreviewsReady(true))
      .catch((err) => console.error('ensureCmmSectionPreviews failed:', err));
  }, [cmm.id]);

  const pdfUrl = `cmm-asset://asset/${cmm.id}/cmm.pdf`;

  return (
    <div className="cmm-card-dash">
      <div className="cmm-card-dash__header">
        <button className="cmm-card-dash__back" onClick={onBack}>
          ← Back to Library
        </button>
        <h2 className="cmm-card-dash__title">{cmm.title}</h2>
      </div>

      {isLoading ? (
        <p className="cmm-card-dash__loading">Loading...</p>
      ) : (
        <>
          <div className="cmm-card-dash__top">
            <div className="cmm-card-dash__viewer">
              {pdfUrl ? (
                <embed
                  key={currentPage}
                  src={`${pdfUrl}#page=${currentPage}`}
                  type="application/pdf"
                  className="cmm-card-dash__viewer-embed"
                />
              ) : (
                <p>No PDF available.</p>
              )}
            </div>

            <div className="cmm-card-dash__summary">
              <h3>Summary</h3>
              {typeof summary === 'string' ? (
                <p>{summary}</p>
              ) : (
                <dl className="cmm-card-dash__summary-list">
                  {summary &&
                    Object.entries(summary).map(([key, value]) => (
                      <div key={key} className="cmm-card-dash__summary-row">
                        <dt>{key}</dt>
                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                </dl>
              )}
              <dl className="cmm-card-dash__summary-list">
                {cmm.cmmNumber && (
                  <div className="cmm-card-dash__summary-row">
                    <dt>CMM Number</dt>
                    <dd>{cmm.cmmNumber}</dd>
                  </div>
                )}
                {cmm.manufacturer && (
                  <div className="cmm-card-dash__summary-row">
                    <dt>Manufacturer</dt>
                    <dd>{cmm.manufacturer}</dd>
                  </div>
                )}
                {cmm.revision && (
                  <div className="cmm-card-dash__summary-row">
                    <dt>Revision</dt>
                    <dd>{cmm.revision}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="cmm-card-dash__sections">
            {sections.map((section, i) => (
              <motion.div
                key={section.sectionId}
                className={`cmm-card-dash__section-card ${
                    currentPage >= section.startPage && currentPage <= section.endPage
                    ? 'cmm-card-dash__section-card--active'
                    : ''
                }`}
                onClick={() => setCurrentPage(section.startPage)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: i * 0.05 }}
                whileHover={{ y: -3, boxShadow: '0 4px 12px rgba(12, 31, 63, 0.1)' }}
                >
                {previewsReady ? (
                  <img
                    src={`cmm-asset://asset/${cmm.id}/sections/${section.sectionId}.png`}
                    alt={sectionLabel(section.sectionId)}
                    className="cmm-card-dash__section-preview"
                  />
                ) : (
                  <div className="cmm-card-dash__section-preview--placeholder">
                    <span>{sectionLabel(section.sectionId).slice(0, 1)}</span>
                  </div>
                )}
                <p className="cmm-card-dash__section-name">{sectionLabel(section.sectionId)}</p>
                <p className="cmm-card-dash__section-pages">
                  pp. {section.startPage}–{section.endPage}
                </p>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}