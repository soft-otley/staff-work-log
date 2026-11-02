/**
 * Core Database & Cryptographic Engine
 * Compatible with Node.js 18+ and Cloudflare Workers runtime (Web Crypto API).
 */

import fs from 'fs';
import path from 'path';

// --- Web Crypto PBKDF2 Password Hashing ---
export async function hashPassword(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const saltBytes = existingSalt
    ? Uint8Array.from(Buffer.from(existingSalt, 'hex'))
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const rawKey = await crypto.subtle.exportKey('raw', key);
  const hashHex = Buffer.from(rawKey).toString('hex');
  const saltHex = Buffer.from(saltBytes).toString('hex');

  return { hash: hashHex, salt: saltHex };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  // Constant-time comparison
  if (computed.hash.length !== hash.length) return false;
  let result = 0;
  for (let i = 0; i < hash.length; i++) {
    result |= computed.hash.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return result === 0;
}

// --- HMAC-SHA256 Request Signing for Google Apps Script Private API ---
export async function signHmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Buffer.from(signature).toString('hex');
}

export async function verifyHmacSha256(secret: string, message: string, signatureHex: string): Promise<boolean> {
  const expectedSig = await signHmacSha256(secret, message);
  if (expectedSig.length !== signatureHex.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    diff |= expectedSig.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  }
  return diff === 0;
}

