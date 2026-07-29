import { useState } from 'react';
import { CMMRecord } from '../../../../shared/types/cmm';
import { Task, SectionExtractionResult } from '../../../../shared/types/sections';
import { ManualView } from '../Shared/ManualView';
import { TaskBreakdown } from '../Shared/TaskBreakdown';
import { TaskDetail } from '../Shared/TaskDetail';
import '../Shared/Shared.css';
import './DisassemblyDash.css';

interface CMMSection {
  sectionId: string;
  startPage: number;
  endPage: number;
}

interface DisassemblyDashProps {
  cmm: CMMRecord;
  section: CMMSection;
  result: SectionExtractionResult;
  onBack: () => void;
}

type Tab = 'manual' | 'tasks' | 'detail';

export function DisassemblyDash({ cmm, section, result, onBack }: DisassemblyDashProps) {
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
    <div className="disassembly-dash">
      <div className="disassembly-dash__header">
        <button className="disassembly-dash__back" onClick={onBack}>
          ← Back to CMM
        </button>
        <h2 className="disassembly-dash__title">Disassembly</h2>
      </div>

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
        <button
          className={`disassembly-dash__tab ${activeTab === 'detail' ? 'disassembly-dash__tab--active' : ''}`}
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