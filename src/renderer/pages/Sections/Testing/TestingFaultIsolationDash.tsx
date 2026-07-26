import { useState, useEffect } from 'react';
import { CMMRecord } from '../../../../shared/types/cmm';
import { Task, SectionExtractionResult } from '../../../../shared/types/sections';
import { ManualView } from '../Shared/ManualView';
import { TaskBreakdown } from '../Shared/TaskBreakdown';
import { TaskDetail } from '../Shared/TaskDetail';
import '../Shared/Shared.css';
import './TestingFaultIsolationDash.css';

interface CMMSection {
  sectionId: string;
  startPage: number;
  endPage: number;
}

interface TestingFaultIsolationDashProps {
  cmm: CMMRecord;
  section: CMMSection;
  onBack: () => void;
}

type Tab = 'manual' | 'tasks' | 'detail';

export function TestingFaultIsolationDash({ cmm, section, onBack }: TestingFaultIsolationDashProps) {
  const [result, setResult] = useState<SectionExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('manual');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [manualPage, setManualPage] = useState(section.startPage);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    window.api.extractTestingTools({ cmmId: cmm.id, sectionId: section.sectionId })
      .then(setResult)
      .catch((err) => {
        console.error('extractTestingTools failed:', err);
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
    <div className="tfi-dash">
      <div className="tfi-dash__header">
        <button className="tfi-dash__back" onClick={onBack}>
          ← Back to CMM
        </button>
        <h2 className="tfi-dash__title">Testing &amp; Fault Isolation</h2>
      </div>

      {isLoading ? (
        <div className="tfi-dash__loading">
          <div className="tfi-dash__spinner" />
          <p>Extracting tasks and tools — this may take a moment on first open…</p>
        </div>
      ) : error ? (
        <p className="tfi-dash__error">{error}</p>
      ) : null}

      {result && (
        <>
          <div className="tfi-dash__tabs">
            <button
              className={`tfi-dash__tab ${activeTab === 'manual' ? 'tfi-dash__tab--active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              Manual View
            </button>
            <button
              className={`tfi-dash__tab ${activeTab === 'tasks' ? 'tfi-dash__tab--active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              Task Breakdown
            </button>
            <button
              className={`tfi-dash__tab ${activeTab === 'detail' ? 'tfi-dash__tab--active' : ''}`}
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