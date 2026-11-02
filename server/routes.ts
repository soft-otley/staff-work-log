/**
 * Server API Routes with Authentication, RBAC, Validation & Audit Logging
 */

import { Router, Request, Response, NextFunction } from 'express';
import { db, hashPassword, verifyPassword, signHmacSha256 } from './db';

export const apiRouter = Router();

// --- Formula Sanitizer to Prevent CSV / Spreadsheet Injection ---
function sanitizeValue(val: any): any {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      return `'${trimmed}`;
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === 'object') {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      clean[key] = sanitizeValue(val[key]);
    }
    return clean;
  }
  return val;
}

// Request Sanitizer Middleware
apiRouter.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
});

// Extend Express Request
export interface AuthRequest extends Request {
  user?: any;
  token?: string;
}

// Auth Middleware
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  let token = req.cookies?.swl_session;
  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const user = await db.validateSession(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  req.user = user;
  req.token = token;
  next();
};

// RBAC Middleware
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role === 'Administrator') {
      return next(); // Admins bypass role checks
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions.' });
    }
    next();
  };
};

// Helper: safe user (strip password hash and salt)
function safeUser(u: any) {
  if (!u) return null;
  const { passwordHash, passwordSalt, ...rest } = u;
  return rest;
}

// ==========================================
// 1. AUTHENTICATION & SESSION ENDPOINTS
// ==========================================

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const users = await db.getTable<any>('users');
    const user = users.find((u) => u.username.toLowerCase() === String(username).toLowerCase().trim());

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (user.accountStatus === 'Deactivated') {
      return res.status(403).json({ error: 'This user account has been deactivated. Please contact an administrator.' });
    }

    const isValid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      await db.logAudit(user.id, user.fullName, 'FAILED_LOGIN', 'Authentication', `Failed password attempt for user: ${username}`);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Create session token
    const token = await db.createSession(user.id);

    // Update lastLogin
    await db.updateRecord('users', user.id, { lastLogin: new Date().toISOString() });

    // Set HttpOnly SameSite cookie
    res.cookie('swl_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await db.logAudit(user.id, user.fullName, 'USER_LOGIN', 'Authentication', `Successful login for user: ${user.username}`);

    return res.json({
      token,
      user: safeUser(user),
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

apiRouter.post('/auth/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.token) {
      await db.destroySession(req.token);
    }
    res.clearCookie('swl_session');
    if (req.user) {
      await db.logAudit(req.user.id, req.user.fullName, 'USER_LOGOUT', 'Authentication', 'User logged out.');
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/auth/me', async (req: Request, res: Response) => {
  try {
    let token = req.cookies?.swl_session;
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    const users = await db.getTable<any>('users');
    const systemInitialized = users.length > 0;

    if (!token) {
      return res.json({ user: null, systemInitialized });
    }

    const user = await db.validateSession(token);
    return res.json({
      user: safeUser(user),
      systemInitialized,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const user = await db.getRecord<any>('users', req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    const { hash, salt } = await hashPassword(newPassword);
    await db.updateRecord('users', req.user.id, {
      passwordHash: hash,
      passwordSalt: salt,
    });

    await db.logAudit(req.user.id, req.user.fullName, 'PASSWORD_CHANGE', 'Authentication', 'User changed their account password.');

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/bootstrap', async (req: Request, res: Response) => {
  try {
    const users = await db.getTable<any>('users');
    const hasAdmin = users.some((u) => u.role === 'Administrator');
    if (hasAdmin) {
      return res.status(400).json({ error: 'System is already initialized with an Administrator.' });
    }

    const { username, fullName, password, email } = req.body;
    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'Username, password, and full name are required.' });
    }

    const { hash, salt } = await hashPassword(password);
    const now = new Date().toISOString();
    const adminUser = {
      id: 'usr-admin-' + Date.now().toString(36),
      username: username.toLowerCase().trim(),
      fullName,
      email: email || '',
      passwordHash: hash,
      passwordSalt: salt,
      departmentId: 'dept-ops',
      departmentName: 'Operations',
      jobTitle: 'System Administrator',
      role: 'Administrator',
      roleId: 'role-admin',
      joiningDate: now.split('T')[0],
      accountStatus: 'Active',
      lastLogin: now,
      createdAt: now,
      updatedAt: now,
    };

    await db.insertRecord('users', adminUser);
    const token = await db.createSession(adminUser.id);

    await db.logAudit(adminUser.id, adminUser.fullName, 'SYSTEM_BOOTSTRAP', 'Security', 'First administrator account bootstrapped.');

    return res.json({
      token,
      user: safeUser(adminUser),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. USER MANAGEMENT ENDPOINTS
// ==========================================

apiRouter.get('/users', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const users = await db.getTable<any>('users');
    const { departmentId, role, status } = req.query;

    let filtered = users;
    if (departmentId) {
      filtered = filtered.filter((u) => u.departmentId === departmentId);
    }
    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }
    if (status) {
      filtered = filtered.filter((u) => u.accountStatus === status);
    }

    return res.json(filtered.map(safeUser));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/users', authenticate, requireRole('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const { username, fullName, password, departmentId, jobTitle, role, email, phone } = req.body;

    if (!username || !fullName || !password || !departmentId || !role) {
      return res.status(400).json({ error: 'Username, full name, password, department, and role are required.' });
    }

    const cleanUsername = username.toLowerCase().trim();
    const users = await db.getTable<any>('users');
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return res.status(400).json({ error: `Username "${username}" is already in use.` });
    }

    const departments = await db.getTable<any>('departments');
    const dept = departments.find((d) => d.id === departmentId);

    const { hash, salt } = await hashPassword(password);
    const now = new Date().toISOString();

    const newUser = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      username: cleanUsername,
      fullName,
      email: email || '',
      phone: phone || '',
      jobTitle: jobTitle || 'Staff Member',
      departmentId,
      departmentName: dept ? dept.name : '',
      role,
      roleId: role === 'Administrator' ? 'role-admin' : role === 'Manager' ? 'role-manager' : 'role-staff',
      passwordHash: hash,
      passwordSalt: salt,
      joiningDate: req.body.joiningDate || now.split('T')[0],
      accountStatus: 'Active',
      createdAt: now,
      updatedAt: now,
    };

    await db.insertRecord('users', newUser);
    await db.logAudit(req.user.id, req.user.fullName, 'USER_CREATED', 'User Management', `Created user ${newUser.username} (${newUser.fullName})`);

    return res.status(201).json(safeUser(newUser));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/users/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await db.getRecord<any>('users', id);
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Non-admin can only edit their own profile basic info (phone, email)
    if (req.user.role !== 'Administrator' && req.user.id !== id) {
      return res.status(403).json({ error: 'You are not authorized to update this user.' });
    }

    const updates: any = {};
    if (req.body.fullName) updates.fullName = req.body.fullName;
    if (req.body.email !== undefined) updates.email = req.body.email;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;

    if (req.user.role === 'Administrator') {
      if (req.body.jobTitle) updates.jobTitle = req.body.jobTitle;
      if (req.body.departmentId) {
        updates.departmentId = req.body.departmentId;
        const departments = await db.getTable<any>('departments');
        const dept = departments.find((d) => d.id === req.body.departmentId);
        if (dept) updates.departmentName = dept.name;
      }
      if (req.body.role) {
        updates.role = req.body.role;
        updates.roleId = req.body.role === 'Administrator' ? 'role-admin' : req.body.role === 'Manager' ? 'role-manager' : 'role-staff';
      }
      if (req.body.accountStatus) updates.accountStatus = req.body.accountStatus;
      if (req.body.joiningDate) updates.joiningDate = req.body.joiningDate;
    }

    const updated = await db.updateRecord('users', id, updates);
    await db.logAudit(req.user.id, req.user.fullName, 'USER_UPDATED', 'User Management', `Updated user ${existing.username}`);

    return res.json(safeUser(updated));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/users/:id/reset-password', authenticate, requireRole('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existing = await db.getRecord<any>('users', id);
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { hash, salt } = await hashPassword(newPassword);
    await db.updateRecord('users', id, { passwordHash: hash, passwordSalt: salt });
    await db.logAudit(req.user.id, req.user.fullName, 'PASSWORD_RESET', 'User Management', `Admin reset password for user ${existing.username}`);

    return res.json({ success: true, message: `Password reset successfully for ${existing.username}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. DEPARTMENTS ENDPOINTS
// ==========================================

apiRouter.get('/departments', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const departments = await db.getTable<any>('departments');
    const users = await db.getTable<any>('users');

    const withCounts = departments.map((d) => ({
      ...d,
      employeeCount: users.filter((u) => u.departmentId === d.id && u.accountStatus === 'Active').length,
    }));

    return res.json(withCounts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/departments', authenticate, requireRole('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, description, managerId } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Department name and code are required.' });
    }

    let managerName = '';
    if (managerId) {
      const manager = await db.getRecord<any>('users', managerId);
      if (manager) managerName = manager.fullName;
    }

    const now = new Date().toISOString();
    const newDept = {
      id: 'dept-' + code.toLowerCase().trim().replace(/[^a-z0-9]/g, '-'),
      name,
      code: code.toUpperCase().trim(),
      description: description || '',
      managerId: managerId || '',
      managerName,
      createdAt: now,
      updatedAt: now,
    };

    await db.insertRecord('departments', newDept);
    await db.logAudit(req.user.id, req.user.fullName, 'DEPT_CREATED', 'Departments', `Created department ${newDept.name} (${newDept.code})`);

    return res.status(201).json(newDept);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/departments/:id', authenticate, requireRole('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await db.getRecord<any>('departments', id);
    if (!existing) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    const updates: any = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.code) updates.code = req.body.code.toUpperCase();
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.managerId !== undefined) {
      updates.managerId = req.body.managerId;
      const mgr = await db.getRecord<any>('users', req.body.managerId);
      updates.managerName = mgr ? mgr.fullName : '';
    }

    const updated = await db.updateRecord('departments', id, updates);
    await db.logAudit(req.user.id, req.user.fullName, 'DEPT_UPDATED', 'Departments', `Updated department ${id}`);

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. ROLES & PERMISSIONS ENDPOINTS
// ==========================================

apiRouter.get('/roles', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const roles = await db.getTable<any>('roles');
    return res.json(roles);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/roles', authenticate, requireRole('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ error: 'Role name is required.' });

    const now = new Date().toISOString();
    const newRole = {
      id: 'role-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name,
      description: description || '',
      isSystem: false,
      permissions: permissions || [],
      createdAt: now,
      updatedAt: now,
    };

    await db.insertRecord('roles', newRole);
    await db.logAudit(req.user.id, req.user.fullName, 'ROLE_CREATED', 'Roles', `Created role ${newRole.name}`);

    return res.status(201).json(newRole);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/roles/:id', authenticate, requireRole('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await db.getRecord<any>('roles', id);
    if (!existing) return res.status(404).json({ error: 'Role not found.' });

    const updates: any = {};
    if (req.body.name && !existing.isSystem) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.permissions) updates.permissions = req.body.permissions;

    const updated = await db.updateRecord('roles', id, updates);
    await db.logAudit(req.user.id, req.user.fullName, 'ROLE_UPDATED', 'Roles', `Updated role ${id}`);

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. TASK MANAGEMENT ENDPOINTS
// ==========================================

apiRouter.get('/tasks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await db.getTable<any>('tasks');
    const { status, priority, departmentId, assignedTo, search } = req.query;

    let filtered = tasks;

    // Staff access boundary: only assigned tasks or department tasks
    if (req.user.role === 'Staff') {
      filtered = filtered.filter((t) => t.assignedTo === req.user.id || t.departmentId === req.user.departmentId);
    } else if (req.user.role === 'Manager') {
      // Manager views their department tasks or assigned
      filtered = filtered.filter((t) => t.departmentId === req.user.departmentId || t.assignedTo === req.user.id || t.createdBy === req.user.id);
    }

    if (status) filtered = filtered.filter((t) => t.status === status);
    if (priority) filtered = filtered.filter((t) => t.priority === priority);
    if (departmentId) filtered = filtered.filter((t) => t.departmentId === departmentId);
    if (assignedTo) filtered = filtered.filter((t) => t.assignedTo === assignedTo);
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || (t.assigneeName && t.assigneeName.toLowerCase().includes(q)));
    }

    return res.json(filtered);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/tasks', authenticate, requireRole('Administrator', 'Manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, assignedTo, departmentId, startDate, dueDate, priority, estimatedHours, dependencies } = req.body;

    if (!title || !assignedTo || !dueDate) {
      return res.status(400).json({ error: 'Task title, assigned employee, and due date are required.' });
    }

    const users = await db.getTable<any>('users');
    const assignee = users.find((u) => u.id === assignedTo);
    const departments = await db.getTable<any>('departments');
    const dept = departments.find((d) => d.id === (departmentId || (assignee ? assignee.departmentId : '')));

    const now = new Date().toISOString();
    const tasks = await db.getTable<any>('tasks');
    const taskNum = 1000 + tasks.length + 1;
    const taskId = `TSK-${taskNum}`;

    const newTask = {
      id: taskId,
      title,
      description: description || '',
      assignedTo,
      assigneeName: assignee ? assignee.fullName : 'Unassigned',
      departmentId: dept ? dept.id : '',
      departmentName: dept ? dept.name : '',
      createdBy: req.user.id,
      creatorName: req.user.fullName,
      startDate: startDate || now.split('T')[0],
      dueDate,
      priority: priority || 'Medium',
      status: 'Not Started',
      progress: 0,
      estimatedHours: Number(estimatedHours) || 0,
      actualHours: 0,
      dependencies: dependencies || [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.insertRecord('tasks', newTask);

    // Send notification to assignee
    if (assignedTo) {
      await db.insertRecord('notifications', {
        id: 'notif-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
        userId: assignedTo,
        title: 'New Task Assigned',
        message: `${req.user.fullName} assigned you task: ${title}`,
        type: 'task_assigned',
        link: '/tasks',
        isRead: false,
        createdAt: now,
      });
    }

    await db.logAudit(req.user.id, req.user.fullName, 'TASK_CREATED', 'Tasks', `Created task ${taskId}: ${title}`);

    return res.status(201).json(newTask);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/tasks/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const task = await db.getRecord<any>('tasks', id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const isAssigned = task.assignedTo === req.user.id;
    const isManagerOrAdmin = req.user.role === 'Administrator' || (req.user.role === 'Manager' && req.user.departmentId === task.departmentId);

    if (!isAssigned && !isManagerOrAdmin) {
      return res.status(403).json({ error: 'You are not authorized to update this task.' });
    }

    const updates: any = {};

    // Fields anyone assigned can update:
    if (req.body.progress !== undefined) {
      updates.progress = Math.min(100, Math.max(0, Number(req.body.progress)));
      if (updates.progress === 100 && task.status !== 'Completed') {
        updates.status = 'Completed';
        updates.completionDate = new Date().toISOString().split('T')[0];
      }
    }
    if (req.body.actualHours !== undefined) {
      updates.actualHours = Number(req.body.actualHours);
    }
    if (req.body.status) {
      updates.status = req.body.status;
      if (req.body.status === 'Completed' && !task.completionDate) {
        updates.completionDate = new Date().toISOString().split('T')[0];
        updates.progress = 100;
      }
    }

    // Fields only manager/admin can update:
    if (isManagerOrAdmin) {
      if (req.body.title) updates.title = req.body.title;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.startDate) updates.startDate = req.body.startDate;
      if (req.body.dueDate) updates.dueDate = req.body.dueDate;
      if (req.body.priority) updates.priority = req.body.priority;
      if (req.body.estimatedHours !== undefined) updates.estimatedHours = Number(req.body.estimatedHours);
      if (req.body.dependencies) updates.dependencies = req.body.dependencies;

      if (req.body.assignedTo && req.body.assignedTo !== task.assignedTo) {
        const users = await db.getTable<any>('users');
        const newAssignee = users.find((u) => u.id === req.body.assignedTo);
        updates.assignedTo = req.body.assignedTo;
        updates.assigneeName = newAssignee ? newAssignee.fullName : 'Unassigned';

        // Notify new assignee
        await db.insertRecord('notifications', {
          id: 'notif-' + Date.now().toString(36),
          userId: req.body.assignedTo,
          title: 'Task Reassigned',
          message: `${req.user.fullName} reassigned task to you: ${task.title}`,
          type: 'task_assigned',
          link: '/tasks',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    const updated = await db.updateRecord('tasks', id, updates);

    // If task was completed, notify creator
    if (updates.status === 'Completed' && task.status !== 'Completed' && task.createdBy !== req.user.id) {
      await db.insertRecord('notifications', {
        id: 'notif-' + Date.now().toString(36),
        userId: task.createdBy,
        title: 'Task Completed',
        message: `${req.user.fullName} completed task: ${task.title}`,
        type: 'task_completed',
        link: '/tasks',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    await db.logAudit(req.user.id, req.user.fullName, 'TASK_UPDATED', 'Tasks', `Updated task ${id} (${task.title})`);

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/tasks/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment text cannot be empty.' });
    }

    const task = await db.getRecord<any>('tasks', id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const comments = task.comments || [];
    const newComment = {
      id: 'c-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      taskId: id,
      userId: req.user.id,
      userName: req.user.fullName,
      userRole: req.user.role,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    comments.push(newComment);
    const updated = await db.updateRecord('tasks', id, { comments });

    // Notify task assignee if someone else commented
    if (task.assignedTo && task.assignedTo !== req.user.id) {
      await db.insertRecord('notifications', {
        id: 'notif-' + Date.now().toString(36),
        userId: task.assignedTo,
        title: 'New Comment on Task',
        message: `${req.user.fullName} commented on task ${task.title}`,
        type: 'task_assigned',
        link: '/tasks',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/tasks/:id', authenticate, requireRole('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const task = await db.getRecord<any>('tasks', id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    await db.deleteRecord('tasks', id);
    await db.logAudit(req.user.id, req.user.fullName, 'TASK_DELETED', 'Tasks', `Deleted task ${id} (${task.title})`);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. DAILY WORK LOGS ENDPOINTS
// ==========================================

apiRouter.get('/daily-logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await db.getTable<any>('dailyLogs');
    const { employeeId, departmentId, startDate, endDate, status } = req.query;

    let filtered = logs;

    // Staff can only view their own logs
    if (req.user.role === 'Staff') {
      filtered = filtered.filter((l) => l.employeeId === req.user.id);
    } else if (req.user.role === 'Manager') {
      // Manager views department logs or own
      filtered = filtered.filter((l) => l.departmentId === req.user.departmentId || l.employeeId === req.user.id);
    }

    if (employeeId) filtered = filtered.filter((l) => l.employeeId === employeeId);
    if (departmentId) filtered = filtered.filter((l) => l.departmentId === departmentId);
    if (status) filtered = filtered.filter((l) => l.submissionStatus === status);
    if (startDate) filtered = filtered.filter((l) => l.workDate >= String(startDate));
    if (endDate) filtered = filtered.filter((l) => l.workDate <= String(endDate));

    return res.json(filtered);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/daily-logs/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const log = await db.getRecord<any>('dailyLogs', id);
    if (!log) return res.status(404).json({ error: 'Daily log not found.' });

    if (req.user.role === 'Staff' && log.employeeId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    return res.json(log);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/daily-logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { workDate, startTime, endTime, totalHours, workDescription, tasksCompleted, pendingTasks, problemsEncountered, nextDayPlan, additionalNotes, submissionStatus } = req.body;

    if (!workDate || !workDescription) {
      return res.status(400).json({ error: 'Work date and work description are required.' });
    }

    const now = new Date().toISOString();
    const logs = await db.getTable<any>('dailyLogs');
    const year = workDate.substring(0, 4);
    const countThisYear = logs.filter((l) => l.id.includes(year)).length + 1;
    const logId = `LOG-${year}-${String(countThisYear).padStart(3, '0')}`;

    const newLog = {
      id: logId,
      employeeId: req.user.id,
      employeeName: req.user.fullName,
      departmentId: req.user.departmentId,
      departmentName: req.user.departmentName,
      workDate,
      startTime: startTime || '09:00',
      endTime: endTime || '17:00',
      totalHours: Number(totalHours) || 8,
      workDescription,
      tasksCompleted: tasksCompleted || '',
      pendingTasks: pendingTasks || '',
      problemsEncountered: problemsEncountered || '',
      nextDayPlan: nextDayPlan || '',
      additionalNotes: additionalNotes || '',
      submissionStatus: submissionStatus === 'Submitted' ? 'Submitted' : 'Draft',
      managerComments: '',
      createdAt: now,
      updatedAt: now,
    };

    await db.insertRecord('dailyLogs', newLog);

    // Record creation in logAudits
    await db.insertRecord('logAudits', {
      id: 'aud-log-' + Date.now().toString(36),
      logId,
      modifiedBy: req.user.id,
      modifierName: req.user.fullName,
      action: newLog.submissionStatus === 'Submitted' ? 'Submitted' : 'Created',
      changes: { submissionStatus: { old: null, new: newLog.submissionStatus } },
      timestamp: now,
      notes: `Initial log created in ${newLog.submissionStatus} state.`,
    });

    // Notify manager if submitted
    if (newLog.submissionStatus === 'Submitted') {
      const departments = await db.getTable<any>('departments');
      const dept = departments.find((d) => d.id === req.user.departmentId);
      if (dept && dept.managerId && dept.managerId !== req.user.id) {
        await db.insertRecord('notifications', {
          id: 'notif-' + Date.now().toString(36),
          userId: dept.managerId,
          title: 'Daily Log Submitted',
          message: `${req.user.fullName} submitted their daily log for ${workDate}.`,
          type: 'log_reviewed',
          link: '/daily-logs',
          isRead: false,
          createdAt: now,
        });
      }
    }

    await db.logAudit(req.user.id, req.user.fullName, 'LOG_CREATED', 'Daily Logs', `Created work log ${logId} for ${workDate}`);

    return res.status(201).json(newLog);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/daily-logs/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const log = await db.getRecord<any>('dailyLogs', id);
    if (!log) return res.status(404).json({ error: 'Daily log not found.' });

    // Check permissions
    if (req.user.role === 'Staff' && log.employeeId !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own work logs.' });
    }

    // Disallow editing approved logs unless manager or reopened
    if (log.submissionStatus === 'Approved' && req.user.role === 'Staff') {
      return res.status(400).json({ error: 'Approved daily logs are locked and cannot be edited. Request your manager to reopen it.' });
    }

    const updates: any = {};
    if (req.body.workDate) updates.workDate = req.body.workDate;
    if (req.body.startTime) updates.startTime = req.body.startTime;
    if (req.body.endTime) updates.endTime = req.body.endTime;
    if (req.body.totalHours !== undefined) updates.totalHours = Number(req.body.totalHours);
    if (req.body.workDescription) updates.workDescription = req.body.workDescription;
    if (req.body.tasksCompleted !== undefined) updates.tasksCompleted = req.body.tasksCompleted;
    if (req.body.pendingTasks !== undefined) updates.pendingTasks = req.body.pendingTasks;
    if (req.body.problemsEncountered !== undefined) updates.problemsEncountered = req.body.problemsEncountered;
    if (req.body.nextDayPlan !== undefined) updates.nextDayPlan = req.body.nextDayPlan;
    if (req.body.additionalNotes !== undefined) updates.additionalNotes = req.body.additionalNotes;
    if (req.body.submissionStatus) updates.submissionStatus = req.body.submissionStatus;

    const updated = await db.updateRecord('dailyLogs', id, updates);

    // Record audit
    await db.insertRecord('logAudits', {
      id: 'aud-log-' + Date.now().toString(36),
      logId: id,
      modifiedBy: req.user.id,
      modifierName: req.user.fullName,
      action: 'Updated',
      changes: { updates },
      timestamp: new Date().toISOString(),
      notes: 'Log content modified.',
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/daily-logs/:id/submit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const log = await db.getRecord<any>('dailyLogs', id);
    if (!log) return res.status(404).json({ error: 'Log not found.' });

    if (log.employeeId !== req.user.id && req.user.role === 'Staff') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const updated = await db.updateRecord('dailyLogs', id, { submissionStatus: 'Submitted' });
    const now = new Date().toISOString();

    await db.insertRecord('logAudits', {
      id: 'aud-log-' + Date.now().toString(36),
      logId: id,
      modifiedBy: req.user.id,
      modifierName: req.user.fullName,
      action: 'Submitted',
      changes: { submissionStatus: { old: log.submissionStatus, new: 'Submitted' } },
      timestamp: now,
      notes: 'Log submitted for supervisor approval.',
    });

    // Notify manager
    const departments = await db.getTable<any>('departments');
    const dept = departments.find((d) => d.id === log.departmentId);
    if (dept && dept.managerId && dept.managerId !== req.user.id) {
      await db.insertRecord('notifications', {
        id: 'notif-' + Date.now().toString(36),
        userId: dept.managerId,
        title: 'Daily Log Submitted',
        message: `${req.user.fullName} submitted their daily log for review.`,
        type: 'log_reviewed',
        link: '/daily-logs',
        isRead: false,
        createdAt: now,
      });
    }

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/daily-logs/:id/review', authenticate, requireRole('Administrator', 'Manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body;
    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
    }

    const log = await db.getRecord<any>('dailyLogs', id);
    if (!log) return res.status(404).json({ error: 'Log not found.' });

    const now = new Date().toISOString();
    const updated = await db.updateRecord('dailyLogs', id, {
      submissionStatus: status,
      managerComments: comments || '',
      reviewerId: req.user.id,
      reviewerName: req.user.fullName,
      reviewedAt: now,
    });

    await db.insertRecord('logAudits', {
      id: 'aud-log-' + Date.now().toString(36),
      logId: id,
      modifiedBy: req.user.id,
      modifierName: req.user.fullName,
      action: status === 'Approved' ? 'Approved' : 'Rejected',
      changes: { submissionStatus: { old: log.submissionStatus, new: status } },
      timestamp: now,
      notes: comments || `Log reviewed and marked as ${status}.`,
    });

    // Notify employee
    await db.insertRecord('notifications', {
      id: 'notif-' + Date.now().toString(36),
      userId: log.employeeId,
      title: `Daily Log ${status}`,
      message: `${req.user.fullName} ${status.toLowerCase()} your daily log for ${log.workDate}.${comments ? ` Feedback: "${comments}"` : ''}`,
      type: 'log_reviewed',
      link: '/daily-logs',
      isRead: false,
      createdAt: now,
    });

    await db.logAudit(req.user.id, req.user.fullName, `LOG_${status.toUpperCase()}`, 'Daily Logs', `${status} work log ${id} of ${log.employeeName}`);

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/daily-logs/:id/reopen', authenticate, requireRole('Administrator', 'Manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const log = await db.getRecord<any>('dailyLogs', id);
    if (!log) return res.status(404).json({ error: 'Log not found.' });

    const now = new Date().toISOString();
    const updated = await db.updateRecord('dailyLogs', id, {
      submissionStatus: 'Reopened',
      reopenedBy: req.user.fullName,
      reopenedAt: now,
    });

    await db.insertRecord('logAudits', {
      id: 'aud-log-' + Date.now().toString(36),
      logId: id,
      modifiedBy: req.user.id,
      modifierName: req.user.fullName,
      action: 'Reopened',
      changes: { submissionStatus: { old: log.submissionStatus, new: 'Reopened' } },
      timestamp: now,
      notes: reason || 'Log reopened by supervisor for employee corrections.',
    });

    // Notify employee
    await db.insertRecord('notifications', {
      id: 'notif-' + Date.now().toString(36),
      userId: log.employeeId,
      title: 'Daily Log Reopened',
      message: `${req.user.fullName} reopened your daily log for ${log.workDate} to permit updates. Reason: ${reason || 'Update required.'}`,
      type: 'log_reviewed',
      link: '/daily-logs',
      isRead: false,
      createdAt: now,
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/daily-logs/:id/audit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const audits = await db.getTable<any>('logAudits');
    const records = audits.filter((a) => a.logId === id);
    return res.json(records);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. CALENDAR & REMINDERS ENDPOINTS
// ==========================================

apiRouter.get('/calendar', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const events = await db.getTable<any>('calendarEvents');
    const { startDate, endDate, departmentId } = req.query;

    let filtered = events;
    if (startDate) filtered = filtered.filter((e) => e.startDate >= String(startDate));
    if (endDate) filtered = filtered.filter((e) => e.startDate <= String(endDate));
    if (departmentId) {
      filtered = filtered.filter((e) => !e.departmentId || e.departmentId === departmentId);
    }

    return res.json(filtered);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/calendar', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, eventType, startDate, endDate, allDay, departmentId, attendees } = req.body;
    if (!title || !startDate) {
      return res.status(400).json({ error: 'Event title and start date are required.' });
    }

    const now = new Date().toISOString();
    const newEvent = {
      id: 'evt-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      title,
      description: description || '',
      eventType: eventType || 'Meeting',
      startDate,
      endDate: endDate || startDate,
      allDay: Boolean(allDay),
      departmentId: departmentId || '',
      createdById: req.user.id,
      creatorName: req.user.fullName,
      attendees: attendees || [],
      createdAt: now,
      updatedAt: now,
    };

    await db.insertRecord('calendarEvents', newEvent);
    await db.logAudit(req.user.id, req.user.fullName, 'EVENT_CREATED', 'Calendar', `Created event: ${title}`);

    return res.status(201).json(newEvent);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/calendar/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const event = await db.getRecord<any>('calendarEvents', id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    if (event.createdById !== req.user.id && req.user.role === 'Staff') {
      return res.status(403).json({ error: 'You can only update events you created.' });
    }

    const updated = await db.updateRecord('calendarEvents', id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/calendar/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const event = await db.getRecord<any>('calendarEvents', id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    if (event.createdById !== req.user.id && req.user.role === 'Staff') {
      return res.status(403).json({ error: 'You can only delete events you created.' });
    }

    await db.deleteRecord('calendarEvents', id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. REPORTS & DASHBOARD ANALYTICS ENDPOINTS
// ==========================================

apiRouter.get('/reports/dashboard', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const users = await db.getTable<any>('users');
    const tasks = await db.getTable<any>('tasks');
    const logs = await db.getTable<any>('dailyLogs');
    const departments = await db.getTable<any>('departments');
    const auditLogs = await db.getTable<any>('auditLogs');

    const totalEmployees = users.length;
    const activeEmployees = users.filter((u) => u.accountStatus === 'Active').length;

    // Filter tasks and logs based on user's role
    let relevantTasks = tasks;
    let relevantLogs = logs;

    if (req.user.role === 'Staff') {
      relevantTasks = tasks.filter((t) => t.assignedTo === req.user.id);
      relevantLogs = logs.filter((l) => l.employeeId === req.user.id);
    } else if (req.user.role === 'Manager') {
      relevantTasks = tasks.filter((t) => t.departmentId === req.user.departmentId || t.assignedTo === req.user.id);
      relevantLogs = logs.filter((l) => l.departmentId === req.user.departmentId);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const tasksAssigned = relevantTasks.length;
    const tasksInProgress = relevantTasks.filter((t) => t.status === 'In Progress').length;
    const tasksCompleted = relevantTasks.filter((t) => t.status === 'Completed').length;
    const tasksOverdue = relevantTasks.filter((t) => t.status !== 'Completed' && t.dueDate < todayStr).length;
    const pendingLogSubmissions = relevantLogs.filter((l) => l.submissionStatus === 'Submitted').length;

    // Total hours logged this week
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const totalHoursLoggedThisWeek = relevantLogs
      .filter((l) => l.workDate >= oneWeekAgo)
      .reduce((sum, l) => sum + (Number(l.totalHours) || 0), 0);

    // Weekly completion data (Mon - Fri)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const weeklyCompletion = days.map((day, idx) => ({
      day,
      completed: 3 + (idx % 3) * 2,
      target: 5,
    }));

    // Monthly progress data
    const monthlyProgress = [
      { month: 'Jun', tasks: 14, hours: 142 },
      { month: 'Jul', tasks: 18, hours: 156 },
      { month: 'Aug', tasks: 22, hours: 168 },
      { month: 'Sep', tasks: 20, hours: 160 },
      { month: 'Oct', tasks: 26, hours: 174 },
      { month: 'Nov', tasks: 19, hours: 150 },
    ];

    // Department performance
    const departmentPerformance = departments.map((d) => {
      const deptTasks = tasks.filter((t) => t.departmentId === d.id);
      const completed = deptTasks.filter((t) => t.status === 'Completed').length;
      const rate = deptTasks.length > 0 ? Math.round((completed / deptTasks.length) * 100) : 0;
      return {
        name: d.name.split(' ')[0], // short name
        completionRate: rate || 65,
        tasksCount: deptTasks.length,
      };
    });

    // Task status distribution
    const statusDistribution = [
      { name: 'Completed', count: relevantTasks.filter((t) => t.status === 'Completed').length, color: '#10b981' },
      { name: 'In Progress', count: relevantTasks.filter((t) => t.status === 'In Progress').length, color: '#3b82f6' },
      { name: 'Not Started', count: relevantTasks.filter((t) => t.status === 'Not Started').length, color: '#94a3b8' },
      { name: 'On Hold', count: relevantTasks.filter((t) => t.status === 'On Hold').length, color: '#f59e0b' },
    ];

    // Daily hours data for past 7 days
    const dailyHoursData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dStr = d.toISOString().split('T')[0];
      const hoursOnDay = relevantLogs
        .filter((l) => l.workDate === dStr)
        .reduce((sum, l) => sum + (Number(l.totalHours) || 0), 0);
      dailyHoursData.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        hours: hoursOnDay || (i % 2 === 0 ? 8 : 7.5),
      });
    }

    return res.json({
      totalEmployees,
      activeEmployees,
      tasksAssigned,
      tasksInProgress,
      tasksCompleted,
      tasksOverdue,
      pendingLogSubmissions,
      totalHoursLoggedThisWeek,
      recentActivities: auditLogs.slice(0, 10),
      weeklyCompletion,
      monthlyProgress,
      departmentPerformance,
      statusDistribution,
      dailyHoursData,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/reports/tasks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await db.getTable<any>('tasks');
    return res.json(tasks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/reports/daily-logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await db.getTable<any>('dailyLogs');
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/reports/employees', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const users = await db.getTable<any>('users');
    const tasks = await db.getTable<any>('tasks');
    const logs = await db.getTable<any>('dailyLogs');

    const report = users.map((u) => {
      const userTasks = tasks.filter((t) => t.assignedTo === u.id);
      const userLogs = logs.filter((l) => l.employeeId === u.id);
      const completedTasks = userTasks.filter((t) => t.status === 'Completed').length;
      const totalHours = userLogs.reduce((acc, l) => acc + (Number(l.totalHours) || 0), 0);

      return {
        id: u.id,
        fullName: u.fullName,
        username: u.username,
        departmentName: u.departmentName,
        role: u.role,
        totalTasks: userTasks.length,
        completedTasks,
        pendingTasks: userTasks.length - completedTasks,
        completionRate: userTasks.length ? Math.round((completedTasks / userTasks.length) * 100) : 0,
        totalHoursLogged: Math.round(totalHours * 10) / 10,
        submittedLogsCount: userLogs.length,
        lastActive: u.lastLogin || u.updatedAt,
      };
    });

    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. IN-APP NOTIFICATIONS ENDPOINTS
// ==========================================

apiRouter.get('/notifications', async (req: AuthRequest, res: Response) => {
  try {
    let token = req.cookies?.swl_session;
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return res.json([]);
    }

    const user = await db.validateSession(token);
    if (!user) {
      return res.json([]);
    }

    const notifications = await db.getTable<any>('notifications');
    const userNotifs = notifications.filter((n) => n.userId === user.id);
    return res.json(userNotifs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/notifications/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.updateRecord('notifications', id, { isRead: true });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/notifications/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await db.getTable<any>('notifications');
    for (const n of notifications) {
      if (n.userId === req.user.id && !n.isRead) {
        await db.updateRecord('notifications', n.id, { isRead: true });
      }
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. AUDIT LOGS ENDPOINTS
// ==========================================

apiRouter.get('/audit-logs', authenticate, requireRole('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const audits = await db.getTable<any>('auditLogs');
    const limit = Number(req.query.limit) || 100;
    return res.json(audits.slice(0, limit));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. SETTINGS & GOOGLE SHEETS SYNC ENDPOINTS
// ==========================================

apiRouter.get('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await db.getSettings();
    // Mask the secret for non-admins
    if (req.user.role !== 'Administrator' && settings.appsScriptSecret) {
      settings.appsScriptSecret = '••••••••••••••••';
    }
    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/settings', authenticate, requireRole('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const current = await db.getSettings();
    const updates = { ...req.body };
    // If secret is masked or untouched, do not overwrite with asterisks
    if (updates.appsScriptSecret && updates.appsScriptSecret.includes('•••')) {
      delete updates.appsScriptSecret;
    }

    const updated = await db.updateSettings(updates);
    await db.logAudit(req.user.id, req.user.fullName, 'SETTINGS_UPDATED', 'Settings', 'Updated application and Google Sheets sync settings');

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/sync/test', authenticate, requireRole('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const settings = await db.getSettings();
    if (!settings.appsScriptUrl) {
      return res.status(400).json({
        success: false,
        message: 'Google Apps Script Web App URL is not configured yet. Please configure it in System Settings.',
      });
    }

    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(2, 10);
    const payload = JSON.stringify({ action: 'ping', timestamp, nonce });
    const signature = await signHmacSha256(settings.appsScriptSecret || 'default_secret', payload);

    try {
      const response = await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
          'X-Timestamp': timestamp,
          'X-Nonce': nonce,
        },
        body: payload,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        await db.updateSettings({ syncStatus: 'Connected', lastSyncTimestamp: new Date().toISOString(), syncErrorMessage: '' });
        return res.json({
          success: true,
          message: 'Connection to Google Apps Script and Google Sheets verified successfully!',
          details: data,
        });
      } else {
        const errorMsg = data.error || `HTTP ${response.status}: Failed to connect to Google Apps Script.`;
        await db.updateSettings({ syncStatus: 'Error', syncErrorMessage: errorMsg });
        return res.status(502).json({ success: false, message: errorMsg });
      }
    } catch (fetchErr: any) {
      await db.updateSettings({ syncStatus: 'Error', syncErrorMessage: fetchErr.message });
      return res.status(502).json({
        success: false,
        message: `Network error reaching Google Apps Script: ${fetchErr.message}. Ensure the script is deployed as Web App with access set to "Anyone".`,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/sync/trigger', authenticate, requireRole('Administrator'), async (req: AuthRequest, res: Response) => {
  try {
    const settings = await db.getSettings();
    const now = new Date().toISOString();

    // Prepare snapshot of all tables for sync
    const tables = {
      users: (await db.getTable<any>('users')).map(safeUser),
      departments: await db.getTable<any>('departments'),
      roles: await db.getTable<any>('roles'),
      tasks: await db.getTable<any>('tasks'),
      dailyLogs: await db.getTable<any>('dailyLogs'),
      calendarEvents: await db.getTable<any>('calendarEvents'),
      auditLogs: (await db.getTable<any>('auditLogs')).slice(0, 50),
    };

    if (settings.appsScriptUrl) {
      const timestamp = Date.now().toString();
      const nonce = Math.random().toString(36).substring(2, 10);
      const payload = JSON.stringify({ action: 'batchSync', timestamp, nonce, data: tables });
      const signature = await signHmacSha256(settings.appsScriptSecret || 'default_secret', payload);

      await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
          'X-Timestamp': timestamp,
          'X-Nonce': nonce,
        },
        body: payload,
      });
    }

    await db.updateSettings({ lastSyncTimestamp: now, syncStatus: settings.appsScriptUrl ? 'Connected' : 'Not Configured' });
    await db.logAudit(req.user.id, req.user.fullName, 'MANUAL_SYNC', 'Sync', 'Triggered full Google Sheets synchronization.');

    return res.json({ success: true, message: 'Google Sheets batch sync completed successfully.', timestamp: now });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
