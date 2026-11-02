/**
 * Application Top Navbar with Notifications, User Profile & Quick Role Switcher
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  Sun,
  Moon,
  KeyRound,
  Shield,
  UserCheck,
  Briefcase,
  ChevronDown,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenChangePassword: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenChangePassword,
  darkMode,
  onToggleDarkMode,
}) => {
  const { user, login } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setShowRoleSwitcher(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Operational Overview', subtitle: 'Real-time staff workload, delivery KPIs, and team health' },
    tasks: { title: 'Task & Project Management', subtitle: 'Interactive Table, Kanban Workflow, and Gantt Timeline' },
    'daily-logs': { title: 'Staff Daily Work Logs', subtitle: 'Executive ledger & journal of daily deliverables, challenges, and approvals' },
    calendar: { title: 'Team Calendar & Reminders', subtitle: 'Key delivery milestones, reviews, and cross-department syncs' },
    reports: { title: 'Reports & Analytics', subtitle: 'Comprehensive audit-ready summaries, CSV data exports, and performance tracking' },
    users: { title: 'Staff & Role Management', subtitle: 'Provision employees, configure role permissions, and reset credentials' },
    departments: { title: 'Department Structure', subtitle: 'Organizational units, appointed managers, and departmental capacity' },
    'audit-logs': { title: 'Security Audit Trail', subtitle: 'Immutable event logs of all sensitive updates and logins' },
    settings: { title: 'Google Sheets Integration & Sync', subtitle: 'Cloudflare Pages Functions & Google Apps Script HMAC setup' },
  };

  const currentInfo = tabTitles[currentTab] || { title: 'Staff Management', subtitle: 'Enterprise Operations' };

  // Quick switch test accounts for seamless demonstration
  const handleQuickSwitch = async (username: string, pass: string) => {
    try {
      await login(username, pass);
      setShowRoleSwitcher(false);
    } catch (err: any) {
      alert('Error switching account: ' + err.message);
    }
  };

  return (
    <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-20">
      {/* Title & Context */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
          {currentInfo.title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
          {currentInfo.subtitle}
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Role Tester Dropdown (Essential for testing all 3 user roles effortlessly) */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100/80 transition-colors"
            title="Switch demo account to test different role permissions"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Switch Role (Test)</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Interactive Role Switcher</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Click to instantly test role-based access</p>
              </div>

              <div className="p-1 space-y-1">
                <button
                  onClick={() => handleQuickSwitch('admin', 'Admin@2026!Secure')}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                    user?.role === 'Administrator' ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900' : ''
                  }`}
                >
                  <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Alexander (Administrator)</p>
                    <p className="text-[11px] text-slate-500">Full system & security controls</p>
                  </div>
                  {user?.role === 'Administrator' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </button>

                <button
                  onClick={() => handleQuickSwitch('david.eng', 'Manager@2026!')}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                    user?.username === 'david.eng' ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900' : ''
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">David Chen (Manager)</p>
                    <p className="text-[11px] text-slate-500">Engineering Dept & Log approvals</p>
                  </div>
                  {user?.username === 'david.eng' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>

                <button
                  onClick={() => handleQuickSwitch('elena.dev', 'Staff@2026!')}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                    user?.username === 'elena.dev' ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900' : ''
                  }`}
                >
                  <Briefcase className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Elena Rostova (Staff)</p>
                    <p className="text-[11px] text-slate-500">Own daily log & assigned tasks</p>
                  </div>
                  {user?.username === 'elena.dev' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No notifications at this time.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id);
                        if (notif.link) {
                          const tab = notif.link.replace('/', '');
                          onSelectTab(tab);
                        }
                        setShowNotifMenu(false);
                      }}
                      className={`p-3 text-xs cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                        !notif.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold ${!notif.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1.5">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(notif.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {user?.fullName.charAt(0) || 'U'}
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline">
              {user?.fullName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 text-xs">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-white">{user?.fullName}</p>
                <p className="text-slate-400 text-[11px]">@{user?.username} &bull; {user?.role}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">{user?.departmentName || 'Apex Enterprise'}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenChangePassword();
                  }}
                  className="w-full text-left px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  <span>Change Password</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
