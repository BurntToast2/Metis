import { useState } from 'react';
import { UploadStep } from './UploadStep';
import { ExtractStep } from './ExtractStep';

type Step = 'upload' | 'extract' | 'processing';

export function AddNewCMM() {
  const [step, setStep] = useState<Step>('upload');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      console.log('CMM created with id:', result.id);
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
    <div style={{ padding: 32, textAlign: 'center' }}>
      {error ? (
        <p style={{ color: '#b3261e' }}>{error}</p>
      ) : (
        <p>Extracting CMM data — this may take a moment…</p>
      )}
    </div>
  );
}

  return (
    <ExtractStep
      file={file as File}
      filePath={filePath as string}
      onBack={handleBackToUpload}
      onContinue={handleContinue}
    />
  );
}