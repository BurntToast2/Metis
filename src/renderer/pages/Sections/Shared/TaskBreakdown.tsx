import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Task } from '../../../../shared/types/sections';
import { MissingReference } from '../../../../shared/types/referenceManuals';
import { TaskCard } from './TaskCard';
import { MissingReferenceCard } from './MissingReferenceCard';

interface TaskBreakdownProps {
  cmmId: number;
  sectionId: string;
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
}

export function TaskBreakdown({ cmmId, sectionId, tasks: initialTasks, onSelectTask }: TaskBreakdownProps) {
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState(initialTasks);
  const [missingReferences, setMissingReferences] = useState<MissingReference[]>([]);

  // Keeps this component's own copy in sync if the parent ever remounts it
  // with a fresh result (e.g. reopening the section fetched a newer cache).
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    window.api
      .getMissingReferences({ cmmId, sectionId })
      .then(setMissingReferences)
      .catch((err) => console.error('getMissingReferences failed:', err));
  }, [cmmId, sectionId]);

  // Called after any card's upload succeeds. One upload can resolve
  // multiple pending keys at once (ingestReferenceManual attempts every
  // matching pending reference in the library, not just this one card's),
  // so this re-fetches the whole list rather than optimistically removing
  // a single card. Any task that was blocked before and isn't blocked
  // anymore gets re-extracted immediately, sequentially — each call reads
  // the previous one's already-saved result off disk, so awaiting in order
  // (not Promise.all) keeps that consistent.
  async function handleReferenceUploaded() {
    const previousBlocked = new Set(missingReferences.flatMap((r) => r.taskIds));

    let updated: MissingReference[];
    try {
      updated = await window.api.getMissingReferences({ cmmId, sectionId });
    } catch (err) {
      console.error('getMissingReferences refresh failed:', err);
      return;
    }
    setMissingReferences(updated);

    const stillBlocked = new Set(updated.flatMap((r) => r.taskIds));
    const unblockedTaskIds = [...previousBlocked].filter((taskId) => !stillBlocked.has(taskId));

    for (const taskId of unblockedTaskIds) {
      try {
        const result = await window.api.reExtractTask({ cmmId, sectionId, taskId });
        setTasks(result.tasks);
      } catch (err) {
        console.error(`re-extraction failed for task "${taskId}":`, err);
      }
    }
  }

  const filtered = query.trim()
    ? tasks.filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase()))
    : tasks;

  return (
    <div className="task-breakdown">
      <input
        type="text"
        placeholder="Search tasks..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="task-breakdown__search"
      />

      <div className="task-breakdown__grid">
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
          <p className="task-breakdown__empty">No tasks match your search.</p>
        )}
      </div>

      {missingReferences.length > 0 && (
        <div className="task-breakdown__missing-refs">
          <h3 className="task-breakdown__missing-refs-title">Missing references</h3>
          <div className="task-breakdown__missing-refs-grid">
            {missingReferences.map((reference) => (
              <MissingReferenceCard
                key={reference.key}
                reference={reference}
                onUploaded={handleReferenceUploaded}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}