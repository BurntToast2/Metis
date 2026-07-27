// CleaningDash.tsx
import { useState, useEffect } from 'react';
import { CMMRecord } from '../../../../shared/types/cmm';
import { Task, SectionExtractionResult } from '../../../../shared/types/sections';
import { ManualView } from '../Shared/ManualView';
import { TaskBreakdown } from '../Shared/TaskBreakdown';
import { TaskDetail } from '../Shared/TaskDetail';
import '../Shared/Shared.css';
import './CleaningDash.css';

interface CMMSection {
  sectionId: string;
  startPage: number;
  endPage: number;
}

interface CleaningDashProps {
  cmm: CMMRecord;
  section: CMMSection;
  onBack: () => void;
}

type Tab = 'manual' | 'tasks' | 'detail';

export function CleaningDash({ cmm, section, onBack }: CleaningDashProps) {
  const [result, setResult] = useState<SectionExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('manual');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [manualPage, setManualPage] = useState(section.startPage);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    window.api.extractCleaningTools({ cmmId: cmm.id, sectionId: section.sectionId })
      .then(setResult)
      .catch((err) => {
        console.error('extractCleaningTools failed:', err);
        setError('Failed to extract task data for this section.');
      })
      .finally(() => setIsLoading(false));
  }, [cmm.id, section.sectionId]);

  const selectedTask: Task | null =
    result && selectedTaskId ? result.tasks.find((t) => t.id === selectedTaskId) ?? null : null;

  function handleSelectTask(taskId: string) {
    const task = result?.tasks.find((t) => t.id === taskId);
    setSelectedTaskId(taskId);
    if (task) {
      setManualPage(task.sourcePage);
    }
    setActiveTab('detail');
  }

  function handleBackFromDetail() {
    setActiveTab('tasks');
  }

  const showManualView = Boolean(result) && activeTab === 'manual';

  return (
    <div className="cleaning-dash">
      <div className="cleaning-dash__header">
        <button className="cleaning-dash__back" onClick={onBack}>
          ← Back to CMM
        </button>
        <h2 className="cleaning-dash__title">Cleaning</h2>
      </div>

      {isLoading ? (
        <div className="cleaning-dash__loading">
          <div className="cleaning-dash__spinner" />
          <p>Extracting tasks and tools — this may take a moment on first open…</p>
        </div>
      ) : error ? (
        <p className="cleaning-dash__error">{error}</p>
      ) : null}

      {result && (
        <>
          <div className="cleaning-dash__tabs">
            <button
              className={`cleaning-dash__tab ${activeTab === 'manual' ? 'cleaning-dash__tab--active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              Manual View
            </button>
            <button
              className={`cleaning-dash__tab ${activeTab === 'tasks' ? 'cleaning-dash__tab--active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              Task Breakdown
            </button>
            <button
              className={`cleaning-dash__tab ${activeTab === 'detail' ? 'cleaning-dash__tab--active' : ''}`}
              onClick={() => setActiveTab('detail')}
              disabled={!selectedTask}
            >
              Task Detail
            </button>
          </div>

          <div style={{ display: showManualView ? 'block' : 'none' }}>
            <ManualView cmmId={cmm.id} page={manualPage} />
          </div>

          {activeTab === 'tasks' && (
            <TaskBreakdown tasks={result.tasks} onSelectTask={handleSelectTask} />
          )}

          {activeTab === 'detail' && selectedTask && (
            <TaskDetail task={selectedTask} onBack={handleBackFromDetail} />
          )}
        </>
      )}
    </div>
  );
}