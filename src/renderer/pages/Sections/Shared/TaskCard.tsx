import { Task } from '../../../../shared/types/sections';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const toolCount = task.tools.length + task.consumables.length;

  return (
    <div className="tfi-task-card" onClick={onClick}>
      <p className="tfi-task-card__id">{task.id}</p>
      <h4 className="tfi-task-card__title">{task.title}</h4>
      <div className="tfi-task-card__meta">
        {task.subTasks.length > 0 && (
          <span>{task.subTasks.length} subtask{task.subTasks.length === 1 ? '' : 's'}</span>
        )}
        {toolCount > 0 && <span>{toolCount} tool{toolCount === 1 ? '' : 's'}</span>}
        <span>p. {task.sourcePage}</span>
      </div>
    </div>
  );
}