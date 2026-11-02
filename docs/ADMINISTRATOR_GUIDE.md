# Administrator Operating Guide

## 1. Access & Credentials
- **Default Administrator Username**: `admin`
- **Initial Password**: `Admin@2026!Secure` (Please change upon initial system deployment via top-right profile &rarr; **Change Password**).

---

## 2. Staff Account Provisioning
1. Click **Staff & Role Management** in the sidebar.
2. Click **Add New Employee**.
3. Fill in:
   - Full Name
   - Unique username (e.g. `john.doe`)
   - Initial temporary password (minimum 8 characters)
   - Department assignment
   - Job Title
   - System Role (`Administrator`, `Manager`, or `Staff`)
4. The server automatically hashes credentials using **salted PBKDF2-SHA256** (100,000 iterations). Raw passwords are never stored or exposed.

---

## 3. Account Deactivation
If an employee departs the company:
1. Navigate to **Staff & Role Management**.
2. Locate the employee and click the **Deactivate User** icon.
3. The user's active session is terminated immediately and any subsequent login attempts will be rejected by the server.

---

## 4. Daily Work Log Oversight & Reopening
- Daily work logs submitted by staff members enter the **Manager Review Queue**.
- Once a log is marked as **Approved**, it is locked to preserve legal compliance and historical audit integrity.
- If a staff member made an error in an approved log, only an **Administrator** or **Department Manager** can click **Reopen this log for staff amendments** and provide a documented business reason.
- Every approval, rejection, and reopening is recorded with an immutable timestamp in the **Audit Trail**.

---

## 5. Security & Audit Trail Inspection
- Access **Security Audit Trail** from the sidebar to inspect:
  - User sign-ins and failed login attempts
  - Task assignments, updates, and completions
  - Work log status transitions
  - Google Sheets synchronization handshakes
- Click **Export Audit CSV** to download compliance logs for external audits.
