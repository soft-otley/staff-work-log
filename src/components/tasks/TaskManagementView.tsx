/**
 * Comprehensive Task Management Module
 * Supporting Table View, Kanban Board, Gantt Chart, and Filtering.
 */

import React, { useState, useEffect } from 'react';
import { Task, User, Department, TaskStatus, TaskPriority } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { KanbanBoard } from './KanbanBoard';
import { GanttChart } from './GanttChart';
import { TaskModal } from './TaskModal';
import { TaskDetailModal } from './TaskDetailModal';
import {
  formatDate,
  getStatusBadgeClass,
  getPriorityBadgeClass,
  exportToCSV,
} from '../../utils/formatters';
import {
  Table,
  Kanban,
  Calendar,
  Search,
  Filter,
  Plus,
  Download,
  Clock,
  ArrowUpDown,
  MoreVertical,
  CheckCircle2,
} from 'lucide-react';

export const TaskManagementView: React.FC = () => {
  const { user, isAdmin, isManager } = useAuth();
  const { showToast } = useNotifications();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // View state: 'table' | 'kanban' | 'gantt'
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'gantt'>('table');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fetchedTasks, fetchedUsers, fetchedDepts] = await Promise.all([
        api.getTasks(),
        api.getUsers(),
        api.getDepartments(),
      ]);
      setTasks(fetchedTasks);
      setUsers(fetchedUsers);
      setDepartments(fetchedDepts);
    } catch (err: any) {
      showToast('Error Loading Data', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrUpdateTask = async (taskData: Partial<Task>) => {
    try {
      if (selectedTaskForEdit) {
        const updated = await api.updateTask(selectedTaskForEdit.id, taskData);
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        showToast('Task Updated', `Task ${updated.id} successfully updated.`, 'success');
      } else {
        const created = await api.createTask(taskData);
        setTasks((prev) => [created, ...prev]);
        showToast('Task Created', `Task ${created.id} assigned to ${created.assigneeName}.`, 'success');
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
      throw err;
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const updated = await api.updateTask(taskId, {
        status: newStatus,
        progress: newStatus === 'Completed' ? 100 : undefined,
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      showToast('Status Updated', `Task ${taskId} moved to ${newStatus}.`, 'success');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleUpdateTaskDetails = async (id: string, updates: Partial<Task>) => {
    try {
      const updated = await api.updateTask(id, updates);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setSelectedTaskForDetail(updated);
      showToast('Saved', 'Task updates applied successfully.', 'success');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
      throw err;
    }
  };

  const handleAddComment = async (id: string, comment: string) => {
    try {
      const updated = await api.addTaskComment(id, comment);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setSelectedTaskForDetail(updated);
      showToast('Comment Posted', 'Comment added to task history.', 'info');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
      throw err;
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      showToast('Deleted', `Task ${id} removed.`, 'info');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
      throw err;
    }
  };

  // Filter tasks locally
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (deptFilter !== 'all' && t.departmentId !== deptFilter) return false;
    if (assigneeFilter !== 'all' && t.assignedTo !== assigneeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchId = t.id.toLowerCase().includes(q);
      const matchAssignee = t.assigneeName && t.assigneeName.toLowerCase().includes(q);
      if (!matchTitle && !matchId && !matchAssignee) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    const exportData = filteredTasks.map((t) => ({
      'Task ID': t.id,
      Title: t.title,
      Assignee: t.assigneeName,
      Department: t.departmentName,
      Priority: t.priority,
      Status: t.status,
      'Progress %': t.progress,
      'Start Date': t.startDate,
      'Due Date': t.dueDate,
      'Est Hours': t.estimatedHours,
      'Actual Hours': t.actualHours,
      'Created By': t.creatorName,
      'Created Date': t.createdAt,
    }));
    exportToCSV(exportData, 'tasks_export');
    showToast('Export Complete', 'Exported task records to CSV format.', 'success');
  };

  return (
    <div className="space-y-5">
      {/* View Switcher, Search & Action Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: View Mode Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Table View</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Kanban Board</span>
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'gantt'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Gantt Timeline</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            title="Export tasks to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {(isAdmin || isManager) && (
            <button
              onClick={() => {
                setSelectedTaskForEdit(null);
                setIsTaskModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, title, assignee..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="On Hold">On Hold</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="all">All Priorities</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Department Filter */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Assignee Filter */}
        {(isAdmin || isManager) && (
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
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

        {/* Clear Filters */}
        {(statusFilter !== 'all' || priorityFilter !== 'all' || deptFilter !== 'all' || assigneeFilter !== 'all' || search) && (
          <button
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setDeptFilter('all');
              setAssigneeFilter('all');
              setSearch('');
            }}
            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading task records...</div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          tasks={filteredTasks}
          onSelectTask={(task) => setSelectedTaskForDetail(task)}
          onUpdateStatus={handleUpdateStatus}
        />
      ) : viewMode === 'gantt' ? (
        <GanttChart
          tasks={filteredTasks}
          onSelectTask={(task) => setSelectedTaskForDetail(task)}
        />
      ) : (
        /* Professional Table View */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Task ID</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No tasks found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTaskForDetail(task)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {task.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                        {task.title}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[10px]">
                            {task.assigneeName ? task.assigneeName.charAt(0) : '?'}
                          </div>
                          <span>{task.assigneeName || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {task.departmentName || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getStatusBadgeClass(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-medium">{task.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium">
                        {formatDate(task.dueDate)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedTaskForDetail(task)}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-300"
                        >
                          View
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

      {/* Task Create/Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleCreateOrUpdateTask}
        task={selectedTaskForEdit}
        users={users}
        departments={departments}
      />

      {/* Task Detail Drawer/Modal */}
      <TaskDetailModal
        isOpen={!!selectedTaskForDetail}
        onClose={() => setSelectedTaskForDetail(null)}
        task={selectedTaskForDetail}
        onUpdateTask={handleUpdateTaskDetails}
        onAddComment={handleAddComment}
        onEditTask={(t) => {
          setSelectedTaskForEdit(t);
          setIsTaskModalOpen(true);
        }}
        onDeleteTask={isAdmin ? handleDeleteTask : undefined}
      />
    </div>
  );
};
