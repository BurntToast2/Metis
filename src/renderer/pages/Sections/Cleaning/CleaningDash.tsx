// CleaningDash.tsx
import { useState } from 'react';
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
  result: SectionExtractionResult;
  onBack: () => void;
}

type Tab = 'manual' | 'tasks' | 'detail';

// Same change as InspectionDash: result is now passed in by CMMCardDash
// rather than fetched here, removing a redundant IPC round trip.
export function CleaningDash({ cmm, section, result, onBack }: CleaningDashProps) {
  const [activeTab, setActiveTab] = useState<Tab>('manual');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [manualPage, setManualPage] = useState(section.startPage);

  const selectedTask: Task | null = selectedTaskId
    ? result.tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  function handleSelectTask(taskId: string) {
    const task = result.tasks.find((t) => t.id === taskId);
    setSelectedTaskId(taskId);
    if (task) {
      setManualPage(task.sourcePage);
    }
    setActiveTab('detail');
  }

  function handleBackFromDetail() {
    setActiveTab('tasks');
  }

  const showManualView = activeTab === 'manual';

  return (
    <div className="cleaning-dash">
      <div className="cleaning-dash__header">
        <button className="cleaning-dash__back" onClick={onBack}>
          ← Back to CMM
        </button>
        <h2 className="cleaning-dash__title">Cleaning</h2>
      </div>

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
    </div>
  );
}