/**
 * Data Types and Models for Staff Work Log & Team Management System
 */

export type RoleType = 'Administrator' | 'Manager' | 'Staff' | string;

export type TaskStatus = 'Not Started' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type LogSubmissionStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Reopened';

export interface User {
  id: string;
  username: string;
  fullName: string;
  departmentId: string;
  departmentName?: string;
  jobTitle: string;
  role: RoleType;
  roleId?: string;
  email?: string;
  phone?: string;
  joiningDate: string;
  accountStatus: 'Active' | 'Deactivated';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  managerId: string;
  managerName?: string;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  category: 'users' | 'tasks' | 'logs' | 'reports' | 'departments' | 'settings';
  description: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userRole: string;
  comment: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // User ID
  assigneeName?: string;
  departmentId: string;
  departmentName?: string;
  createdBy: string; // User ID
  creatorName?: string;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  priority: TaskPriority;
  status: TaskStatus;
  progress: number; // 0 - 100
  estimatedHours: number;
  actualHours: number;
  completionDate?: string;
  dependencies?: string[]; // Task IDs
  comments?: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyLog {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  departmentName?: string;
  workDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  totalHours: number;
  workDescription: string;
  tasksCompleted: string;
  pendingTasks: string;
  problemsEncountered: string;
  nextDayPlan: string;
  additionalNotes: string;
  submissionStatus: LogSubmissionStatus;
  managerComments?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewedAt?: string;
  reopenedBy?: string;
  reopenedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogAuditRecord {
  id: string;
  logId: string;
  modifiedBy: string;
  modifierName: string;
  action: 'Created' | 'Updated' | 'Submitted' | 'Approved' | 'Rejected' | 'Reopened';
  changes: Record<string, { old: any; new: any }>;
  timestamp: string;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: 'TaskDeadline' | 'Meeting' | 'Reminder' | 'StaffEvent' | 'CompanyEvent';
  startDate: string; // ISO string or YYYY-MM-DD
  endDate?: string;
  allDay: boolean;
  departmentId?: string;
  createdById: string;
  creatorName?: string;
  attendees?: string[]; // User IDs
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'deadline_near' | 'task_overdue' | 'log_comment' | 'log_reviewed' | 'task_completed' | 'reminder';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface SystemSettings {
  companyName: string;
  companyLogoUrl?: string;
  standardWorkHoursPerDay: number;
  appsScriptUrl: string;
  appsScriptSecret: string;
  lastSyncTimestamp?: string;
  syncStatus: 'Not Configured' | 'Connected' | 'Error';
  syncErrorMessage?: string;
  allowSelfRegistration: boolean;
  requireLogApproval: boolean;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  tasksAssigned: number;
  tasksInProgress: number;
  tasksCompleted: number;
  tasksOverdue: number;
  pendingLogSubmissions: number;
  totalHoursLoggedThisWeek: number;
  recentActivities: AuditLog[];
  weeklyCompletion: { day: string; completed: number; target: number }[];
  monthlyProgress: { month: string; tasks: number; hours: number }[];
  departmentPerformance: { name: string; completionRate: number; tasksCount: number }[];
  statusDistribution: { name: string; count: number; color: string }[];
  dailyHoursData: { date: string; hours: number }[];
}
