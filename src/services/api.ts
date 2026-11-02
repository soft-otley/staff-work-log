/**
 * Staff Work Log API Service
 * Handles all communication with the secure backend endpoints.
 */

import {
  User,
  Department,
  Role,
  Task,
  DailyLog,
  LogAuditRecord,
  CalendarEvent,
  AppNotification,
  AuditLog,
  SystemSettings,
  DashboardStats,
} from '../types';

class ApiService {
  private baseUrl = '/api';

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Attach stored token if available in sessionStorage / localStorage fallback
    const token = localStorage.getItem('swl_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Includes httpOnly cookies for sessions
      });

      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        // Clear token on 401 and notify auth state
        localStorage.removeItem('swl_token');
        localStorage.removeItem('swl_user');
        window.dispatchEvent(new CustomEvent('swl:unauthorized'));
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.error || data.message || `Request failed with status ${response.status}`);
        (error as any).status = response.status;
        throw error;
      }

      return data as T;
    } catch (err: any) {
      // Do not log 401 errors as fatal errors
      if (err.status !== 401) {
        console.warn(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err.message || err);
      }
      throw err;
    }
  }

  // --- Auth Endpoints ---
  async login(username: string, password: string):Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.token) {
      localStorage.setItem('swl_token', res.token);
      localStorage.setItem('swl_user', JSON.stringify(res.user));
    }
    return res;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('swl_token');
      localStorage.removeItem('swl_user');
    }
  }

  async getMe(): Promise<{ user: User; systemInitialized: boolean }> {
    return this.request<{ user: User; systemInitialized: boolean }>('/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async bootstrapAdmin(adminData: { username: string; fullName: string; password: string; email?: string }): Promise<{ user: User; token: string }> {
    const res = await this.request<{ user: User; token: string }>('/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
    if (res.token) {
      localStorage.setItem('swl_token', res.token);
      localStorage.setItem('swl_user', JSON.stringify(res.user));
    }
    return res;
  }

  // --- Users Endpoints ---
  async getUsers(params?: { departmentId?: string; role?: string; status?: string }): Promise<User[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<User[]>(`/users${query ? `?${query}` : ''}`);
  }

  async createUser(userData: Partial<User> & { password: string }): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async resetPassword(id: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  // --- Departments ---
  async getDepartments(): Promise<Department[]> {
    return this.request<Department[]>('/departments');
  }

  async createDepartment(data: Partial<Department>): Promise<Department> {
    return this.request<Department>('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDepartment(id: string, data: Partial<Department>): Promise<Department> {
    return this.request<Department>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Roles & Permissions ---
  async getRoles(): Promise<Role[]> {
    return this.request<Role[]>('/roles');
  }

  async createRole(data: Partial<Role>): Promise<Role> {
    return this.request<Role>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRole(id: string, data: Partial<Role>): Promise<Role> {
    return this.request<Role>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Tasks ---
  async getTasks(params?: { status?: string; priority?: string; departmentId?: string; assignedTo?: string; search?: string }): Promise<Task[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<Task[]>(`/tasks${query ? `?${query}` : ''}`);
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id: string, taskData: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  }

  async addTaskComment(id: string, comment: string): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  }

  async deleteTask(id: string): Promise<{ success: boolean }> {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  // --- Daily Work Logs ---
  async getDailyLogs(params?: { employeeId?: string; departmentId?: string; startDate?: string; endDate?: string; status?: string }): Promise<DailyLog[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<DailyLog[]>(`/daily-logs${query ? `?${query}` : ''}`);
  }

  async getDailyLog(id: string): Promise<DailyLog> {
    return this.request<DailyLog>(`/daily-logs/${id}`);
  }

  async createDailyLog(data: Partial<DailyLog>): Promise<DailyLog> {
    return this.request<DailyLog>('/daily-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDailyLog(id: string, data: Partial<DailyLog>): Promise<DailyLog> {
    return this.request<DailyLog>(`/daily-logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async submitDailyLog(id: string): Promise<DailyLog> {
    return this.request<DailyLog>(`/daily-logs/${id}/submit`, {
      method: 'POST',
    });
  }

  async reviewDailyLog(id: string, review: { status: 'Approved' | 'Rejected'; comments: string }): Promise<DailyLog> {
    return this.request<DailyLog>(`/daily-logs/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(review),
    });
  }

  async reopenDailyLog(id: string, reason: string): Promise<DailyLog> {
    return this.request<DailyLog>(`/daily-logs/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getLogAuditHistory(id: string): Promise<LogAuditRecord[]> {
    return this.request<LogAuditRecord[]>(`/daily-logs/${id}/audit`);
  }

  // --- Calendar Events ---
  async getCalendarEvents(params?: { startDate?: string; endDate?: string; departmentId?: string }): Promise<CalendarEvent[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<CalendarEvent[]>(`/calendar${query ? `?${query}` : ''}`);
  }

  async createCalendarEvent(data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return this.request<CalendarEvent>('/calendar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCalendarEvent(id: string, data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(`/calendar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCalendarEvent(id: string): Promise<{ success: boolean }> {
    return this.request(`/calendar/${id}`, { method: 'DELETE' });
  }

  // --- Reports & Dashboard Stats ---
  async getDashboardStats(range?: string): Promise<DashboardStats> {
    const query = range ? `?range=${range}` : '';
    return this.request<DashboardStats>(`/reports/dashboard${query}`);
  }

  async getTaskReport(filters: any): Promise<any> {
    const query = new URLSearchParams(filters).toString();
    return this.request<any>(`/reports/tasks?${query}`);
  }

  async getDailyLogsReport(filters: any): Promise<any> {
    const query = new URLSearchParams(filters).toString();
    return this.request<any>(`/reports/daily-logs?${query}`);
  }

  async getEmployeesReport(filters: any): Promise<any> {
    const query = new URLSearchParams(filters).toString();
    return this.request<any>(`/reports/employees?${query}`);
  }

  // --- Notifications ---
  async getNotifications(): Promise<AppNotification[]> {
    return this.request<AppNotification[]>('/notifications');
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.request(`/notifications/${id}/read`, { method: 'POST' });
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await this.request('/notifications/read-all', { method: 'POST' });
  }

  // --- Audit Logs ---
  async getAuditLogs(params?: { limit?: number; module?: string }): Promise<AuditLog[]> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<AuditLog[]>(`/audit-logs${query ? `?${query}` : ''}`);
  }

  // --- System Settings & Google Sheets Sync ---
  async getSettings(): Promise<SystemSettings> {
    return this.request<SystemSettings>('/settings');
  }

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    return this.request<SystemSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async testGoogleSheetsSync(): Promise<{ success: boolean; message: string; details?: any }> {
    return this.request('/sync/test', { method: 'POST' });
  }

  async triggerManualSync(): Promise<{ success: boolean; message: string; timestamp: string }> {
    return this.request('/sync/trigger', { method: 'POST' });
  }
}

export const api = new ApiService();
