/**
 * Executive Dashboard with Recharts Analytics & Role Awareness
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { DashboardStats } from '../../types';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  CalendarDays,
  PlusCircle,
  FileSpreadsheet,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { formatDateTime } from '../../utils/formatters';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onOpenNewTask: () => void;
  onOpenNewLog: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenNewTask,
  onOpenNewLog,
}) => {
  const { user, isAdmin, isManager } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('week');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats(dateFilter);
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateFilter]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Aggregating enterprise statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Welcome back, {user?.fullName}!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {user?.role === 'Administrator'
              ? 'Company-wide operational view for all departments'
              : user?.role === 'Manager'
              ? `Department overview for ${user?.departmentName || 'your team'}`
              : 'Individual dashboard: track your daily deliverables and assigned tasks'}
          </p>
        </div>

        {/* Date Filter & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                dateFilter === 'today'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                dateFilter === 'week'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                dateFilter === 'month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
          </div>

          {(isAdmin || isManager) && (
            <button
              onClick={onOpenNewTask}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          )}

          <button
            onClick={onOpenNewLog}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Write Daily Log</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {/* Total Employees (Admin/Manager) */}
        {(isAdmin || isManager) && (
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Staff</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {stats.totalEmployees}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              {stats.activeEmployees} active accounts
            </p>
          </div>
        )}

        {/* Tasks Assigned */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Tasks</span>
            <Activity className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.tasksAssigned}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">In scope</span>
        </div>

        {/* In Progress */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">In Progress</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {stats.tasksInProgress}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Active work</span>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.tasksCompleted}
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block font-medium">
            Delivered
          </span>
        </div>

        {/* Overdue */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-200 dark:border-rose-950/60 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            {stats.tasksOverdue}
          </p>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 block font-medium">
            Requires action
          </span>
        </div>

        {/* Pending Daily Logs */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-950/60 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Pending Logs</span>
            <FileCheck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats.pendingLogSubmissions}
          </p>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 block font-medium">
            Awaiting review
          </span>
        </div>

        {/* Total Hours Logged */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Hours Logged</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {stats.totalHoursLoggedThisWeek}h
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block font-medium">Past 7 days</span>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Task Completion vs Target */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Weekly Task Completion Throughput
              </h3>
              <p className="text-xs text-slate-500">Tasks delivered vs target capacity per day</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium">
              Current Week
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyCompletion}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey="completed" name="Tasks Completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Target Plan" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Status Distribution (Donut) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Task Status Distribution
            </h3>
            <p className="text-xs text-slate-500">Portfolio breakdown by status</p>
          </div>

          <div className="h-64 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {stats.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              {stats.statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}: <strong>{item.count}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Logged Hours Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daily Work Hours Trend
              </h3>
              <p className="text-xs text-slate-500">Recorded employee work log hours</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">Past 7 days</span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyHoursData}>
                <defs>
                  <linearGradient id="hourColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} unit="h" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="hours" name="Work Hours" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#hourColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Delivery Performance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Department Delivery Rates
            </h3>
            <p className="text-xs text-slate-500">Percentage of tasks completed</p>
          </div>

          <div className="space-y-4">
            {stats.departmentPerformance.map((dept) => (
              <div key={dept.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{dept.name}</span>
                  <span className="text-slate-500 font-medium">{dept.completionRate}% ({dept.tasksCount} tasks)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${dept.completionRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activities Feed & Quick Navigation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Activities */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Recent System & Work Activities
              </h3>
              <p className="text-xs text-slate-500">Verified actions across teams</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => onNavigate('audit-logs')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span>Full Audit Log</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {stats.recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No recent activities recorded.</p>
            ) : (
              stats.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {act.userName}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(act.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      {act.details}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {act.module} &bull; {act.action}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Help & Google Sheets Gateway Card */}
        <div className="bg-gradient-to-br from-[#0b192c] to-[#1e3a8a] text-white p-5 rounded-xl shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet className="w-6 h-6 text-blue-300" />
              <h3 className="font-bold text-sm">Google Sheets Integration</h3>
            </div>
            <p className="text-xs text-blue-100/90 leading-relaxed mb-4">
              All staff tasks, daily work journals, and audit records sync via Google Apps Script with HMAC-SHA256 signature security and LockService concurrency protection across 12 sheet tabs.
            </p>

            <div className="space-y-2 text-xs bg-white/10 p-3 rounded-lg border border-white/15">
              <div className="flex justify-between">
                <span className="text-blue-200">Database Engine:</span>
                <span className="font-semibold">Google Sheets (12 Tabs)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">API Gateway:</span>
                <span className="font-semibold">Cloudflare Pages Functions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">Authentication:</span>
                <span className="font-semibold">PBKDF2-SHA256 (100k iter)</span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            {isAdmin ? (
              <button
                onClick={() => onNavigate('settings')}
                className="w-full py-2 px-3 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm"
              >
                Configure Sheets & Test Sync
              </button>
            ) : (
              <p className="text-[11px] text-blue-200/80 text-center">
                System operational &bull; Secure session active
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
