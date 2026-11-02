/**
 * Google Sheets Integration & HMAC Sync Settings Panel
 * Manages Google Apps Script Web App URL, secret keys, 12-tab schema verification, and batch sync.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SystemSettings } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import { formatDateTime } from '../../utils/formatters';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  ExternalLink,
  ShieldCheck,
  Copy,
  Layers,
  Sparkles,
} from 'lucide-react';

export const GoogleSheetsSyncPanel: React.FC = () => {
  const { showToast } = useNotifications();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [appsScriptSecret, setAppsScriptSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
      setAppsScriptUrl(data.appsScriptUrl || '');
      setAppsScriptSecret(data.appsScriptSecret || '');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await api.updateSettings({
        appsScriptUrl: appsScriptUrl.trim(),
        appsScriptSecret: appsScriptSecret.trim(),
      });
      setSettings(updated);
      showToast('Settings Saved', 'Google Sheets endpoint configuration updated.', 'success');
    } catch (err: any) {
      showToast('Error Saving Settings', err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const res = await api.testGoogleSheetsSync();
      if (res.success) {
        showToast('Connection Verified', res.message, 'success');
        fetchSettings();
      } else {
        showToast('Connection Warning', res.message, 'warning');
      }
    } catch (err: any) {
      showToast('Sync Test Failed', err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleTriggerSync = async () => {
    try {
      setSyncing(true);
      const res = await api.triggerManualSync();
      showToast('Sync Success', res.message, 'success');
      fetchSettings();
    } catch (err: any) {
      showToast('Sync Error', err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied', 'Copied to clipboard.', 'info');
  };

  const sheetTabs = [
    { name: 'Users', desc: 'Employee profiles, UUIDs, roles, department mappings' },
    { name: 'Roles', desc: 'System and custom roles with granular permissions' },
    { name: 'Permissions', desc: 'System permission catalogue' },
    { name: 'RolePermissions', desc: 'Role to permission relationship mapping' },
    { name: 'Departments', desc: 'Organizational units, codes, appointed managers' },
    { name: 'Tasks', desc: 'Deliverables, assignees, priorities, status, Gantt dates' },
    { name: 'DailyLogs', desc: 'Book-style work records, start/end times, total hours' },
    { name: 'LogReviews', desc: 'Supervisor approval decisions and timestamps' },
    { name: 'CalendarEvents', desc: 'Meetings, milestones, and task reminders' },
    { name: 'Notifications', desc: 'In-app notification records and read states' },
    { name: 'AuditLogs', desc: 'Immutable security event history and logins' },
    { name: 'Settings', desc: 'Global system configuration and sync flags' },
  ];

  if (loading || !settings) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading sync settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Google Sheets Database & Apps Script Integration
              </h3>
              <p className="text-xs text-slate-500">
                12-Tab Central Spreadsheet Database with HMAC-SHA256 Authenticated Gateway
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
                settings.syncStatus === 'Connected'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : settings.syncStatus === 'Error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {settings.syncStatus === 'Connected' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>Status: {settings.syncStatus || 'Not Configured'}</span>
            </span>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSaveSettings} className="pt-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Google Apps Script Web App Deployment URL
            </label>
            <input
              type="url"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Deploy your Apps Script code as a <strong>Web App</strong> (Execute as: Me, Who has access: Anyone) and paste the URL here.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
              Shared HMAC-SHA256 Signing Secret
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={appsScriptSecret}
                onChange={(e) => setAppsScriptSecret(e.target.value)}
                placeholder="sec_..."
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(appsScriptSecret)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1"
                title="Copy secret"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              This secret is shared only between Cloudflare Pages Functions and Google Apps Script Script Properties (<code>API_SIGNING_SECRET</code>). It is never sent to the browser.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">
              {settings.lastSyncTimestamp && `Last batch synchronization: ${formatDateTime(settings.lastSyncTimestamp)}`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={testing || !appsScriptUrl}
                onClick={handleTestConnection}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>Test HMAC Handshake</span>
              </button>

              <button
                type="button"
                disabled={syncing}
                onClick={handleTriggerSync}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold disabled:opacity-50"
              >
                <Layers className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>Trigger Full Batch Sync</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 12-Tab Database Schema Architecture Guide */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            12 Database Tabs Architecture
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            The application maintains 12 dedicated tabs inside Google Sheets with stable UUIDs, formula injection protection, and Google Apps Script LockService concurrency controls.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sheetTabs.map((tab, idx) => (
            <div
              key={tab.name}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 dark:text-white">
                  {idx + 1}. {tab.name}
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{tab.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
