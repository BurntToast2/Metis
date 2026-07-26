import { Task } from '../../../../shared/types/sections';

interface TaskDetailProps {
  task: Task;
  onBack: () => void;
}

export function TaskDetail({ task, onBack }: TaskDetailProps) {
  return (
    <div className="tfi-task-detail">
      <button className="tfi-dash__back" onClick={onBack}>
        ← Back to Tasks
      </button>
      <h3 className="tfi-task-detail__title">{task.id} — {task.title}</h3>

      {task.subTasks.length > 0 && (
        <div className="tfi-task-detail__subtasks">
          <h4>Sub-tasks</h4>
          <ol>
            {task.subTasks.map((st) => (
              <li key={st.id}>{st.description}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="tfi-task-detail__tools">
        <h4>Tools</h4>
        {task.tools.length === 0 ? (
          <p className="tfi-task-detail__empty">No tools listed for this task.</p>
        ) : (
          <table className="tfi-task-detail__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Part Number</th>
                <th>Type</th>
                <th>Used In</th>
                <th>Calibrated</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {task.tools.map((t, i) => (
                <tr key={`${t.name}-${i}`}>
                  <td>{t.name}</td>
                  <td>{t.pn ?? '—'}</td>
                  <td>{t.type}</td>
                  <td>{t.usedIn ?? '—'}</td>
                  <td>{t.calibrated ? 'Yes' : 'No'}</td>
                  <td>{t.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="tfi-task-detail__consumables">
        <h4>Consumables</h4>
        {task.consumables.length === 0 ? (
          <p className="tfi-task-detail__empty">No consumables listed for this task.</p>
        ) : (
          <table className="tfi-task-detail__table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Spec</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {task.consumables.map((c, i) => (
                <tr key={`${c.code}-${i}`}>
                  <td>{c.code}</td>
                  <td>{c.description}</td>
                  <td>{c.spec ?? '—'}</td>
                  <td>{c.category ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}