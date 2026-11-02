/**
 * Staff & User Management Module
 * Create, edit, deactivate, and manage employee accounts and role assignments.
 */

import React, { useState, useEffect } from 'react';
import { User, Department, Role } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../common/Modal';
import { formatDate, formatDateTime } from '../../utils/formatters';
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  UserX,
  UserCheck,
  Edit2,
  Search,
  Building,
  CheckCircle,
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const { showToast } = useNotifications();

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add/Edit User Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState('Staff');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset Password Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [userForReset, setUserForReset] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsersData = async () => {
    try {
      setLoading(true);
      const [u, d, r] = await Promise.all([
        api.getUsers(),
        api.getDepartments(),
        api.getRoles(),
      ]);
      setUsers(u);
      setDepartments(d);
      setRoles(r);
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setFullName('');
    setUsername('');
    setPassword('Staff@2026!');
    setDepartmentId(departments.length > 0 ? departments[0].id : '');
    setJobTitle('Operations Associate');
    setRole('Staff');
    setEmail('');
    setPhone('');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setIsUserModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setSelectedUser(u);
    setFullName(u.fullName);
    setUsername(u.username);
    setPassword('');
    setDepartmentId(u.departmentId);
    setJobTitle(u.jobTitle);
    setRole(u.role);
    setEmail(u.email || '');
    setPhone(u.phone || '');
    setJoiningDate(u.joiningDate);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) {
      showToast('Error', 'Full name and username are required.', 'warning');
      return;
    }
    if (!selectedUser && (!password || password.length < 8)) {
      showToast('Error', 'Initial password must be at least 8 characters.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      if (selectedUser) {
        const updated = await api.updateUser(selectedUser.id, {
          fullName,
          departmentId,
          jobTitle,
          role,
          email,
          phone,
          joiningDate,
        });
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        showToast('Updated', `User @${updated.username} updated successfully.`, 'success');
      } else {
        const created = await api.createUser({
          fullName,
          username,
          password,
          departmentId,
          jobTitle,
          role,
          email,
          phone,
          joiningDate,
        });
        setUsers((prev) => [created, ...prev]);
        showToast('Staff Provisioned', `New employee @${created.username} created.`, 'success');
      }
      setIsUserModalOpen(false);
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (u: User) => {
    const nextStatus = u.accountStatus === 'Active' ? 'Deactivated' : 'Active';
    if (!confirm(`Are you sure you want to change status of @${u.username} to ${nextStatus}?`)) return;

    try {
      const updated = await api.updateUser(u.id, { accountStatus: nextStatus });
      setUsers((prev) => prev.map((item) => (item.id === u.id ? updated : item)));
      showToast('Status Changed', `@${u.username} is now ${nextStatus}.`, 'info');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForReset || !newPassword || newPassword.length < 8) {
      showToast('Error', 'Password must be at least 8 characters long.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.resetPassword(userForReset.id, newPassword);
      showToast('Password Reset', `Password successfully updated for @${userForReset.username}.`, 'success');
      setIsResetModalOpen(false);
      setNewPassword('');
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter local users
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (deptFilter !== 'all' && u.departmentId !== deptFilter) return false;
    if (statusFilter !== 'all' && u.accountStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = u.fullName.toLowerCase().includes(q);
      const matchUser = u.username.toLowerCase().includes(q);
      const matchTitle = u.jobTitle.toLowerCase().includes(q);
      if (!matchName && !matchUser && !matchTitle) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Action Ribbon & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Staff Directory & Access Control ({users.length} Employees)
          </h3>
          <p className="text-xs text-slate-500">
            Provision organizational accounts, assign roles, and manage credentials
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add New Employee</span>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, username, title..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="all">All Roles</option>
          <option value="Administrator">Administrator</option>
          <option value="Manager">Manager</option>
          <option value="Staff">Staff</option>
        </select>

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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Deactivated">Deactivated</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Username</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Job Title</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Last Login</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No employee accounts found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {u.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{u.fullName}</p>
                        <p className="text-[11px] text-slate-400">{u.email || 'No email registered'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                    @{u.username}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {u.departmentName || 'General'}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                    {u.jobTitle}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        u.role === 'Administrator'
                          ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                          : u.role === 'Manager'
                          ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        u.accountStatus === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {u.accountStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                    {u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {isAdmin && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          title="Edit employee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setUserForReset(u);
                            setNewPassword('');
                            setIsResetModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          title="Reset password"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                        </button>

                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg border ${
                              u.accountStatus === 'Active'
                                ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={u.accountStatus === 'Active' ? 'Deactivate user' : 'Reactivate user'}
                          >
                            {u.accountStatus === 'Active' ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={selectedUser ? `Edit Employee @${selectedUser.username}` : 'Provision New Staff Member'}
        subtitle="Credentials will be securely hashed with salted PBKDF2-SHA256"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rachel Adams"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unique Username *
              </label>
              <input
                type="text"
                required
                disabled={!!selectedUser}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                placeholder="e.g. rachel.adams"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 font-mono"
              />
            </div>
          </div>

          {!selectedUser && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Account Password * (min 8 chars)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Initial secure temporary password..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Financial Analyst"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-semibold"
              >
                <option value="Staff">Staff</option>
                <option value="Manager">Manager</option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rachel@company.internal"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 019-2890"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Joining Date
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Saving...' : selectedUser ? 'Save Updates' : 'Provision Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={`Reset Password for @${userForReset?.username}`}
        subtitle="Generate and assign a new secure credential for this user"
        maxWidth="md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Password (min 8 characters) *
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Set New Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
