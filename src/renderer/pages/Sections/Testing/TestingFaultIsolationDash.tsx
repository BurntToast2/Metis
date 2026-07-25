import { useState, useEffect } from 'react';
import { CMMRecord } from '../../../../shared/types/cmm';
import { Task, TestingExtractionResult } from '../../../../shared/types/testing';
import { ManualView } from './ManualView';
import { TaskBreakdown } from './TaskBreakdown';
import { TaskDetail } from './TaskDetail';
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

type Tab = 'manual' | 'tasks';

export function TestingFaultIsolationDash({ cmm, section, onBack }: TestingFaultIsolationDashProps) {
  const [result, setResult] = useState<TestingExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('manual');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
      ) : !result ? null : selectedTask ? (
        <TaskDetail task={selectedTask} onBack={() => setSelectedTaskId(null)} />
      ) : (
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
          </div>

          {activeTab === 'manual' ? (
            <ManualView cmmId={cmm.id} startPage={section.startPage} />
          ) : (
            <TaskBreakdown tasks={result.tasks} onSelectTask={setSelectedTaskId} />
          )}
        </>
      )}
    </div>
  );
}