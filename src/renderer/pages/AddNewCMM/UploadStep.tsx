import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './UploadStep.css';

interface UploadStepProps {
  onFileSelected: (filePath: string, file: File) => void;
}

function FolderIcon({ active }: { active: boolean }) {
  return (
    <motion.svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={{ scale: active ? 1.08 : 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
    >
      {/* Back of folder */}
      <path
        d="M6 20C6 16.6863 8.68629 14 12 14H28.5L34.5 20H60C63.3137 20 66 22.6863 66 26V54C66 57.3137 63.3137 60 60 60H12C8.68629 60 6 57.3137 6 54V20Z"
        fill="#0c1f3f"
      />
      {/* Front flap — lifts slightly when active to look like it's opening */}
      <motion.path
        d="M4 30C4 27.7909 5.79086 26 8 26H64C66.2091 26 68 27.7909 68 30V54C68 57.3137 65.3137 60 62 60H10C6.68629 60 4 57.3137 4 54V30Z"
        fill="#c5a046"
        style={{ transformOrigin: '50% 100%' }}
        animate={{ rotateX: active ? -18 : 0, y: active ? -3 : 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
      />
      {/* Arrow, bounces gently to suggest "drop here" */}
      <motion.g
        animate={{ y: active ? [-2, -8, -2] : [0, -3, 0] }}
        transition={{ duration: active ? 1 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M36 48V33M36 33L29 40M36 33L43 40"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>
    </motion.svg>
  );
}

export function UploadStep({ onFileSelected }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File | undefined) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please choose a PDF file.');
      return;
    }

    setError(null);
    const filePath = window.api.getPathForFile(file);
    onFileSelected(filePath, file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const active = isDragging || isHovering;

  return (
    <div className="upload-step">
      <div
        className={`upload-step__zone ${isDragging ? 'upload-step__zone--dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <motion.div
          className="upload-step__box"
          animate={{ scale: isDragging ? 1.05 : 1, y: isDragging ? -2 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          <FolderIcon active={active} />
          <p className="upload-step__label">Upload / drag files</p>
          <p className="upload-step__hint">PDF only</p>
        </motion.div>
      </div>

      {error && <p className="upload-step__error">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="upload-step__input"
        onChange={handleInputChange}
      />
    </div>
  );
}