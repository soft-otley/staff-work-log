# Google Sheets Database Setup & Initialization Guide

## 1. Overview
The Staff Work Log & Team Management System uses a central Google Spreadsheet as its persistent database. To preserve security and concurrency control, browsers never communicate directly with Google Sheets. Instead, all operations route through **Google Apps Script** using HMAC-SHA256 authenticated requests and Google's native `LockService`.

---

## 2. Spreadsheet Database Structure (12 Dedicated Tabs)

The spreadsheet contains 12 sheets (tabs) with standardized headers and stable UUIDs:

| # | Sheet Tab Name | Purpose | Primary Keys & Fields |
|---|---|---|---|
| 1 | **Users** | Employee directory & accounts | `id`, `username`, `fullName`, `departmentId`, `departmentName`, `jobTitle`, `role`, `roleId`, `email`, `phone`, `joiningDate`, `accountStatus`, `lastLogin`, `createdAt`, `updatedAt` |
| 2 | **Roles** | RBAC definition | `id`, `name`, `description`, `isSystem`, `permissions`, `createdAt`, `updatedAt` |
| 3 | **Permissions** | System permission list | `id`, `name`, `category`, `description` |
| 4 | **RolePermissions** | Role-permission join table | `roleId`, `permissionId`, `createdAt` |
| 5 | **Departments** | Organizational units | `id`, `name`, `code`, `description`, `managerId`, `managerName`, `createdAt`, `updatedAt` |
| 6 | **Tasks** | Deliverables & projects | `id`, `title`, `description`, `assignedTo`, `assigneeName`, `departmentId`, `departmentName`, `createdBy`, `creatorName`, `startDate`, `dueDate`, `priority`, `status`, `progress`, `estimatedHours`, `actualHours`, `completionDate`, `dependencies`, `createdAt`, `updatedAt` |
| 7 | **DailyLogs** | Book-style daily work records | `id`, `employeeId`, `employeeName`, `departmentId`, `departmentName`, `workDate`, `startTime`, `endTime`, `totalHours`, `workDescription`, `tasksCompleted`, `pendingTasks`, `problemsEncountered`, `nextDayPlan`, `additionalNotes`, `submissionStatus`, `managerComments`, `reviewerId`, `reviewerName`, `reviewedAt`, `createdAt`, `updatedAt` |
| 8 | **LogReviews** | Supervisor reviews history | `id`, `logId`, `reviewerId`, `reviewerName`, `status`, `comments`, `reviewedAt` |
| 9 | **CalendarEvents** | Milestone & sync meetings | `id`, `title`, `description`, `eventType`, `startDate`, `endDate`, `allDay`, `departmentId`, `createdById`, `creatorName`, `attendees`, `createdAt`, `updatedAt` |
| 10 | **Notifications** | In-app user notifications | `id`, `userId`, `title`, `message`, `type`, `link`, `isRead`, `createdAt` |
| 11 | **AuditLogs** | Security compliance logs | `id`, `userId`, `userName`, `action`, `module`, `details`, `timestamp` |
| 12 | **Settings** | Company settings & sync | `companyName`, `standardWorkHoursPerDay`, `syncStatus`, `lastSyncTimestamp`, `requireLogApproval` |

---

## 3. Step-by-Step Setup in Google Sheets

### Step 1: Create a New Google Sheet
1. Navigate to [Google Sheets](https://sheets.google.com).
2. Create a new blank spreadsheet.
3. Rename the spreadsheet to: `Staff Work Log - Enterprise Database`.

### Step 2: Open Google Apps Script Editor
1. In the Google Sheets menu, click **Extensions** &rarr; **Apps Script**.
2. Rename the project to: `StaffWorkLogGateway`.

### Step 3: Copy Apps Script Files
1. In the Apps Script editor, open `Code.gs` and replace its contents with the code from `/apps-script/Code.gs`.
2. Click the `+` button next to Files, select **Script**, name it `Setup`, and paste the code from `/apps-script/Setup.gs`.

### Step 4: Run the Automatic Sheet Initializer
1. In the Apps Script toolbar dropdown, select the function `initializeDatabase`.
2. Click **Run**.
3. Accept the authorization prompt allowing the script to manage spreadsheet tabs.
4. When execution completes, return to the Google Sheet: all 12 tabs with navy headers, bold text, and column freezing will be configured!

### Step 5: Deploy Apps Script as a Web App
1. In the top right of the Apps Script editor, click **Deploy** &rarr; **New deployment**.
2. Select type: **Web app** (gear icon).
3. Fill in configuration:
   - **Description**: `Staff Work Log Production API`
   - **Execute as**: `Me (your Google account)`
   - **Who has access**: `Anyone` *(Authentication is enforced via HMAC-SHA256 signature)*
4. Click **Deploy**.
5. Copy the generated **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 6: Connect to the Staff Work Log Application
1. In the Staff Work Log application, navigate to **Google Sheets & Sync** in the sidebar.
2. Paste the Web App URL into the **Google Apps Script Web App Deployment URL** field.
3. Click **Save Configuration**.
4. Click **Test HMAC Handshake** to verify end-to-end connectivity.
5. Click **Trigger Full Batch Sync** to push all users, departments, tasks, and work logs directly into your Google Sheets tabs!
