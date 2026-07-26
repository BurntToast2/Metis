import { useState, useEffect } from 'react';
import { CMMRecord } from '../../../../shared/types/cmm';
import { Task, SectionExtractionResult } from '../../../../shared/types/sections';
import { ManualView } from '../Shared/ManualView';
import { TaskBreakdown } from '../Shared/TaskBreakdown';
import { TaskDetail } from '../Shared/TaskDetail';
import './DisassemblyDash.css';

interface CMMSection {
  sectionId: string;
  startPage: number;
  endPage: number;
}

interface DisassemblyDashProps {
  cmm: CMMRecord;
  section: CMMSection;
  onBack: () => void;
}

type Tab = 'manual' | 'tasks';

export function DisassemblyDash({ cmm, section, onBack }: DisassemblyDashProps) {
  const [result, setResult] = useState<SectionExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('manual');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    window.api.extractDisassemblyTools({ cmmId: cmm.id, sectionId: section.sectionId })
      .then(setResult)
      .catch((err) => {
        console.error('extractDisassemblyTools failed:', err);
        setError('Failed to extract task data for this section.');
      })
      .finally(() => setIsLoading(false));
  }, [cmm.id, section.sectionId]);

  const selectedTask: Task | null =
    result && selectedTaskId ? result.tasks.find((t) => t.id === selectedTaskId) ?? null : null;

  const showManualView = Boolean(result) && activeTab === 'manual' && !selectedTask;

  return (
    <div className="disassembly-dash">
      <div className="disassembly-dash__header">
        <button className="disassembly-dash__back" onClick={onBack}>
          ← Back to CMM
        </button>
        <h2 className="disassembly-dash__title">Disassembly</h2>
      </div>

      {isLoading ? (
        <div className="disassembly-dash__loading">
          <div className="disassembly-dash__spinner" />
          <p>Extracting tasks and tools — this may take a moment on first open…</p>
        </div>
      ) : error ? (
        <p className="disassembly-dash__error">{error}</p>
      ) : null}

      {result && (
        <>
          {!selectedTask && (
            <div className="disassembly-dash__tabs">
              <button
                className={`disassembly-dash__tab ${activeTab === 'manual' ? 'disassembly-dash__tab--active' : ''}`}
                onClick={() => setActiveTab('manual')}
              >
                Manual View
              </button>
              <button
                className={`disassembly-dash__tab ${activeTab === 'tasks' ? 'disassembly-dash__tab--active' : ''}`}
                onClick={() => setActiveTab('tasks')}
              >
                Task Breakdown
              </button>
            </div>
          )}

          <div style={{ display: showManualView ? 'block' : 'none' }}>
            <ManualView cmmId={cmm.id} startPage={section.startPage} />
          </div>

          {selectedTask ? (
            <TaskDetail task={selectedTask} onBack={() => setSelectedTaskId(null)} />
          ) : (
            activeTab === 'tasks' && (
              <TaskBreakdown tasks={result.tasks} onSelectTask={setSelectedTaskId} />
            )
          )}
        </>
      )}
    </div>
  );
}