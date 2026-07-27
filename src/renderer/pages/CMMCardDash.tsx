import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CMMRecord } from '../../shared/types/cmm';
import { SectionRef, SectionExtractionResult } from '../../shared/types/sections';
import { TestingFaultIsolationDash } from './Sections/Testing/TestingFaultIsolationDash';
import { DisassemblyDash } from './Sections/Disassembly/DisassemblyDash';
import { CleaningDash } from './Sections/Cleaning/CleaningDash';
import { InspectionDash } from './Sections/Inspection/InspectionDash';
import { CMMViewer } from '../components/CMMViewer';
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

const TASK_ENABLED_SECTIONS = ['testing-fault-isolation', 'disassembly', 'cleaning', 'inspection-check'];

const SECTION_EXTRACTORS: Record<string, (ref: SectionRef) => Promise<SectionExtractionResult>> = {
  'testing-fault-isolation': window.api.extractTestingTools,
  disassembly: window.api.extractDisassemblyTools,
  cleaning: window.api.extractCleaningTools,
  'inspection-check': window.api.extractInspectionTools,
};

function sectionLabel(sectionId: string): string {
  return sectionId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function renderSectionDash(cmm: CMMRecord, section: CMMSection, onBack: () => void) {
  switch (section.sectionId) {
    case 'testing-fault-isolation':
      return <TestingFaultIsolationDash cmm={cmm} section={section} onBack={onBack} />;
    case 'disassembly':
      return <DisassemblyDash cmm={cmm} section={section} onBack={onBack} />;
    case 'cleaning':
      return <CleaningDash cmm={cmm} section={section} onBack={onBack} />;
    case 'inspection-check':
      return <InspectionDash cmm={cmm} section={section} onBack={onBack} />;
    default:
      return null;
  }
}

export function CMMCardDash({ cmm, onBack }: CMMCardDashProps) {
  const [sections, setSections] = useState<CMMSection[]>([]);
  const [summary, setSummary] = useState<CMMSummary | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [previewsReady, setPreviewsReady] = useState(false);
  const [openTaskSection, setOpenTaskSection] = useState<CMMSection | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<Record<string, boolean>>({});
  const [extractingSectionId, setExtractingSectionId] = useState<string | null>(null);

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

  async function handleSectionClick(section: CMMSection) {
    if (!TASK_ENABLED_SECTIONS.includes(section.sectionId)) {
      setCurrentPage(section.startPage);
      return;
    }

    if (extractionStatus[section.sectionId]) {
      setOpenTaskSection(section);
      return;
    }

    const extractor = SECTION_EXTRACTORS[section.sectionId];
    if (!extractor) {
      console.error(`No extractor registered for section "${section.sectionId}"`);
      return;
    }

    setExtractingSectionId(section.sectionId);
    try {
      await extractor({ cmmId: cmm.id, sectionId: section.sectionId });
      setExtractionStatus((prev) => ({ ...prev, [section.sectionId]: true }));
      setOpenTaskSection(section);
    } catch (err) {
      console.error(`extraction failed for "${section.sectionId}":`, err);
    } finally {
      setExtractingSectionId(null);
    }
  }

  if (openTaskSection) {
    return (
      <div className="cmm-card-dash">
        {renderSectionDash(cmm, openTaskSection, () => setOpenTaskSection(null))}
      </div>
    );
  }

  if (isViewerOpen) {
    return (
      <div className="cmm-card-dash">
        <CMMViewer
          cmmId={cmm.id}
          title={cmm.title}
          initialPage={1}
          onBack={() => setIsViewerOpen(false)}
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
            <div
              className="cmm-card-dash__viewer"
              onClick={() => setIsViewerOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setIsViewerOpen(true);
              }}
            >
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
                    Object.entries(summary)
                      .filter(([key]) => !['revision', 'revisionDate', 'cmmNumber', 'manufacturer'].includes(key))
                      .map(([key, value]) => (
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
              const isExtracting = extractingSectionId === section.sectionId;

              return (
                <motion.div
                  key={section.sectionId}
                  className={`cmm-card-dash__section-card ${
                    isActive ? 'cmm-card-dash__section-card--active' : ''
                  } ${
                    isExtracting
                      ? 'cmm-card-dash__section-card--extracting'
                      : extractionKnown
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
                  {isExtracting && (
                    <p className="cmm-card-dash__section-status">Extracting…</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}