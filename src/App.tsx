/**
 * Staff Work Log & Team Management Web Application
 * Root Application Component with Navigation, Theme, and Module Routing.
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ToastContainer } from './components/common/ToastContainer';
import { LoginView } from './components/auth/LoginView';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';

// Modules
import { DashboardView } from './components/dashboard/DashboardView';
import { TaskManagementView } from './components/tasks/TaskManagementView';
import { DailyLogManagementView } from './components/dailylogs/DailyLogManagementView';
import { CalendarView } from './components/calendar/CalendarView';
import { ReportsView } from './components/reports/ReportsView';
import { UserManagementView } from './components/users/UserManagementView';
import { DepartmentManagementView } from './components/departments/DepartmentManagementView';
import { AuditLogsView } from './components/settings/AuditLogsView';
import { GoogleSheetsSyncPanel } from './components/settings/GoogleSheetsSyncPanel';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  // Navigation state
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Dark Mode
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('swl_dark_mode') === 'true';
  });

  // Change Password Modal
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('swl_dark_mode', String(darkMode));
  }, [darkMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-['Public_Sans',sans-serif]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Initializing Staff Work Log System...
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated view
  if (!user) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <LoginView />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Navbar */}
        <Navbar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />

        {/* Page Container */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentTab}
              onOpenNewTask={() => setCurrentTab('tasks')}
              onOpenNewLog={() => setCurrentTab('daily-logs')}
            />
          )}

          {currentTab === 'tasks' && <TaskManagementView />}

          {currentTab === 'daily-logs' && <DailyLogManagementView />}

          {currentTab === 'calendar' && <CalendarView />}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'users' && <UserManagementView />}

          {currentTab === 'departments' && <DepartmentManagementView />}

          {currentTab === 'audit-logs' && <AuditLogsView />}

          {currentTab === 'settings' && <GoogleSheetsSyncPanel />}
        </main>
      </div>

      {/* Change Password Dialog */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* In-App Alerts Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
