import { useState } from 'react';
import { motion } from 'framer-motion';
import { Task } from '../../../../shared/types/testing';
import { TaskCard } from './TaskCard';

interface TaskBreakdownProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
}

export function TaskBreakdown({ tasks, onSelectTask }: TaskBreakdownProps) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? tasks.filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase()))
    : tasks;

  return (
    <div className="tfi-task-breakdown">
      <input
        type="text"
        placeholder="Search tasks..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="tfi-task-breakdown__search"
      />

      <div className="tfi-task-breakdown__grid">
        {filtered.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: i * 0.05 }}
          >
            <TaskCard task={task} onClick={() => onSelectTask(task.id)} />
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="tfi-task-breakdown__empty">No tasks match your search.</p>
        )}
      </div>
    </div>
  );
}