/**
 * Department Management Module
 * Create, edit, and inspect organizational units and appointed managers.
 */

import React, { useState, useEffect } from 'react';
import { Department, User } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../common/Modal';
import { formatDate } from '../../utils/formatters';
import {
  Building2,
  Plus,
  Users,
  UserCheck,
  Edit2,
  Briefcase,
} from 'lucide-react';

export const DepartmentManagementView: React.FC = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useNotifications();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDepts = async () => {
    try {
      setLoading(true);
      const [d, u] = await Promise.all([api.getDepartments(), api.getUsers()]);
      setDepartments(d);
      setUsers(u);
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const handleOpenAdd = () => {
    setSelectedDept(null);
    setName('');
    setCode('');
    setDescription('');
    setManagerId('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setSelectedDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setDescription(dept.description);
    setManagerId(dept.managerId || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      showToast('Error', 'Name and code are required.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (selectedDept) {
        const updated = await api.updateDepartment(selectedDept.id, {
          name,
          code,
          description,
          managerId,
        });
        setDepartments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        showToast('Updated', `Department ${updated.name} updated.`, 'success');
      } else {
        const created = await api.createDepartment({
          name,
          code,
          description,
          managerId,
        });
        setDepartments((prev) => [...prev, created]);
        showToast('Created', `Department ${created.name} established.`, 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Organizational Departments ({departments.length} Units)
          </h3>
          <p className="text-xs text-slate-500">
            Structure operational hierarchy, designate team managers, and track capacity
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Department</span>
          </button>
        )}
      </div>

      {/* Grid of Department Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => {
          const deptEmployees = users.filter((u) => u.departmentId === dept.id);

          return (
            <div
              key={dept.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {dept.code}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => handleOpenEdit(dept)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  {dept.name}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {dept.description || 'No detailed mission description defined.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                    Manager:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {dept.managerName || 'Unassigned'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-500" />
                    Headcount:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {dept.employeeCount || deptEmployees.length} staff
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDept ? `Edit Department: ${selectedDept.name}` : 'Create Department'}
        subtitle="Define departmental code, charter, and appoint supervisor"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Research & Innovation"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department Code *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. R&D"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Appointed Department Manager
            </label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            >
              <option value="">No Manager Assigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role} - @{u.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mission & Responsibilities
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational charter and key activities..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Saving...' : selectedDept ? 'Save Updates' : 'Create Unit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
