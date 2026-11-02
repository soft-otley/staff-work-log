/**
 * Comprehensive Reports and Analytics Module
 * Generates audit-ready employee performance, task delivery, working hours, and CSV exports.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { exportToCSV, formatDate } from '../../utils/formatters';
import {
  BarChart3,
  Download,
  Printer,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Search,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { user, isAdmin, isManager } = useAuth();
  const { showToast } = useNotifications();

  // Active Report Category
  const [reportType, setReportType] = useState<
    'employees' | 'tasks' | 'daily-logs' | 'overdue' | 'hours'
  >('employees');

  const [loading, setLoading] = useState(true);
  const [employeesData, setEmployeesData] = useState<any[]>([]);
  const [tasksData, setTasksData] = useState<any[]>([]);
  const [logsData, setLogsData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Filters
  const [deptFilter, setDeptFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [emp, tsk, lg, dpt] = await Promise.all([
        api.getEmployeesReport({}),
        api.getTasks(),
        api.getDailyLogs(),
        api.getDepartments(),
      ]);
      setEmployeesData(emp);
      setTasksData(tsk);
      setLogsData(lg);
      setDepartments(dpt);
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleExportCurrentReport = () => {
    if (reportType === 'employees') {
      const data = employeesData.map((e) => ({
        'Full Name': e.fullName,
        Username: e.username,
        Department: e.departmentName,
        Role: e.role,
        'Total Tasks': e.totalTasks,
        'Completed Tasks': e.completedTasks,
        'Completion Rate %': `${e.completionRate}%`,
        'Total Hours Logged': e.totalHoursLogged,
        'Logs Submitted': e.submittedLogsCount,
        'Last Active': e.lastActive,
      }));
      exportToCSV(data, 'employee_performance_report');
    } else if (reportType === 'tasks') {
      const data = tasksData.map((t) => ({
        'Task ID': t.id,
        Title: t.title,
        Assignee: t.assigneeName,
        Department: t.departmentName,
        Status: t.status,
        Priority: t.priority,
        'Progress %': `${t.progress}%`,
        'Est Hours': t.estimatedHours,
        'Actual Hours': t.actualHours,
        'Due Date': t.dueDate,
      }));
      exportToCSV(data, 'task_completion_report');
    } else if (reportType === 'overdue') {
      const overdueTasks = tasksData.filter((t) => t.status !== 'Completed' && t.dueDate < todayStr);
      const data = overdueTasks.map((t) => ({
        'Task ID': t.id,
        Title: t.title,
        Assignee: t.assigneeName,
        Department: t.departmentName,
        'Due Date': t.dueDate,
        'Progress %': `${t.progress}%`,
        Priority: t.priority,
      }));
      exportToCSV(data, 'overdue_tasks_report');
    } else {
      const data = logsData.map((l) => ({
        'Log ID': l.id,
        Employee: l.employeeName,
        Department: l.departmentName,
        'Work Date': l.workDate,
        Hours: l.totalHours,
        Status: l.submissionStatus,
        Description: l.workDescription,
        Reviewer: l.reviewerName || '',
      }));
      exportToCSV(data, 'work_hours_audit_report');
    }
    showToast('Export Success', `Downloaded ${reportType} report as CSV.`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  const overdueList = tasksData.filter((t) => t.status !== 'Completed' && t.dueDate < todayStr);

  return (
    <div className="space-y-5 print:p-0">
      {/* Report Controls Ribbon */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setReportType('employees')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              reportType === 'employees'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Staff Performance
          </button>
          <button
            onClick={() => setReportType('tasks')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              reportType === 'tasks'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Task Deliveries
          </button>
          <button
            onClick={() => setReportType('overdue')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
              reportType === 'overdue'
                ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Overdue Tasks</span>
            {overdueList.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                {overdueList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setReportType('daily-logs')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              reportType === 'daily-logs'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Daily Log Compliance
          </button>
        </div>

        {/* Export & Print */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCurrentReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Report Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Report Formal Header for Print & Audit */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {reportType === 'employees' && 'Employee Performance & Work Log Summary Report'}
              {reportType === 'tasks' && 'Comprehensive Task Delivery & Completion Report'}
              {reportType === 'overdue' && 'Overdue Deliverables & Bottleneck Escalation Report'}
              {reportType === 'daily-logs' && 'Daily Work Log Submissions & Approval Status Report'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} &bull; Company confidential
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            AUDIT-READY
          </span>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Compiling analytics...</div>
        ) : reportType === 'employees' ? (
          /* Employee Performance Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-center">Tasks Assigned</th>
                  <th className="py-3 px-4 text-center">Completed</th>
                  <th className="py-3 px-4 text-center">Delivery Rate</th>
                  <th className="py-3 px-4 text-center">Logged Hours</th>
                  <th className="py-3 px-4 text-center">Logs Filed</th>
                  <th className="py-3 px-4">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employeesData.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {emp.fullName}
                      <span className="block text-[10px] text-slate-400 font-normal">@{emp.username}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{emp.departmentName || '-'}</td>
                    <td className="py-3 px-4">{emp.role}</td>
                    <td className="py-3 px-4 text-center font-bold">{emp.totalTasks}</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">{emp.completedTasks}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {emp.completionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-purple-600 dark:text-purple-400">
                      {emp.totalHoursLogged}h
                    </td>
                    <td className="py-3 px-4 text-center">{emp.submittedLogsCount}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{formatDate(emp.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : reportType === 'overdue' ? (
          /* Overdue Deliverables Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Task ID</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {overdueList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-emerald-600 font-bold">
                      Zero overdue tasks! All projects are executing on schedule.
                    </td>
                  </tr>
                ) : (
                  overdueList.map((t) => (
                    <tr key={t.id} className="hover:bg-rose-50/30">
                      <td className="py-3 px-4 font-mono font-bold text-rose-600">{t.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{t.title}</td>
                      <td className="py-3 px-4">{t.assigneeName}</td>
                      <td className="py-3 px-4">{t.departmentName}</td>
                      <td className="py-3 px-4 font-bold text-rose-600">{t.priority}</td>
                      <td className="py-3 px-4 font-bold text-rose-600">{formatDate(t.dueDate)}</td>
                      <td className="py-3 px-4 font-mono">{t.progress}%</td>
                      <td className="py-3 px-4">{t.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : reportType === 'tasks' ? (
          /* Task Completion Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Task ID</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasksData.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{t.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{t.title}</td>
                    <td className="py-3 px-4">{t.assigneeName}</td>
                    <td className="py-3 px-4">{t.departmentName}</td>
                    <td className="py-3 px-4">{t.status}</td>
                    <td className="py-3 px-4 font-mono">{t.progress}%</td>
                    <td className="py-3 px-4">{formatDate(t.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Daily Log Submissions Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Work Date</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Submission Status</th>
                  <th className="py-3 px-4">Supervisor Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logsData.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{l.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{l.employeeName}</td>
                    <td className="py-3 px-4">{formatDate(l.workDate)}</td>
                    <td className="py-3 px-4 font-bold">{l.totalHours} hrs</td>
                    <td className="py-3 px-4">{l.submissionStatus}</td>
                    <td className="py-3 px-4 text-slate-500">{l.reviewerName || 'Unreviewed'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
