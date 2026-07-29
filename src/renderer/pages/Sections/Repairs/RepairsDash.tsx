import { useState } from 'react';
import { CMMRecord } from '../../../../shared/types/cmm';
import { Task, SectionExtractionResult } from '../../../../shared/types/sections';
import { ManualView } from '../Shared/ManualView';
import { TaskBreakdown } from '../Shared/TaskBreakdown';
import { TaskDetail } from '../Shared/TaskDetail';
import '../Shared/Shared.css';
import './RepairsDash.css';

interface CMMSection {
  sectionId: string;
  startPage: number;
  endPage: number;
}

interface RepairsDashProps {
  cmm: CMMRecord;
  section: CMMSection;
  result: SectionExtractionResult;
  onBack: () => void;
}

type Tab = 'manual' | 'tasks' | 'detail';

export function RepairsDash({ cmm, section, result, onBack }: RepairsDashProps) {
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
    <div className="repairs-dash">
      <div className="repairs-dash__header">
        <button className="repairs-dash__back" onClick={onBack}>
          ← Back to CMM
        </button>
        <h2 className="repairs-dash__title">Repairs</h2>
      </div>

      <div className="repairs-dash__tabs">
        <button
          className={`repairs-dash__tab ${activeTab === 'manual' ? 'repairs-dash__tab--active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual View
        </button>
        <button
          className={`repairs-dash__tab ${activeTab === 'tasks' ? 'repairs-dash__tab--active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Task Breakdown
        </button>
        <button
          className={`repairs-dash__tab ${activeTab === 'detail' ? 'repairs-dash__tab--active' : ''}`}
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
        <TaskBreakdown
          cmmId={cmm.id}
          sectionId={section.sectionId}
          tasks={result.tasks}
          onSelectTask={handleSelectTask}
        />
      )}

      {activeTab === 'detail' && selectedTask && (
        <TaskDetail task={selectedTask} onBack={handleBackFromDetail} />
      )}
    </div>
  );
}