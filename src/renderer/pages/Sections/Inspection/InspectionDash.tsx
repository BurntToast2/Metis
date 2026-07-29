import { useState } from 'react';
import { CMMRecord } from '../../../../shared/types/cmm';
import { Task, SectionExtractionResult } from '../../../../shared/types/sections';
import { ManualView } from '../Shared/ManualView';
import { TaskBreakdown } from '../Shared/TaskBreakdown';
import { TaskDetail } from '../Shared/TaskDetail';
import '../Shared/Shared.css';
import './InspectionDash.css';

interface CMMSection {
  sectionId: string;
  startPage: number;
  endPage: number;
}

interface InspectionDashProps {
  cmm: CMMRecord;
  section: CMMSection;
  result: SectionExtractionResult;
  onBack: () => void;
}

type Tab = 'manual' | 'tasks' | 'detail';

export function InspectionDash({ cmm, section, result, onBack }: InspectionDashProps) {
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
    <div className="inspection-dash">
      <div className="inspection-dash__header">
        <button className="inspection-dash__back" onClick={onBack}>
          ← Back to CMM
        </button>
        <h2 className="inspection-dash__title">Inspection / Check</h2>
      </div>

      <div className="inspection-dash__tabs">
        <button
          className={`inspection-dash__tab ${activeTab === 'manual' ? 'inspection-dash__tab--active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual View
        </button>
        <button
          className={`inspection-dash__tab ${activeTab === 'tasks' ? 'inspection-dash__tab--active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Task Breakdown
        </button>
        <button
          className={`inspection-dash__tab ${activeTab === 'detail' ? 'inspection-dash__tab--active' : ''}`}
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