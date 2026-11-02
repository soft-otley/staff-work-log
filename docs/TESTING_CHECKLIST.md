# Testing Checklist & Quality Assurance Guide

This checklist verifies all security, role authorization, concurrency, and workflow operations in accordance with the enterprise specification.

---

## 1. Authentication & Security Testing

| Test Case | Procedure | Expected Result | Pass/Fail |
|---|---|---|---|
| **Admin Login** | Sign in with `admin` / `Admin@2026!Secure` | Signs in to Administrator view; accesses full sidebar | [PASS] |
| **Manager Login** | Sign in with `david.eng` / `Manager@2026!` | Signs in to Manager view; accesses department tasks & review queue | [PASS] |
| **Staff Login** | Sign in with `elena.dev` / `Staff@2026!` | Signs in to Staff view; accesses own daily logs & assigned tasks | [PASS] |
| **Invalid Password** | Attempt login with valid username and wrong password | Rejected with `Invalid username or password`; logged in audit trail | [PASS] |
| **Deactivated User** | Deactivate user account, then attempt sign-in | Rejected with `This user account has been deactivated`; access blocked | [PASS] |
| **Password Salt & Hashing** | Inspect database records | Passwords stored as salted PBKDF2-SHA256 hex; no plain text | [PASS] |
| **Formula Injection** | Input value starting with `=SUM(A1:B10)` or `@malicious` | Automatically prefixed with `'` to neutralize formula execution | [PASS] |

---

## 2. Role-Based Access Control (RBAC) Testing

| Test Case | Procedure | Expected Result | Pass/Fail |
|---|---|---|---|
| **Staff Task Scope** | As `elena.dev`, view `/tasks` | Only sees assigned tasks and department tasks; cannot delete tasks | [PASS] |
| **Staff Log Editing Lock** | Attempt to modify a log with status `Approved` as staff | Blocked; approved logs are locked until reopened by supervisor | [PASS] |
| **Manager Log Review** | As `david.eng`, review submitted log in Review Queue | Can approve with comments or reject; employee is notified | [PASS] |
| **Supervisor Reopen** | As `david.eng` or `admin`, reopen approved log with reason | Status updates to `Reopened`; staff can now edit and resubmit | [PASS] |
| **Admin User Provisioning** | As `admin`, create new user in `/users` | User created and can immediately log in with provided password | [PASS] |

---

## 3. Workflow & Module Operations

| Test Case | Procedure | Expected Result | Pass/Fail |
|---|---|---|---|
| **Task Creation & Assignment** | Create task in `/tasks`; assign to `elena.dev` | Task appears on Kanban & Gantt; notification delivered to assignee | [PASS] |
| **Task Status & Progress** | Adjust progress slider to 100% | Status auto-switches to `Completed`; creator receives notification | [PASS] |
| **Book-Style Daily Log** | Fill shift hours `08:30` - `17:00` | Calculates `8.5 hours`; saves as Draft or submits for review | [PASS] |
| **Gantt Chart Timeline** | View tasks in Gantt view | Visual duration bars, zoom by days/weeks, overdue tasks in red | [PASS] |
| **CSV Export** | Click **Export CSV** in Tasks, Logs, or Reports | Generates sanitized `.csv` file with current filters applied | [PASS] |
| **Calendar Scheduling** | Create meeting on calendar | Displays on month grid with color badge; visible to participants | [PASS] |

---

## 4. Google Sheets & Cloudflare Production Integration

| Test Case | Procedure | Expected Result | Pass/Fail |
|---|---|---|---|
| **12-Tab Setup** | Run `initializeDatabase` in Google Apps Script | All 12 tabs generated with headers, blue styling, and freeze rows | [PASS] |
| **HMAC Handshake** | Click **Test HMAC Handshake** in Settings | Server signs payload with HMAC-SHA256; Apps Script returns HTTP 200 | [PASS] |
| **Batch Sync** | Click **Trigger Full Batch Sync** in Settings | Users, tasks, logs, and calendar events populate Google Sheets tabs | [PASS] |
| **LockService Concurrency** | Apps Script handles simultaneous POST requests | `LockService.getScriptLock()` prevents race conditions | [PASS] |
