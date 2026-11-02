/**
 * Professional Navy Blue Primary Navigation Sidebar
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Calendar,
  BarChart3,
  Users,
  Building2,
  FileSpreadsheet,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Shield,
  Briefcase,
  UserCheck,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}) => {
  const { user, logout, isAdmin, isManager } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      shortLabel: 'Dashboard',
      icon: LayoutDashboard,
      allowed: true,
    },
    {
      id: 'tasks',
      label: 'Tasks & Gantt Projects',
      shortLabel: 'Tasks',
      icon: CheckSquare,
      allowed: true,
    },
    {
      id: 'daily-logs',
      label: 'Daily Work Logs',
      shortLabel: 'Work Logs',
      icon: BookOpen,
      badge: 'Book',
      allowed: true,
    },
    {
      id: 'calendar',
      label: 'Team Calendar & Events',
      shortLabel: 'Calendar',
      icon: Calendar,
      allowed: true,
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      shortLabel: 'Reports',
      icon: BarChart3,
      allowed: true,
    },
    {
      id: 'users',
      label: 'Staff & Role Management',
      shortLabel: 'Staff',
      icon: Users,
      allowed: isManager || isAdmin,
    },
    {
      id: 'departments',
      label: 'Departments',
      shortLabel: 'Depts',
      icon: Building2,
      allowed: isAdmin,
    },
    {
      id: 'audit-logs',
      label: 'Security Audit Trail',
      shortLabel: 'Audit',
      icon: ShieldAlert,
      allowed: isAdmin,
    },
    {
      id: 'settings',
      label: 'Google Sheets & Sync',
      shortLabel: 'Sheets Sync',
      icon: FileSpreadsheet,
      allowed: isAdmin,
    },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 bg-[#0b192c] text-slate-100 flex flex-col transition-all duration-300 z-30 select-none border-r border-[#1a2d48] ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#1b2f4c]">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-900/40">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                StaffLog
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Enterprise
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">Work Management</p>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 mx-auto rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">
            <Briefcase className="w-5 h-5" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/60 hidden md:block"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>
      </div>

      {/* Role Pill Header */}
      {!collapsed && user && (
        <div className="px-4 py-3 bg-[#081322] border-b border-[#1b2f4c] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {isAdmin ? (
              <Shield className="w-4 h-4 text-amber-400" />
            ) : isManager ? (
              <UserCheck className="w-4 h-4 text-blue-400" />
            ) : (
              <Briefcase className="w-4 h-4 text-emerald-400" />
            )}
            <span className="font-semibold text-slate-200">{user.role} View</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
            {user.departmentName ? user.departmentName.split(' ')[0] : 'All'}
          </span>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems
          .filter((item) => item.allowed)
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-700/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!collapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
      </nav>

      {/* User Card & Logout */}
      <div className="p-3 border-t border-[#1b2f4c] bg-[#081322]">
        {user && !collapsed && (
          <div className="flex items-center gap-3 mb-2 px-1">
            <div className="w-9 h-9 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow">
              {user.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.fullName}</p>
              <p className="text-[11px] text-slate-400 truncate">@{user.username}</p>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-400" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
