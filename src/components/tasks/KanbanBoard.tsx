/**
 * Kanban Board Module for Interactive Task Workflow Management
 */

import React from 'react';
import { Task, TaskStatus } from '../../types';
import { getPriorityBadgeClass, formatDate } from '../../utils/formatters';
import {
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string; border: string }[] = [
  { id: 'Not Started', label: 'Not Started', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300', border: 'border-blue-400 dark:border-blue-700' },
  { id: 'On Hold', label: 'On Hold', color: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300', border: 'border-amber-400 dark:border-amber-700' },
  { id: 'Completed', label: 'Completed', color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300', border: 'border-emerald-400 dark:border-emerald-700' },
  { id: 'Cancelled', label: 'Cancelled', color: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300', border: 'border-rose-400 dark:border-rose-700' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onSelectTask,
  onUpdateStatus,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.id);

        return (
          <div
            key={col.id}
            className="bg-slate-100/60 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.border.replace('border-', 'bg-')}`} />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {col.label}
                </h4>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.color}`}>
                {columnTasks.length}
              </span>
            </div>

            {/* Task Cards */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-400">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => {
                  const isOverdue = task.status !== 'Completed' && task.dueDate < todayStr;

                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group space-y-2.5"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-blue-600">
                          {task.id}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>

                      {/* Title */}
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                        {task.title}
                      </h5>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              task.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Meta Footer */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                          <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[9px] shrink-0">
                            {task.assigneeName ? task.assigneeName.charAt(0) : '?'}
                          </div>
                          <span className="truncate">{task.assigneeName || 'Unassigned'}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {task.comments && task.comments.length > 0 && (
                            <span className="flex items-center gap-0.5 text-slate-400">
                              <MessageSquare className="w-3 h-3" />
                              {task.comments.length}
                            </span>
                          )}
                          <span
                            className={`flex items-center gap-0.5 font-medium ${
                              isOverdue ? 'text-rose-600 font-bold' : ''
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        </div>
                      </div>

                      {/* Quick Move Status Button */}
                      <div className="pt-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {col.id !== 'Completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(task.id, 'Completed');
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200 hover:bg-emerald-100"
                          >
                            Done
                          </button>
                        )}
                        {col.id === 'Not Started' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(task.id, 'In Progress');
                            }}
                            className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-semibold border border-blue-200 hover:bg-blue-100"
                          >
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
