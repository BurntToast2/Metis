import { useState } from 'react';
import { UploadStep } from './UploadStep';
import { ExtractStep } from './ExtractStep';

type Step = 'upload' | 'extract';

export function AddNewCMM() {
  const [step, setStep] = useState<Step>('upload');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelected = (path: string, selectedFile: File) => {
    setFilePath(path);
    setFile(selectedFile);
    setStep('extract');
  };

  const handleBackToUpload = () => {
    setStep('upload');
  };

  const handleContinue = (selectedSectionIds: string[]) => {
    // Next step (actual extraction/processing) isn't built yet.
    console.log('Selected sections:', selectedSectionIds);
  };

  if (step === 'upload') {
    return <UploadStep onFileSelected={handleFileSelected} />;
  }

  // step === 'extract'
  return (
    <ExtractStep
      file={file as File}
      filePath={filePath as string}
      onBack={handleBackToUpload}
      onContinue={handleContinue}
    />
  );
}