// --- Database Schema Interface ---
export interface DatabaseSchema {
  users: any[];
  roles: any[];
  permissions: any[];
  rolePermissions: any[];
  departments: any[];
  tasks: any[];
  dailyLogs: any[];
  logReviews: any[];
  logAudits: any[];
  calendarEvents: any[];
  notifications: any[];
  auditLogs: any[];
  settings: any;
  sessions: Record<string, { userId: string; expiresAt: number }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

class DatabaseEngine {
  private db: DatabaseSchema | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        this.db = JSON.parse(content);
      } catch (err) {
        console.error('Error reading database file, rebuilding seed:', err);
        await this.seedInitialDatabase();
      }
    } else {
      await this.seedInitialDatabase();
    }

    this.initialized = true;
  }

  private async save(): Promise<void> {
    if (!this.db) return;
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.db, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Error writing database to disk:', err);
    }
  }

  private async seedInitialDatabase(): Promise<void> {
    const adminPass = await hashPassword('Admin@2026!Secure');
    const mgrPass = await hashPassword('Manager@2026!');
    const staffPass = await hashPassword('Staff@2026!');

    const now = new Date().toISOString();
    const today = now.split('T')[0];

    this.db = {
      settings: {
        companyName: 'Apex Enterprise Solutions',
        standardWorkHoursPerDay: 8,
        appsScriptUrl: '',
        appsScriptSecret: 'sec_7f9c381a8b3e4d819e62319f07d2',
        lastSyncTimestamp: undefined,
        syncStatus: 'Not Configured',
        allowSelfRegistration: false,
        requireLogApproval: true,
      },
      departments: [
        {
          id: 'dept-eng',
          name: 'Engineering & Technology',
          code: 'ENG',
          description: 'Core software development, architecture, DevOps, and cloud systems',
          managerId: 'usr-david',
          managerName: 'David Chen',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'dept-ops',
          name: 'Operations & Logistics',
          code: 'OPS',
          description: 'Business process, workflow delivery, and organizational support',
          managerId: 'usr-sarah',
          managerName: 'Sarah Jenkins',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'dept-qa',
          name: 'Quality Assurance',
          code: 'QA',
          description: 'Software testing, validation, test automation, and compliance',
          managerId: 'usr-david',
          managerName: 'David Chen',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'dept-mkt',
          name: 'Marketing & Growth',
          code: 'MKT',
          description: 'Brand presence, client acquisition, and communications',
          managerId: 'usr-sarah',
          managerName: 'Sarah Jenkins',
          createdAt: now,
          updatedAt: now,
        },
      ],
      roles: [
        {
          id: 'role-admin',
          name: 'Administrator',
          description: 'Full system administrative access, user management, and security audit control',
          isSystem: true,
          permissions: ['all'],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'role-manager',
          name: 'Manager',
          description: 'Departmental oversight, task assignment, and work log review authority',
          isSystem: true,
          permissions: ['tasks.create', 'tasks.assign', 'tasks.view.dept', 'logs.review', 'reports.view.dept', 'calendar.manage'],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'role-staff',
          name: 'Staff',
          description: 'Individual contributor access for assigned tasks, daily work logs, and personal calendar',
          isSystem: true,
          permissions: ['tasks.view.assigned', 'tasks.update.progress', 'logs.create', 'logs.submit', 'calendar.view'],
          createdAt: now,
          updatedAt: now,
        },
      ],
      permissions: [
        { id: 'users.manage', name: 'Manage Users', category: 'users', description: 'Create, edit, reset passwords and deactivate users' },
        { id: 'roles.manage', name: 'Manage Roles', category: 'settings', description: 'Configure custom roles and permissions' },
        { id: 'departments.manage', name: 'Manage Departments', category: 'departments', description: 'Create and configure company departments' },
        { id: 'tasks.create', name: 'Create Tasks', category: 'tasks', description: 'Create and define task details' },
        { id: 'tasks.assign', name: 'Assign Tasks', category: 'tasks', description: 'Assign tasks to team members' },
        { id: 'tasks.view.all', name: 'View All Tasks', category: 'tasks', description: 'View tasks across all departments' },
        { id: 'logs.review', name: 'Review Daily Logs', category: 'logs', description: 'Approve, reject, or comment on submitted logs' },
        { id: 'reports.view.all', name: 'View All Reports', category: 'reports', description: 'Generate organizational-wide reports' },
      ],
      rolePermissions: [],
      users: [
        {
          id: 'usr-admin',
          username: 'admin',
          passwordHash: adminPass.hash,
          passwordSalt: adminPass.salt,
          fullName: 'Alexander Wright',
          departmentId: 'dept-ops',
          departmentName: 'Operations & Logistics',
          jobTitle: 'Chief Operations Officer & SysAdmin',
          role: 'Administrator',
          roleId: 'role-admin',
          email: 'alexander.wright@company.internal',
          phone: '+1 (555) 019-2831',
          joiningDate: '2023-01-15',
          accountStatus: 'Active',
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'usr-david',
          username: 'david.eng',
          passwordHash: mgrPass.hash,
          passwordSalt: mgrPass.salt,
          fullName: 'David Chen',
          departmentId: 'dept-eng',
          departmentName: 'Engineering & Technology',
          jobTitle: 'Head of Engineering',
          role: 'Manager',
          roleId: 'role-manager',
          email: 'david.chen@company.internal',
          phone: '+1 (555) 019-2832',
          joiningDate: '2023-03-01',
          accountStatus: 'Active',
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'usr-sarah',
          username: 'sarah.ops',
          passwordHash: mgrPass.hash,
          passwordSalt: mgrPass.salt,
          fullName: 'Sarah Jenkins',
          departmentId: 'dept-ops',
          departmentName: 'Operations & Logistics',
          jobTitle: 'Operations Manager',
          role: 'Manager',
          roleId: 'role-manager',
          email: 'sarah.jenkins@company.internal',
          phone: '+1 (555) 019-2833',
          joiningDate: '2023-04-10',
          accountStatus: 'Active',
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'usr-elena',
          username: 'elena.dev',
          passwordHash: staffPass.hash,
          passwordSalt: staffPass.salt,
          fullName: 'Elena Rostova',
          departmentId: 'dept-eng',
          departmentName: 'Engineering & Technology',
          jobTitle: 'Senior Full Stack Engineer',
          role: 'Staff',
          roleId: 'role-staff',
          email: 'elena.rostova@company.internal',
          phone: '+1 (555) 019-2834',
          joiningDate: '2023-07-20',
          accountStatus: 'Active',
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'usr-marcus',
          username: 'marcus.qa',
          passwordHash: staffPass.hash,
          passwordSalt: staffPass.salt,
          fullName: 'Marcus Vance',
          departmentId: 'dept-qa',
          departmentName: 'Quality Assurance',
          jobTitle: 'Lead QA Automation Engineer',
          role: 'Staff',
          roleId: 'role-staff',
          email: 'marcus.vance@company.internal',
          phone: '+1 (555) 019-2835',
          joiningDate: '2023-09-12',
          accountStatus: 'Active',
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'usr-chloe',
          username: 'chloe.mkt',
          passwordHash: staffPass.hash,
          passwordSalt: staffPass.salt,
          fullName: 'Chloe Bennett',
          departmentId: 'dept-mkt',
          departmentName: 'Marketing & Growth',
          jobTitle: 'Digital Content Specialist',
          role: 'Staff',
          roleId: 'role-staff',
          email: 'chloe.bennett@company.internal',
          phone: '+1 (555) 019-2836',
          joiningDate: '2024-02-01',
          accountStatus: 'Active',
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
        },
      ],
      tasks: [
        {
          id: 'TSK-1001',
          title: 'Implement Multi-User Google Sheets Sync Gateway',
          description: 'Design and deploy HMAC-SHA256 authenticated Google Apps Script bridge with LockService concurrency controls.',
          assignedTo: 'usr-elena',
          assigneeName: 'Elena Rostova',
          departmentId: 'dept-eng',
          departmentName: 'Engineering & Technology',
          createdBy: 'usr-david',
          creatorName: 'David Chen',
          startDate: today,
          dueDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
          priority: 'Urgent',
          status: 'In Progress',
          progress: 75,
          estimatedHours: 24,
          actualHours: 18,
          comments: [
            {
              id: 'c-1',
              taskId: 'TSK-1001',
              userId: 'usr-david',
              userName: 'David Chen',
              userRole: 'Manager',
              comment: 'Please verify constant-time signature comparison to protect against timing attacks.',
              createdAt: now,
            },
          ],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'TSK-1002',
          title: 'Automated Regression Suite for Daily Log Approvals',
          description: 'Configure end-to-end Cypress test cases validating status transitions: Draft -> Submitted -> Approved/Rejected.',
          assignedTo: 'usr-marcus',
          assigneeName: 'Marcus Vance',
          departmentId: 'dept-qa',
          departmentName: 'Quality Assurance',
          createdBy: 'usr-david',
          creatorName: 'David Chen',
          startDate: today,
          dueDate: new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0],
          priority: 'High',
          status: 'In Progress',
          progress: 40,
          estimatedHours: 16,
          actualHours: 6,
          comments: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'TSK-1003',
          title: 'Staff Onboarding Protocol Documentation Update',
          description: 'Update the company standard operating procedures (SOP) for new employee account provisioning and role assignments.',
          assignedTo: 'usr-sarah',
          assigneeName: 'Sarah Jenkins',
          departmentId: 'dept-ops',
          departmentName: 'Operations & Logistics',
          createdBy: 'usr-admin',
          creatorName: 'Alexander Wright',
          startDate: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          priority: 'Medium',
          status: 'In Progress',
          progress: 60,
          estimatedHours: 12,
          actualHours: 8,
          comments: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'TSK-1004',
          title: 'Quarterly Staff Performance Analytics Report Deck',
          description: 'Compile monthly work hours, task throughput, and department delivery metrics for executive leadership review.',
          assignedTo: 'usr-chloe',
          assigneeName: 'Chloe Bennett',
          departmentId: 'dept-mkt',
          departmentName: 'Marketing & Growth',
          createdBy: 'usr-sarah',
          creatorName: 'Sarah Jenkins',
          startDate: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
          dueDate: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0], // Overdue!
          priority: 'High',
          status: 'In Progress',
          progress: 85,
          estimatedHours: 20,
          actualHours: 19,
          comments: [],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'TSK-1005',
          title: 'Deploy Cloudflare Pages Functions Production Build',
          description: 'Setup continuous deployment from GitHub repo to Cloudflare Pages edge runtime with environment secrets.',
          assignedTo: 'usr-elena',
          assigneeName: 'Elena Rostova',
          departmentId: 'dept-eng',
          departmentName: 'Engineering & Technology',
          createdBy: 'usr-admin',
          creatorName: 'Alexander Wright',
          startDate: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0],
          dueDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
          completionDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
          priority: 'Urgent',
          status: 'Completed',
          progress: 100,
          estimatedHours: 14,
          actualHours: 12,
          comments: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
      dailyLogs: [
        {
          id: 'LOG-2026-001',
          employeeId: 'usr-elena',
          employeeName: 'Elena Rostova',
          departmentId: 'dept-eng',
          departmentName: 'Engineering & Technology',
          workDate: today,
          startTime: '08:30',
          endTime: '17:00',
          totalHours: 8.5,
          workDescription: 'Architected the Web Crypto PBKDF2 authentication pipeline and verified constant-time signature checks. Implemented Google Sheets schema synchronization batch writers.',
          tasksCompleted: 'TSK-1005 Cloudflare Pages CI/CD configuration; unit tests for password hashing.',
          pendingTasks: 'Complete integration tests for Google Apps Script LockService concurrent calls.',
          problemsEncountered: 'Apps Script has a 6-minute execution limit; batching records into chunks of 100 prevents timeout.',
          nextDayPlan: 'Perform stress tests with 30 simulated concurrent staff submissions.',
          additionalNotes: 'All cryptographic keys properly sourced from Cloudflare encrypted secrets.',
          submissionStatus: 'Submitted',
          managerComments: '',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'LOG-2026-002',
          employeeId: 'usr-marcus',
          employeeName: 'Marcus Vance',
          departmentId: 'dept-qa',
          departmentName: 'Quality Assurance',
          workDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '17:30',
          totalHours: 8.5,
          workDescription: 'Executed test matrices covering Administrator user provisioning, password resets, role permission boundaries, and formula injection sanitization.',
          tasksCompleted: 'Cypress suite for RBAC restrictions on staff endpoints.',
          pendingTasks: 'Review audit log export formatting.',
          problemsEncountered: 'None encountered. Test suite passing 100%.',
          nextDayPlan: 'Test mobile responsive navigation on iOS Safari and Android Chrome.',
          additionalNotes: 'Ready for manager review.',
          submissionStatus: 'Approved',
          managerComments: 'Excellent attention to formula sanitization detail. Approved!',
          reviewerId: 'usr-david',
          reviewerName: 'David Chen',
          reviewedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'LOG-2026-003',
          employeeId: 'usr-chloe',
          employeeName: 'Chloe Bennett',
          departmentId: 'dept-mkt',
          departmentName: 'Marketing & Growth',
          workDate: today,
          startTime: '09:00',
          endTime: '16:00',
          totalHours: 7.0,
          workDescription: 'Drafted quarterly performance newsletter and visual infographics for department KPIs.',
          tasksCompleted: 'Content outline and visual asset generation.',
          pendingTasks: 'Executive quotes and review by Sarah Jenkins.',
          problemsEncountered: 'Awaiting revised revenue metrics from finance.',
          nextDayPlan: 'Finalize graphics and schedule distribution.',
          additionalNotes: 'Draft version saved.',
          submissionStatus: 'Draft',
          managerComments: '',
          createdAt: now,
          updatedAt: now,
        },
      ],
      logReviews: [],
      logAudits: [
        {
          id: 'aud-log-1',
          logId: 'LOG-2026-002',
          modifiedBy: 'usr-david',
          modifierName: 'David Chen',
          action: 'Approved',
          changes: { submissionStatus: { old: 'Submitted', new: 'Approved' } },
          timestamp: now,
          notes: 'Reviewed and approved with manager comments.',
        },
      ],
      calendarEvents: [
        {
          id: 'evt-1',
          title: 'Sprint Planning & Team Backlog Review',
          description: 'Bi-weekly engineering and operations sprint task allocation.',
          eventType: 'Meeting',
          startDate: today,
          endDate: today,
          allDay: false,
          departmentId: 'dept-eng',
          createdById: 'usr-david',
          creatorName: 'David Chen',
          attendees: ['usr-elena', 'usr-marcus', 'usr-david'],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'evt-2',
          title: 'Quarterly Audit & Work Log Certification Deadline',
          description: 'All pending daily logs must be submitted and approved by supervisors.',
          eventType: 'TaskDeadline',
          startDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          allDay: true,
          createdById: 'usr-admin',
          creatorName: 'Alexander Wright',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'evt-3',
          title: 'All-Hands Company Milestone Meeting',
          description: 'Company-wide strategy presentation and employee recognition.',
          eventType: 'CompanyEvent',
          startDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
          allDay: true,
          createdById: 'usr-admin',
          creatorName: 'Alexander Wright',
          createdAt: now,
          updatedAt: now,
        },
      ],
      notifications: [
        {
          id: 'notif-1',
          userId: 'usr-elena',
          title: 'New Urgent Task Assigned',
          message: 'David Chen assigned you: Implement Multi-User Google Sheets Sync Gateway.',
          type: 'task_assigned',
          link: '/tasks',
          isRead: false,
          createdAt: now,
        },
        {
          id: 'notif-2',
          userId: 'usr-david',
          title: 'Daily Log Submitted for Review',
          message: 'Elena Rostova submitted daily work log for review.',
          type: 'log_reviewed',
          link: '/daily-logs',
          isRead: false,
          createdAt: now,
        },
        {
          id: 'notif-3',
          userId: 'usr-marcus',
          title: 'Daily Log Approved',
          message: 'David Chen approved your daily work log for yesterday.',
          type: 'log_reviewed',
          link: '/daily-logs',
          isRead: true,
          createdAt: now,
        },
      ],
      auditLogs: [
        {
          id: 'aud-sys-1',
          userId: 'usr-admin',
          userName: 'Alexander Wright',
          action: 'SYSTEM_BOOTSTRAP',
          module: 'Security',
          details: 'Initial system bootstrap completed. Enterprise database tables initialized.',
          timestamp: now,
        },
        {
          id: 'aud-sys-2',
          userId: 'usr-admin',
          userName: 'Alexander Wright',
          action: 'USER_LOGIN',
          module: 'Authentication',
          details: 'Administrator logged in from internal session.',
          timestamp: now,
        },
      ],
      sessions: {},
    };

    await this.save();
  }

  // Database Accessors
  async getTable<T>(tableName: keyof DatabaseSchema): Promise<T[]> {
    await this.init();
    return ((this.db as any)[tableName] || []) as T[];
  }

  async getRecord<T>(tableName: keyof DatabaseSchema, id: string): Promise<T | null> {
    await this.init();
    const table = (this.db as any)[tableName] || [];
    return (table.find((item: any) => item.id === id) || null) as T | null;
  }

  async insertRecord<T = any>(tableName: keyof DatabaseSchema, record: T): Promise<T> {
    await this.init();
    const table = (this.db as any)[tableName] || [];
    table.unshift(record);
    (this.db as any)[tableName] = table;
    await this.save();
    return record;
  }

  async updateRecord<T = any>(tableName: keyof DatabaseSchema, id: string, updates: Partial<T> | Record<string, any>): Promise<T | null> {
    await this.init();
    const table = (this.db as any)[tableName] || [];
    const idx = table.findIndex((item: any) => item.id === id);
    if (idx === -1) return null;

    table[idx] = {
      ...table[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    (this.db as any)[tableName] = table;
    await this.save();
    return table[idx] as T;
  }

  async deleteRecord(tableName: keyof DatabaseSchema, id: string): Promise<boolean> {
    await this.init();
    const table = (this.db as any)[tableName] || [];
    const idx = table.findIndex((item: any) => item.id === id);
    if (idx === -1) return false;
    table.splice(idx, 1);
    (this.db as any)[tableName] = table;
    await this.save();
    return true;
  }

  async getSettings(): Promise<any> {
    await this.init();
    return this.db?.settings || {};
  }

  async updateSettings(settings: any): Promise<any> {
    await this.init();
    if (!this.db) return {};
    this.db.settings = { ...this.db.settings, ...settings };
    await this.save();
    return this.db.settings;
  }

  // Session Management
  async createSession(userId: string): Promise<string> {
    await this.init();
    const token = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
    if (!this.db) return '';
    this.db.sessions[token] = { userId, expiresAt };
    await this.save();
    return token;
  }

  async validateSession(token: string): Promise<any | null> {
    await this.init();
    if (!this.db || !token) return null;
    const session = this.db.sessions[token];
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      delete this.db.sessions[token];
      await this.save();
      return null;
    }
    const user = this.db.users.find((u) => u.id === session.userId);
    if (!user || user.accountStatus === 'Deactivated') return null;
    return user;
  }

  async destroySession(token: string): Promise<void> {
    await this.init();
    if (this.db && this.db.sessions[token]) {
      delete this.db.sessions[token];
      await this.save();
    }
  }

  // Audit Logging
  async logAudit(userId: string, userName: string, action: string, module: string, details: string): Promise<void> {
    await this.init();
    const auditRecord = {
      id: 'aud-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      userId,
      userName,
      action,
      module,
      details,
      timestamp: new Date().toISOString(),
    };
    if (this.db) {
      this.db.auditLogs.unshift(auditRecord);
      // Keep max 1000 audit records
      if (this.db.auditLogs.length > 1000) {
        this.db.auditLogs.length = 1000;
      }
      await this.save();
    }
  }
}

export const db = new DatabaseEngine();
