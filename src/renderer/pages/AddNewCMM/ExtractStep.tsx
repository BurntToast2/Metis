import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import './ExtractStep.css';

interface Section {
  id: string;
  label: string;
  color: string;
  textColor?: string;
}

const SECTIONS: Section[] = [
  { id: 'testing-fault-isolation', label: 'Testing & Fault Isolation', color: '#EDE2C9' },
  { id: 'schematics-wiring', label: 'Schematics & Wiring Diagrams', color: '#E7DECE' },
  { id: 'disassembly', label: 'Disassembly', color: '#E1DAD3' },
  { id: 'cleaning', label: 'Cleaning', color: '#DBD6D8' },
  { id: 'inspection-check', label: 'Inspection / Check', color: '#D5D2DC' },
  { id: 'repairs', label: 'Repairs', color: '#CFCEE1' },
  { id: 'assembly', label: 'Assembly', color: '#C9CAE6' },
  { id: 'fits-clearances', label: 'Fits & Clearances', color: '#C3C6EB' },
  { id: 'special-tools', label: 'Special Tools, Fixtures & Clearances', color: '#BDC2F0' },
  { id: 'illustrated-parts-list', label: 'Illustrated Parts List', color: '#B7BEF5' },
];

interface ExtractStepProps {
  file: File;
  filePath: string;
  onBack: () => void;
  onContinue: (selectedSectionIds: string[]) => void;
}

export function ExtractStep({ file, filePath, onBack, onContinue }: ExtractStepProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(SECTIONS.map((section) => section.id))
  );
  const fileUrl = useMemo(() => window.api.toFileUrl(filePath), [filePath]);

  const toggleSection = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="extract-step">
      <div className="extract-step__topbar">
        <div className="extract-step__title">
          <button className="extract-step__back" onClick={onBack} aria-label="Back">
            &lsaquo;
          </button>
          <span>{file.name}</span>
        </div>
        <motion.button
          className="extract-step__continue"
          disabled={selected.size === 0}
          onClick={() => onContinue(Array.from(selected))}
          whileHover={selected.size > 0 ? { y: -2 } : {}}
          whileTap={selected.size > 0 ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          Continue{selected.size > 0 ? ` (${selected.size})` : ''}
        </motion.button>
      </div>

      <div className="extract-step__body">
        <div className="extract-step__viewer">
          <embed src={fileUrl} type="application/pdf" className="extract-step__pdf" />
        </div>

        <div className="extract-step__sections">
          {SECTIONS.map((section) => {
            const isSelected = selected.has(section.id);
            return (
              <motion.button
                key={section.id}
                className={`extract-step__section ${isSelected ? 'extract-step__section--selected' : ''}`}
                style={{ background: section.color, color: section.textColor ?? '#0c1f3f' }}
                onClick={() => toggleSection(section.id)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              >
                <span>{section.label}</span>
                {isSelected && <span className="extract-step__check">&#10003;</span>}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}