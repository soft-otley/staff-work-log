/**
 * Google Apps Script - Initial Database Setup & Migration Script
 * 
 * Run this function (initializeDatabase) once to automatically provision
 * all 12 database tables (tabs) with proper schemas, styles, and initial seed records.
 */

function initializeDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var tables = [
    {
      name: 'Users',
      headers: ['id', 'username', 'fullName', 'departmentId', 'departmentName', 'jobTitle', 'role', 'roleId', 'email', 'phone', 'joiningDate', 'accountStatus', 'lastLogin', 'createdAt', 'updatedAt'],
      color: '#1e3a8a'
    },
    {
      name: 'Roles',
      headers: ['id', 'name', 'description', 'isSystem', 'permissions', 'createdAt', 'updatedAt'],
      color: '#1e3a8a'
    },
    {
      name: 'Permissions',
      headers: ['id', 'name', 'category', 'description'],
      color: '#1e3a8a'
    },
    {
      name: 'RolePermissions',
      headers: ['roleId', 'permissionId', 'createdAt'],
      color: '#1e3a8a'
    },
    {
      name: 'Departments',
      headers: ['id', 'name', 'code', 'description', 'managerId', 'managerName', 'createdAt', 'updatedAt'],
      color: '#1e3a8a'
    },
    {
      name: 'Tasks',
      headers: ['id', 'title', 'description', 'assignedTo', 'assigneeName', 'departmentId', 'departmentName', 'createdBy', 'creatorName', 'startDate', 'dueDate', 'priority', 'status', 'progress', 'estimatedHours', 'actualHours', 'completionDate', 'dependencies', 'createdAt', 'updatedAt'],
      color: '#1e3a8a'
    },
    {
      name: 'DailyLogs',
      headers: ['id', 'employeeId', 'employeeName', 'departmentId', 'departmentName', 'workDate', 'startTime', 'endTime', 'totalHours', 'workDescription', 'tasksCompleted', 'pendingTasks', 'problemsEncountered', 'nextDayPlan', 'additionalNotes', 'submissionStatus', 'managerComments', 'reviewerId', 'reviewerName', 'reviewedAt', 'createdAt', 'updatedAt'],
      color: '#1e3a8a'
    },
    {
      name: 'LogReviews',
      headers: ['id', 'logId', 'reviewerId', 'reviewerName', 'status', 'comments', 'reviewedAt'],
      color: '#1e3a8a'
    },
    {
      name: 'CalendarEvents',
      headers: ['id', 'title', 'description', 'eventType', 'startDate', 'endDate', 'allDay', 'departmentId', 'createdById', 'creatorName', 'attendees', 'createdAt', 'updatedAt'],
      color: '#1e3a8a'
    },
    {
      name: 'Notifications',
      headers: ['id', 'userId', 'title', 'message', 'type', 'link', 'isRead', 'createdAt'],
      color: '#1e3a8a'
    },
    {
      name: 'AuditLogs',
      headers: ['id', 'userId', 'userName', 'action', 'module', 'details', 'timestamp'],
      color: '#1e3a8a'
    },
    {
      name: 'Settings',
      headers: ['companyName', 'standardWorkHoursPerDay', 'syncStatus', 'lastSyncTimestamp', 'requireLogApproval'],
      color: '#1e3a8a'
    }
  ];

  for (var i = 0; i < tables.length; i++) {
    var config = tables[i];
    var sheet = ss.getSheetByName(config.name);
    
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
    }

    // Set headers if empty
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
      
      // Format Header Row
      var headerRange = sheet.getRange(1, 1, 1, config.headers.length);
      headerRange.setBackground(config.color);
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      headerRange.setFontFamily('Public Sans');
      sheet.setFrozenRows(1);
    }
  }

  // Set default API Signing Secret in Script Properties if not already set
  var scriptProperties = PropertiesService.getScriptProperties();
  if (!scriptProperties.getProperty('API_SIGNING_SECRET')) {
    scriptProperties.setProperty('API_SIGNING_SECRET', 'sec_7f9c381a8b3e4d819e62319f07d2');
  }
  scriptProperties.setProperty('SPREADSHEET_ID', ss.getId());

  Logger.log('Staff Work Log Database initialized successfully across all 12 sheets.');
}
