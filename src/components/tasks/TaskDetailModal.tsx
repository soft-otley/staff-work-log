/**
 * Detailed Task View with Comments, Hours Log, and Status Controller
 */

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Task, TaskStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  getPriorityBadgeClass,
} from '../../utils/formatters';
import {
  Clock,
  User,
  Building,
  Calendar,
  MessageSquare,
  Send,
  Edit2,
  Trash2,
  CheckCircle,
} from 'lucide-react';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onAddComment: (id: string, comment: string) => Promise<void>;
  onEditTask: (task: Task) => void;
  onDeleteTask?: (id: string) => Promise<void>;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onUpdateTask,
  onAddComment,
  onEditTask,
  onDeleteTask,
}) => {
  const { user, isAdmin, isManager } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (!task) return null;

  const handleProgressChange = async (newProgress: number) => {
    try {
      setUpdating(true);
      await onUpdateTask(task.id, {
        progress: newProgress,
        status: newProgress === 100 ? 'Completed' : task.status === 'Completed' ? 'In Progress' : task.status,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      setUpdating(true);
      await onUpdateTask(task.id, {
        status: newStatus,
        progress: newStatus === 'Completed' ? 100 : task.progress,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleActualHoursChange = async (hours: number) => {
    try {
      setUpdating(true);
      await onUpdateTask(task.id, { actualHours: hours });
    } finally {
      setUpdating(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      await onAddComment(task.id, commentText.trim());
      setCommentText('');
    } finally {
      setSubmittingComment(false);
    }
  };

  const canEditDetails = isAdmin || (isManager && user?.departmentId === task.departmentId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${task.id} - ${task.title}`}
      subtitle={`Created by ${task.creatorName || 'Manager'} &bull; ${formatDate(task.createdAt)}`}
      maxWidth="3xl"
    >
      <div className="space-y-6 text-xs">
        {/* Top Badges and Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full border font-semibold ${getStatusBadgeClass(task.status)}`}>
              {task.status}
            </span>
            <span className={`px-2.5 py-1 rounded-full border ${getPriorityBadgeClass(task.priority)}`}>
              {task.priority} Priority
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canEditDetails && (
              <button
                onClick={() => {
                  onClose();
                  onEditTask(task);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Scope</span>
              </button>
            )}

            {isAdmin && onDeleteTask && (
              <button
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete task ${task.id}?`)) {
                    await onDeleteTask(task.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Task Description */}
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] mb-1.5">
            Description & Scope
          </h4>
          <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 leading-relaxed whitespace-pre-wrap">
            {task.description || 'No detailed scope description provided.'}
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <div>
            <span className="text-[11px] text-slate-500 block mb-1">Assignee</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <User className="w-3.5 h-3.5 text-blue-500" />
              <span className="truncate">{task.assigneeName || 'Unassigned'}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block mb-1">Department</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <Building className="w-3.5 h-3.5 text-indigo-500" />
              <span className="truncate">{task.departmentName || 'General'}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block mb-1">Timeline</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>{formatDate(task.startDate)} &rarr; {formatDate(task.dueDate)}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 block mb-1">Hours Logged</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>{task.actualHours || 0} / {task.estimatedHours || 0} hrs</span>
            </div>
          </div>
        </div>

        {/* Interactive Progress & Hours Logging */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20">
          {/* Progress Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Completion Progress
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {task.progress}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={task.progress}
              onChange={(e) => handleProgressChange(Number(e.target.value))}
              disabled={updating}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% (Not Started)</span>
              <span>50% (Midway)</span>
              <span>100% (Completed)</span>
            </div>
          </div>

          {/* Actual Hours Logger & Status Quick Select */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Log Actual Hours
              </span>
              <span className="text-[11px] text-slate-500">
                Est: {task.estimatedHours}h
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.5"
                defaultValue={task.actualHours}
                onBlur={(e) => handleActualHoursChange(Number(e.target.value))}
                className="w-28 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
              />
              <span className="text-slate-500 font-medium">hours worked</span>
            </div>
          </div>
        </div>

        {/* Comments & Collaboration Stream */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            Comments & Updates ({task.comments?.length || 0})
          </h4>

          {/* Comment list */}
          <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
            {!task.comments || task.comments.length === 0 ? (
              <p className="text-slate-400 italic py-2">No comments posted yet.</p>
            ) : (
              task.comments.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {c.userName} ({c.userRole})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {c.comment}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* New comment input */}
          <form onSubmit={handlePostComment} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment or status update..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Post</span>
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
};
