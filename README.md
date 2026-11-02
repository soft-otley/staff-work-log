# Staff Work Log & Team Management Web Application

An enterprise-grade, secure, responsive Staff Work Log and Team Management Web Application designed for companies with 20–50 employees.

---

## Architecture Overview

```
React Frontend (Vite + Tailwind CSS + Public Sans + Lucide + Recharts)
                            ↓ (Same-origin /api/*)
Cloudflare Pages Functions / Express Backend (Node 18+ / Cloudflare Workers Runtime)
   • Salted PBKDF2-SHA256 Password Hashing (100,000 iterations via Web Crypto)
   • Server-Side RBAC & Session Management (HttpOnly SameSite cookies)
   • Formula Injection Protection & Input Sanitization
                            ↓ (HMAC-SHA256 Signed Requests)
Private Google Apps Script API Gateway (`apps-script/Code.gs`)
   • Constant-time HMAC-SHA256 Signature Verification
   • LockService.getScriptLock() Concurrency Controls
                            ↓ (Spreadsheet Service Batch Operations)
Google Sheets Central Database (12 Dedicated Tabs with Stable UUIDs)
```

---

## Key Modules & Features

1. **Role-Based Access Control (RBAC)**:
   - **Administrator**: Complete system control, user provisioning, password resets, role customization, department management, audit log access, Google Sheets sync monitoring.
   - **Manager**: Department staff oversight, task creation & assignment, review and approve/reject daily work logs with supervisor comments, department analytics.
   - **Staff**: Personal dashboard, assigned task tracking, hours logging, book-style daily work log journal, personal calendar, work history.

2. **Executive Dashboard**:
   - Company-wide or department-specific KPI stat cards (Total staff, Active accounts, Assigned tasks, In progress, Completed, Overdue alerts, Pending logs).
   - Interactive charts powered by `recharts` (Weekly throughput vs target, Monthly progress, Department delivery rates, Task status distribution, Daily hours trend).
   - Date range filters (Today, This Week, This Month, Custom).
   - Live activity stream sourced from the security audit trail.

3. **Task & Project Management**:
   - **Table View**: Comprehensive data table with multi-criteria filtering (status, priority, department, assignee) and search.
   - **Kanban Board**: Drag/click workflow columns (`Not Started`, `In Progress`, `On Hold`, `Completed`, `Cancelled`).
   - **Gantt Chart**: Visual project timeline with start/due date bars, completion percentages, overdue markers, and days/weeks zoom.
   - Detailed task drawer with real-time comments stream and actual hours logging.

4. **Book-Style Daily Work Log**:
   - Dual-page executive logbook design.
   - Left page: Shift hours calculator, primary work description, completed tasks list, next working day's plan.
   - Right page: Roadblocks/problems encountered, carry-over tasks, documentation notes, supervisor review section.
   - Draft saving and submission workflow.
   - Certification lock: Once approved, staff cannot edit unless an authorized manager or administrator formally reopens the record.
   - Immutable audit trail tracking all modifications, reviewer decisions, and reasons.

5. **Team Calendar & Reminders**:
   - Month, Week, and Day calendar views.
   - Schedules meetings, task deadlines, staff events, and company milestones with in-app notification alerts.

6. **Staff & User Management**:
   - Provision employees with unique usernames and role assignments.
   - Salted PBKDF2-SHA256 server-side password hashing.
   - Instant password reset and account deactivation (deactivated users cannot log in).

7. **Reports & Analytics**:
   - Audit-ready employee performance summaries, task completion, overdue deliverables, and working hours compliance.
   - One-click formula-sanitized CSV export and formatted print stylesheet.

8. **Google Sheets Integration**:
   - 12 dedicated database tabs (`Users`, `Roles`, `Permissions`, `RolePermissions`, `Departments`, `Tasks`, `DailyLogs`, `LogReviews`, `CalendarEvents`, `Notifications`, `AuditLogs`, `Settings`).
   - Automatic database setup script (`apps-script/Setup.gs`).
   - Private HMAC-SHA256 API handshake tester and full batch synchronizer.

---

## Quick Start & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

### 3. Default Demo Accounts
For rapid demonstration and testing of all 3 user roles:
- **Administrator**: `admin` / `Admin@2026!Secure` (Full system access)
- **Manager**: `david.eng` / `Manager@2026!` (Engineering team lead & log approver)
- **Staff**: `elena.dev` / `Staff@2026!` (Senior software engineer)

---

## Detailed Documentation Guides

- [Google Sheets Database Setup Guide](docs/DATABASE_SETUP_GUIDE.md)
- [Cloudflare Pages & GitHub Deployment Guide](docs/CLOUDFLARE_DEPLOYMENT_GUIDE.md)
- [Application Administrator Operating Guide](docs/ADMINISTRATOR_GUIDE.md)
- [Employee User Guide](docs/EMPLOYEE_USER_GUIDE.md)
- [Testing & Quality Assurance Checklist](docs/TESTING_CHECKLIST.md)
