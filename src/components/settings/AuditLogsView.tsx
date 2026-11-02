/**
 * Security Audit Trail View
 * Searchable, immutable event log for compliance, logins, and permission changes.
 */

import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { api } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { formatDateTime, exportToCSV } from '../../utils/formatters';
import { ShieldAlert, Search, Download, RefreshCw, Filter } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { showToast } = useNotifications();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs({ limit: 200 });
      setLogs(data);
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (moduleFilter !== 'all' && l.module !== moduleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchUser = l.userName.toLowerCase().includes(q);
      const matchAction = l.action.toLowerCase().includes(q);
      const matchDetails = l.details.toLowerCase().includes(q);
      if (!matchUser && !matchAction && !matchDetails) return false;
    }
    return true;
  });

  const handleExport = () => {
    const exportData = filteredLogs.map((l) => ({
      Timestamp: l.timestamp,
      User: l.userName,
      Module: l.module,
      Action: l.action,
      Details: l.details,
    }));
    exportToCSV(exportData, 'security_audit_logs');
    showToast('Export Success', 'Downloaded audit trail to CSV.', 'success');
  };

  const modules = Array.from(new Set(logs.map((l) => l.module)));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Immutable Security Audit Trail ({logs.length} Logged Events)
          </h3>
          <p className="text-xs text-slate-500">
            Cryptographic non-repudiation log tracking all authentication events, administrative actions, and task updates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, action code, details..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="all">All Modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Module</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Event Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No audit events found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {log.userName}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                      {log.module}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-blue-600 dark:text-blue-400">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
