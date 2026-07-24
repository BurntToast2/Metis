import { useState } from 'react';
import { motion } from 'framer-motion';
import { UploadStep } from './UploadStep';
import { ExtractStep } from './ExtractStep';
import { CMMRecord } from '../../../shared/types/cmm';
import './AddNewCMM.css';

type Step = 'upload' | 'extract' | 'processing' | 'success';

interface AddNewCMMProps {
  onCmmReady: (cmm: CMMRecord) => void;
}

export function AddNewCMM({ onCmmReady }: AddNewCMMProps) {
  const [step, setStep] = useState<Step>('upload');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdCmm, setCreatedCmm] = useState<CMMRecord | null>(null);

  const handleFileSelected = (path: string, selectedFile: File) => {
    setFilePath(path);
    setFile(selectedFile);
    setStep('extract');
  };

  const handleBackToUpload = () => {
    setStep('upload');
  };

  const handleContinue = async (selectedSectionIds: string[]) => {
    setStep('processing');
    setError(null);
    try {
      const result = await window.api.processNewCmm(filePath as string, selectedSectionIds);
      const allCmms = await window.api.getAllCMMs();
      const cmm = allCmms.find((c) => c.id === result.id);

      if (!cmm) {
        throw new Error(`Created CMM (id ${result.id}) not found in library after processing.`);
      }

      setCreatedCmm(cmm);
      setStep('success');
    } catch (err) {
      console.error(err);
      setError('Failed to process CMM. Please try again.');
      setStep('extract'); 
    }
  };

  if (step === 'upload') {
    return <UploadStep onFileSelected={handleFileSelected} />;
  }

  if (step === 'processing') {
    return (
      <div className="add-cmm-status">
        <motion.div
          className="add-cmm-status__spinner"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
        <p className="add-cmm-status__message">Extracting CMM data — this may take a moment…</p>
      </div>
    );
  }

  if (step === 'success' && createdCmm) {
    return (
      <div className="add-cmm-status">
        <motion.div
          className="add-cmm-status__check"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          ✓
        </motion.div>
        <h3 className="add-cmm-status__title">{createdCmm.title}</h3>
        <p className="add-cmm-status__message">Processed and added to your library.</p>
        <button
          className="add-cmm-status__button"
          onClick={() => onCmmReady(createdCmm)}
        >
          View CMM →
        </button>
      </div>
    );
  }

  return (
    <>
      {error && <p className="add-cmm-status__error">{error}</p>}
      <ExtractStep
        file={file as File}
        filePath={filePath as string}
        onBack={handleBackToUpload}
        onContinue={handleContinue}
      />
    </>
  );
}