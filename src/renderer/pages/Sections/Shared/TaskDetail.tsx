import { Task } from '../../../../shared/types/sections';

interface TaskDetailProps {
  task: Task;
  onBack: () => void;
}

export function TaskDetail({ task, onBack }: TaskDetailProps) {
  const rows = [
    ...task.tools.map((t) => ({ ...t, kind: 'Tool' as const })),
    ...task.consumables.map((c) => ({ ...c, kind: 'Consumable' as const })),
  ];

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
        <h4>Tools &amp; Consumables</h4>
        {rows.length === 0 ? (
          <p className="tfi-task-detail__empty">No tools or consumables listed for this task.</p>
        ) : (
          <table className="tfi-task-detail__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Part Number</th>
                <th>Qty</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.partNumber ?? '—'}</td>
                  <td>{r.quantity ?? '—'}</td>
                  <td>{r.kind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}