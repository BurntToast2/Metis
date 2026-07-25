import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CMMRecord } from '../../shared/types/cmm';
import { TestingFaultIsolationDash } from './Sections/Testing/TestingFaultIsolationDash';
import './CMMCardDash.css';

interface CMMSection {
  sectionId: string;
  startPage: number;
  endPage: number;
}

type CMMSummary = string | Record<string, string | number>;

interface CMMCardDashProps {
  cmm: CMMRecord;
  onBack: () => void;
}

const TASK_ENABLED_SECTIONS = ['testing-fault-isolation'];

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
  const [openTaskSection, setOpenTaskSection] = useState<CMMSection | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    if (sections.length === 0) return;

    Promise.all(
      sections.map((s) =>
        window.api
          .hasExtractedSection({ cmmId: cmm.id, sectionId: s.sectionId })
          .then((has) => [s.sectionId, has] as const),
      ),
    )
      .then((entries) => setExtractionStatus(Object.fromEntries(entries)))
      .catch((err) => console.error('extraction status check failed:', err));
  }, [cmm.id, sections]);

  function handleSectionClick(section: CMMSection) {
    if (TASK_ENABLED_SECTIONS.includes(section.sectionId)) {
      setOpenTaskSection(section);
    } else {
      setCurrentPage(section.startPage);
    }
  }

  if (openTaskSection) {
    return (
      <div className="cmm-card-dash">
        <TestingFaultIsolationDash
          cmm={cmm}
          section={openTaskSection}
          onBack={() => setOpenTaskSection(null)}
        />
      </div>
    );
  }

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
              <img
                src={`cmm-asset://asset/${cmm.id}/cover.png`}
                alt={cmm.title}
                className="cmm-card-dash__viewer-cover"
              />
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
            {sections.map((section, i) => {
              const isActive = currentPage >= section.startPage && currentPage <= section.endPage;
              const extractionKnown = section.sectionId in extractionStatus;
              const isExtracted = extractionStatus[section.sectionId];

              return (
                <motion.div
                  key={section.sectionId}
                  className={`cmm-card-dash__section-card ${
                    isActive ? 'cmm-card-dash__section-card--active' : ''
                  } ${
                    extractionKnown
                      ? isExtracted
                        ? 'cmm-card-dash__section-card--extracted'
                        : 'cmm-card-dash__section-card--not-extracted'
                      : ''
                  }`}
                  onClick={() => handleSectionClick(section)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18, delay: i * 0.01 }}
                  whileHover={{
                    y: -24,
                    scale: 1.04,
                    zIndex: 10,
                    boxShadow: '0 16px 28px rgba(12, 31, 63, 0.22)',
                    transition: { type: 'spring', stiffness: 350, damping: 20 },
                  }}
                  style={{ transformOrigin: 'bottom center' }}
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
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}