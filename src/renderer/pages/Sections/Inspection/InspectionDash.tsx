<<<<<<< HEAD
import { useState, useEffect } from 'react';
=======
// InspectionDash.tsx
import { useState } from 'react';
>>>>>>> 2013387 (Updated extracting screen with error handling)
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

// This component no longer fetches its own data — CMMCardDash already has
// the extraction result in hand (it had to fetch it anyway to decide
// whether the section was extracted before opening this dash) and passes
// it straight in as `result`. That removes a second, redundant IPC round
// trip immediately after the one CMMCardDash already made, and the plain
// loading-spinner flash that came with it.
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

  // ManualView wraps a native <embed> PDF viewer — its scroll/zoom/page state
  // lives inside the browser plugin instance, invisible to React. Unmounting
  // it (e.g. via a ternary keyed on activeTab or selectedTask) destroys that
  // instance, and any later remount reloads the PDF from scratch. So it's
  // mounted once, here, unconditionally, and visibility is toggled with CSS
  // instead of conditional rendering — the DOM node (and the plugin
  // underneath it) never goes away for the lifetime of this component.
  // Page navigation (jumping to a task's sourcePage) is handled separately via
  // the `key={page}` on the underlying <embed> in ManualView, which forces a
  // fresh load at the target page — this is an intentional exception to the
  // "never remount" rule above, since jumping pages is expected to reset scroll.
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