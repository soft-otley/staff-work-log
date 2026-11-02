/**
 * Daily Work Log Management View
 * Combines Book View, Log History Table, and Manager Review Queue.
 */

import React, { useState, useEffect } from 'react';
import { DailyLog, User, Department } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { BookStyleLogView } from './BookStyleLogView';
import { LogAuditDrawer } from './LogAuditDrawer';
import {
  formatDate,
  getLogStatusBadgeClass,
  exportToCSV,
} from '../../utils/formatters';
import {
  BookOpen,
  ListFilter,
  CheckCircle2,
  Clock,
  Download,
  Calendar,
  Filter,
  ArrowRight,
  ShieldAlert,
  Search,
} from 'lucide-react';

export const DailyLogManagementView: React.FC = () => {
  const { user, isAdmin, isManager } = useAuth();
  const { showToast } = useNotifications();

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Active sub-tab: 'book' | 'history' | 'queue'
  const [activeTab, setActiveTab] = useState<'book' | 'history' | 'queue'>('book');

  // Currently loaded log in book view
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);

  // Audit Drawer
  const [auditLog, setAuditLog] = useState<DailyLog | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const [fetchedLogs, fetchedUsers, fetchedDepts] = await Promise.all([
        api.getDailyLogs(),
        api.getUsers(),
        api.getDepartments(),
      ]);
      setLogs(fetchedLogs);
      setUsers(fetchedUsers);
      setDepartments(fetchedDepts);

      // Default selected log: today's log if exists, else first log or null
      const todayStr = new Date().toISOString().split('T')[0];
      const todayLog = fetchedLogs.find((l) => l.workDate === todayStr && l.employeeId === user?.id);
      if (todayLog) {
        setSelectedLog(todayLog);
      } else if (fetchedLogs.length > 0) {
        setSelectedLog(fetchedLogs[0]);
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSaveLog = async (logData: Partial<DailyLog>, isSubmit: boolean): Promise<DailyLog> => {
    let saved: DailyLog;
    if (logData.id) {
      saved = await api.updateDailyLog(logData.id, logData);
      if (isSubmit) {
        saved = await api.submitDailyLog(logData.id);
      }
    } else {
      saved = await api.createDailyLog({
        ...logData,
        submissionStatus: isSubmit ? 'Submitted' : 'Draft',
      });
    }

    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.id === saved.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });

    setSelectedLog(saved);
    return saved;
  };

  const handleReviewLog = async (logId: string, status: 'Approved' | 'Rejected', comments: string) => {
    const updated = await api.reviewDailyLog(logId, { status, comments });
    setLogs((prev) => prev.map((l) => (l.id === logId ? updated : l)));
    if (selectedLog?.id === logId) {
      setSelectedLog(updated);
    }
  };

  const handleReopenLog = async (logId: string, reason: string) => {
    const updated = await api.reopenDailyLog(logId, reason);
    setLogs((prev) => prev.map((l) => (l.id === logId ? updated : l)));
    if (selectedLog?.id === logId) {
      setSelectedLog(updated);
    }
  };

  const pendingReviewLogs = logs.filter((l) => l.submissionStatus === 'Submitted');

  // Filtered log history
  const filteredLogs = logs.filter((l) => {
    if (statusFilter !== 'all' && l.submissionStatus !== statusFilter) return false;
    if (employeeFilter !== 'all' && l.employeeId !== employeeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = l.employeeName.toLowerCase().includes(q);
      const matchDesc = l.workDescription.toLowerCase().includes(q);
      const matchId = l.id.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchId) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const exportData = filteredLogs.map((l) => ({
      'Log ID': l.id,
      Employee: l.employeeName,
      Department: l.departmentName,
      'Work Date': l.workDate,
      'Start Time': l.startTime,
      'End Time': l.endTime,
      'Total Hours': l.totalHours,
      Status: l.submissionStatus,
      'Work Description': l.workDescription,
      'Completed Tasks': l.tasksCompleted,
      'Pending Tasks': l.pendingTasks,
      'Problems Encountered': l.problemsEncountered,
      'Next Day Plan': l.nextDayPlan,
      Reviewer: l.reviewerName || '',
      'Review Date': l.reviewedAt || '',
    }));
    exportToCSV(exportData, 'daily_logs_export');
    showToast('Export Complete', 'Exported daily work logs to CSV.', 'success');
  };

  return (
    <div className="space-y-5">
      {/* Navigation Sub-Tabs & Action Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('book')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'book'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Book-Style Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Log Archives ({logs.length})</span>
          </button>

          {(isAdmin || isManager) && (
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'queue'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Review Queue</span>
              {pendingReviewLogs.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold ml-1">
                  {pendingReviewLogs.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setSelectedLog(null);
              setActiveTab('book');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Start Fresh Entry</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading daily log records...</div>
      ) : activeTab === 'book' ? (
        <BookStyleLogView
          initialLog={selectedLog}
          onSaveLog={handleSaveLog}
          onReviewLog={handleReviewLog}
          onReopenLog={handleReopenLog}
          onOpenAudit={(log) => setAuditLog(log)}
        />
      ) : activeTab === 'queue' ? (
        /* Manager Review Queue Tab */
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200">
                Supervisor Approval Queue ({pendingReviewLogs.length} Pending)
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Staff have submitted these logs for certification. Click any log to open the executive ledger, inspect deliverables, and grant official approval or request revisions.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Work Date</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Deliverables Summary</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingReviewLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      All daily logs have been reviewed! No items in queue.
                    </td>
                  </tr>
                ) : (
                  pendingReviewLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => {
                        setSelectedLog(log);
                        setActiveTab('book');
                      }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {log.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {log.employeeName}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{log.departmentName || '-'}</td>
                      <td className="py-3 px-4 font-medium">{formatDate(log.workDate)}</td>
                      <td className="py-3 px-4 font-bold text-purple-600 dark:text-purple-400">
                        {log.totalHours}h
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-sm truncate">
                        {log.workDescription}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                            setActiveTab('book');
                          }}
                          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                        >
                          Review Now &rarr;
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* History & Archive Tab */
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, employee, ID..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Reopened">Reopened</option>
            </select>

            {(isAdmin || isManager) && (
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="all">All Employees</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Work Date</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Supervisor Review</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No logs found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => {
                        setSelectedLog(log);
                        setActiveTab('book');
                      }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {log.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {log.employeeName}
                      </td>
                      <td className="py-3 px-4 font-medium">{formatDate(log.workDate)}</td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {log.totalHours} hrs
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getLogStatusBadgeClass(log.submissionStatus)}`}>
                          {log.submissionStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {log.reviewerName ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                            Reviewed by {log.reviewerName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending review</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                            setActiveTab('book');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300"
                        >
                          Open Ledger
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Audit Drawer Modal */}
      <LogAuditDrawer
        isOpen={!!auditLog}
        onClose={() => setAuditLog(null)}
        log={auditLog}
      />
    </div>
  );
};
