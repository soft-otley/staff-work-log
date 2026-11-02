/**
 * Formatting and Helper Utilities
 */

import { TaskPriority, TaskStatus, LogSubmissionStatus } from '../types';

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatTime(timeString?: string): string {
  if (!timeString) return '-';
  return timeString;
}

export function calculateHoursBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;

  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  if (endMinutes < startMinutes) {
    // Crosses midnight
    endMinutes += 24 * 60;
  }

  const diff = (endMinutes - startMinutes) / 60;
  return Math.round(diff * 10) / 10;
}

export function getStatusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case 'Completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800';
    case 'In Progress':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800';
    case 'On Hold':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800';
    case 'Not Started':
      return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    case 'Cancelled':
      return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

export function getPriorityBadgeClass(priority: TaskPriority): string {
  switch (priority) {
    case 'Urgent':
      return 'bg-rose-100 text-rose-800 border-rose-200 font-semibold dark:bg-rose-950/60 dark:text-rose-400';
    case 'High':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400';
    case 'Medium':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400';
    case 'Low':
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getLogStatusBadgeClass(status: LogSubmissionStatus): string {
  switch (status) {
    case 'Approved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400';
    case 'Submitted':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400';
    case 'Draft':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400';
    case 'Rejected':
      return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400';
    case 'Reopened':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/**
 * Sanitizes input to avoid spreadsheet formula injection
 */
export function sanitizeForSheet(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Exports data to CSV file with proper quoting and formula protection
 */
export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      let cell = row[header] ?? '';
      if (typeof cell === 'object') {
        cell = JSON.stringify(cell);
      }
      cell = sanitizeForSheet(cell);
      // Escape double quotes
      cell = `"${String(cell).replace(/"/g, '""')}"`;
      return cell;
    }).join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
