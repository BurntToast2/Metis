import { useState } from 'react';
import { UploadStep } from './UploadStep';

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

  if (step === 'upload') {
    return <UploadStep onFileSelected={handleFileSelected} />;
  }

  // Step 2 (PDF viewer + section extraction) isn't built yet — placeholder
  // so the flow doesn't dead-end once a file is chosen.
  return (
    <div style={{ padding: 32 }}>
      <p>File selected: {file?.name}</p>
      <p style={{ color: '#9aa3b2', fontSize: 13 }}>{filePath}</p>
      <p>Next step (PDF viewer + section extraction) coming next.</p>
    </div>
  );
}