/**
 * Interactive Gantt Chart Timeline for Task Management
 * Displays task timelines, dependencies, progress bars, and overdue markers.
 */

import React, { useState } from 'react';
import { Task } from '../../types';
import { formatDate } from '../../utils/formatters';
import { Calendar, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

interface GanttChartProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, onSelectTask }) => {
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week'>('day');
  const [viewOffsetDays, setViewOffsetDays] = useState(0);

  // Compute baseline date range (around current date)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startTimeline = new Date(today);
  startTimeline.setDate(today.getDate() - 3 + viewOffsetDays);

  const daysToShow = zoomLevel === 'day' ? 21 : 42;
  const days: Date[] = [];
  for (let i = 0; i < daysToShow; i++) {
    const d = new Date(startTimeline);
    d.setDate(startTimeline.getDate() + i);
    days.push(d);
  }

  const timelineEnd = days[days.length - 1];

  const getDaysDiff = (d1: Date, d2: Date) => {
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Controls Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Project Timeline & Milestone Schedule
          </h3>
          <span className="text-xs text-slate-500 font-normal">
            ({tasks.length} active scheduled tasks)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Selector */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setZoomLevel('day')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                zoomLevel === 'day'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Days
            </button>
            <button
              onClick={() => setZoomLevel('week')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                zoomLevel === 'week'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Weeks
            </button>
          </div>

          {/* Navigation Controls */}
          <button
            onClick={() => setViewOffsetDays((prev) => prev - 7)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Previous period"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewOffsetDays(0)}
            className="px-2.5 py-1 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Today
          </button>
          <button
            onClick={() => setViewOffsetDays((prev) => prev + 7)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Next period"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gantt Timeline Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header Dates */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 sticky top-0 z-10">
            <div className="w-64 shrink-0 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">
              Task Details
            </div>
            <div className="flex-1 flex">
              {days.map((day, idx) => {
                const isToday = day.getTime() === today.getTime();
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div
                    key={idx}
                    className={`flex-1 text-center py-2 px-0.5 border-r border-slate-200 dark:border-slate-700/60 text-[11px] ${
                      isToday
                        ? 'bg-blue-100/70 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 font-bold'
                        : isWeekend
                        ? 'bg-slate-200/40 dark:bg-slate-800/30 text-slate-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div>{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>
                    <div className="font-semibold">{day.getDate()}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No tasks available for timeline view.
              </div>
            ) : (
              tasks.map((task) => {
                const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
                taskStart.setHours(0, 0, 0, 0);

                const taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(taskStart.getTime() + 86400000 * 3);
                taskEnd.setHours(0, 0, 0, 0);

                const totalDaysSpan = getDaysDiff(startTimeline, timelineEnd) + 1;
                const offsetFromStart = getDaysDiff(startTimeline, taskStart);
                const taskDuration = Math.max(1, getDaysDiff(taskStart, taskEnd) + 1);

                // Calculate percentages for CSS grid positioning
                const leftPercent = Math.max(0, Math.min(100, (offsetFromStart / totalDaysSpan) * 100));
                const widthPercent = Math.max(
                  2,
                  Math.min(100 - leftPercent, (taskDuration / totalDaysSpan) * 100)
                );

                const isOverdue = task.status !== 'Completed' && taskEnd.getTime() < today.getTime();

                let barColor = 'bg-blue-500 border-blue-600';
                if (task.status === 'Completed') {
                  barColor = 'bg-emerald-500 border-emerald-600';
                } else if (task.status === 'On Hold') {
                  barColor = 'bg-amber-500 border-amber-600';
                } else if (isOverdue) {
                  barColor = 'bg-rose-500 border-rose-600';
                }

                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="flex items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    {/* Left Task Column */}
                    <div className="w-64 shrink-0 px-4 py-3 border-r border-slate-200 dark:border-slate-800 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-blue-600">
                          {task.id}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {task.assigneeName || 'Unassigned'} &bull; {task.departmentName || 'General'}
                      </p>
                    </div>

                    {/* Timeline Bar Section */}
                    <div className="flex-1 relative h-12 flex items-center px-1">
                      {/* Background Vertical Grid Lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {days.map((day, idx) => (
                          <div
                            key={idx}
                            className={`flex-1 border-r border-slate-100 dark:border-slate-800/40 ${
                              day.getTime() === today.getTime()
                                ? 'bg-blue-50/30 dark:bg-blue-900/10'
                                : ''
                            }`}
                          />
                        ))}
                      </div>

                      {/* Timeline Bar */}
                      <div
                        className={`absolute h-7 rounded-md shadow-xs border ${barColor} text-white text-[11px] font-semibold flex items-center px-2 z-10 transition-all group-hover:brightness-105`}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          minWidth: '40px',
                        }}
                      >
                        <span className="truncate flex-1">{task.progress}%</span>
                        <span className="text-[10px] opacity-80 hidden sm:inline ml-1 truncate">
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
