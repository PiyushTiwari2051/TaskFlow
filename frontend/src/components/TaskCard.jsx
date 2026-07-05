import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  CheckSquare, 
  MessageSquare, 
  Paperclip, 
  Calendar, 
  AlertTriangle 
} from 'lucide-react';

export default function TaskCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1
  };

  const doneCount = task.checklist ? task.checklist.filter(item => item.done).length : 0;
  const totalCount = task.checklist ? task.checklist.length : 0;
  const hasComments = task.comments && task.comments.length > 0;
  const hasAttachments = task.attachments && task.attachments.length > 0;

  // Due date warnings
  const getDueDateBadge = () => {
    if (!task.dueDate) return null;
    const dueTime = new Date(task.dueDate).getTime();
    const nowTime = Date.now();
    const diff = dueTime - nowTime;

    const formattedDate = new Date(task.dueDate).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });

    if (diff < 0) {
      // Overdue
      return (
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-[10px] font-bold">
          <AlertTriangle class="h-3 w-3" /> Overdue ({formattedDate})
        </span>
      );
    } else if (diff < 24 * 60 * 60 * 1000) {
      // Due in <24h
      return (
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 text-[10px] font-bold">
          <Calendar class="h-3 w-3 animate-pulse" /> Due soon ({formattedDate})
        </span>
      );
    }

    return (
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy-50 text-navy-500 dark:bg-navy-800 dark:text-navy-400 text-[10px] font-medium">
        <Calendar class="h-3 w-3" /> {formattedDate}
      </span>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      class="bg-white dark:bg-navy-850 p-4 rounded-xl border border-navy-100 dark:border-navy-800/60 shadow-sm hover:shadow-cardHover hover:-translate-y-0.5 transition-all duration-150 cursor-grab active:cursor-grabbing select-none group relative"
    >
      
      {/* Label chips */}
      {task.labels && task.labels.length > 0 && (
        <div class="flex flex-wrap gap-1.5 mb-3">
          {task.labels.map((label, idx) => (
            <span 
              key={idx}
              class="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md"
              style={{ backgroundColor: `${label.color}20`, color: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h4 class="font-heading font-bold text-sm text-navy-850 dark:text-white leading-relaxed group-hover:text-primary dark:group-hover:text-primary-light transition-colors">
        {task.title}
      </h4>

      {/* Description preview */}
      {task.description && (
        <p class="mt-1 text-xs text-navy-400 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Checklist Progress mini bar */}
      {totalCount > 0 && (
        <div class="mt-4">
          <div class="flex items-center justify-between text-[9px] text-navy-400 mb-1">
            <span class="flex items-center gap-1"><CheckSquare class="h-3 w-3" /> Checklist</span>
            <span class="font-bold">{doneCount}/{totalCount}</span>
          </div>
          <div class="w-full bg-navy-100 dark:bg-navy-800 h-1 rounded-full overflow-hidden">
            <div 
              class="h-full bg-primary transition-all duration-300"
              style={{ width: `${(doneCount / totalCount) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Footer Info (Priority, Attachments, Comments, Assignees) */}
      <div class="mt-4 flex items-center justify-between border-t border-navy-50 dark:border-navy-800/30 pt-3 text-[10px] text-navy-400">
        <div class="flex items-center gap-2">
          {/* Priority */}
          <span class={`font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
            task.priority === 'urgent' ? 'bg-red-50 text-red-500 dark:bg-red-500/10' :
            task.priority === 'high' ? 'bg-orange-50 text-orange-500 dark:bg-orange-500/10' :
            task.priority === 'medium' ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10' :
            'bg-navy-50 text-navy-500 dark:bg-navy-800'
          }`}>
            {task.priority}
          </span>

          {/* Attachments count */}
          {hasAttachments && (
            <span class="flex items-center gap-0.5" title="Attachments">
              <Paperclip class="h-3.5 w-3.5" />
              {task.attachments.length}
            </span>
          )}

          {/* Comments count */}
          {hasComments && (
            <span class="flex items-center gap-0.5" title="Comments">
              <MessageSquare class="h-3.5 w-3.5" />
              {task.comments.length}
            </span>
          )}
        </div>

        {/* Due Date or Assignee Stack */}
        <div class="flex items-center gap-2">
          {getDueDateBadge()}

          {/* Assignees avatars stack */}
          {task.assignees && task.assignees.length > 0 && (
            <div class="flex -space-x-1.5 overflow-hidden">
              {task.assignees.map((assignee, idx) => (
                <img
                  key={assignee._id || idx}
                  src={assignee.avatarUrl}
                  title={assignee.name}
                  alt={assignee.name}
                  class="h-5 w-5 rounded-full border border-white dark:border-navy-900 object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
