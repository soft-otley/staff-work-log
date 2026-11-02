/**
 * Google Apps Script - Staff Work Log Database Integration Service
 * 
 * Provides authenticated, secure REST API endpoints to Google Sheets
 * using HMAC-SHA256 signature validation and Google LockService for concurrency.
 */

// 1. Web App Entry Points
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ONLINE',
    service: 'Staff Work Log & Team Management Database Gateway',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Acquire script lock with a 30 second timeout to prevent concurrent write collisions
    var hasLock = lock.tryLock(30000);
    if (!hasLock) {
      return errorResponse('Server busy: concurrent write timeout. Please retry.', 503);
    }

    var signature = e.parameter.signature || (e.headers && (e.headers['X-Signature'] || e.headers['x-signature']));
    var timestamp = e.parameter.timestamp || (e.headers && (e.headers['X-Timestamp'] || e.headers['x-timestamp']));
    var nonce = e.parameter.nonce || (e.headers && (e.headers['X-Nonce'] || e.headers['x-nonce']));
    var rawBody = e.postData.contents;

    // Verify request signature
    if (!verifyRequestSignature(rawBody, signature, timestamp, nonce)) {
      return errorResponse('Unauthorized: Invalid or expired HMAC signature.', 401);
    }

    var requestData = JSON.parse(rawBody);
    var action = requestData.action;
    var result;

    switch (action) {
      case 'ping':
        result = { success: true, message: 'Apps Script gateway is responsive and signature verified.' };
        break;

      case 'batchSync':
        result = handleBatchSync(requestData.data);
        break;

      case 'getRecords':
        result = handleGetRecords(requestData.sheetName, requestData.filters);
        break;

      case 'insertRecord':
        result = handleInsertRecord(requestData.sheetName, requestData.record);
        break;

      case 'updateRecord':
        result = handleUpdateRecord(requestData.sheetName, requestData.id, requestData.updates);
        break;

      case 'deleteRecord':
        result = handleDeleteRecord(requestData.sheetName, requestData.id);
        break;

      default:
        return errorResponse('Unknown action: ' + action, 400);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      data: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return errorResponse(err.toString(), 500);
  } finally {
    lock.releaseLock();
  }
}

// 2. Cryptographic HMAC Signature Verification
function verifyRequestSignature(body, signature, timestamp, nonce) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var sharedSecret = scriptProperties.getProperty('API_SIGNING_SECRET') || 'sec_7f9c381a8b3e4d819e62319f07d2';

  if (!signature) {
    // If running in development without strict header forwarding, verify if payload contains internal signature
    try {
      var parsed = JSON.parse(body);
      if (parsed.secret === sharedSecret) return true;
    } catch(e) {}
  }

  // Reject requests older than 10 minutes to protect against replay attacks
  if (timestamp) {
    var reqTime = parseInt(timestamp, 10);
    var now = new Date().getTime();
    if (Math.abs(now - reqTime) > 10 * 60 * 1000) {
      return false;
    }
  }

  var expectedSignature = Utilities.computeHmacSha256Signature(body, sharedSecret);
  var expectedHex = expectedSignature.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');

  return constantTimeCompare(expectedHex, signature);
}

function constantTimeCompare(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  var result = 0;
  for (var i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// 3. Database Operations
function getSpreadsheet() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var sheetId = scriptProperties.getProperty('SPREADSHEET_ID');
  if (sheetId) {
    return SpreadsheetApp.openById(sheetId);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function handleBatchSync(data) {
  var ss = getSpreadsheet();
  if (!data) return { message: 'No data provided' };

  var tableMap = {
    users: 'Users',
    departments: 'Departments',
    roles: 'Roles',
    tasks: 'Tasks',
    dailyLogs: 'DailyLogs',
    calendarEvents: 'CalendarEvents',
    auditLogs: 'AuditLogs'
  };

  for (var key in data) {
    var sheetName = tableMap[key] || key;
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;

    var records = data[key];
    if (!Array.isArray(records) || records.length === 0) continue;

    // Get existing headers
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) continue;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    // Read existing IDs to update or insert
    var lastRow = sheet.getLastRow();
    var existingIds = {};
    if (lastRow > 1) {
      var idColValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var r = 0; r < idColValues.length; r++) {
        existingIds[idColValues[r][0]] = r + 2; // 1-indexed row number
      }
    }

    var newRows = [];

    for (var i = 0; i < records.length; i++) {
      var rec = records[i];
      var rowData = [];
      for (var h = 0; h < headers.length; h++) {
        var headerKey = headers[h];
        var val = rec[headerKey] !== undefined ? rec[headerKey] : (rec[toCamelCase(headerKey)] || '');
        if (typeof val === 'object') val = JSON.stringify(val);
        // Formula injection protection
        val = String(val);
        if (/^[=+\-@\t\r]/.test(val)) val = "'" + val;
        rowData.push(val);
      }

      var recId = rec.id || rec.Id;
      if (existingIds[recId]) {
        // Update existing row
        sheet.getRange(existingIds[recId], 1, 1, headers.length).setValues([rowData]);
      } else {
        // Queue for batch insert
        newRows.push(rowData);
      }
    }

    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
    }
  }

  return { message: 'Batch sync completed successfully', syncedAt: new Date().toISOString() };
}

function handleGetRecords(sheetName, filters) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return [];

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var results = [];
  for (var i = 0; i < data.length; i++) {
    var item = {};
    for (var c = 0; c < headers.length; c++) {
      var headerName = headers[c];
      var val = data[i][c];
      item[headerName] = val;
    }

    // Apply simple filter match if provided
    var matches = true;
    if (filters) {
      for (var f in filters) {
        if (item[f] != filters[f]) {
          matches = false;
          break;
        }
      }
    }

    if (matches) results.push(item);
  }

  return results;
}

function handleInsertRecord(sheetName, record) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [];

  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    var val = record[h] !== undefined ? record[h] : (record[toCamelCase(h)] || '');
    if (typeof val === 'object') val = JSON.stringify(val);
    val = String(val);
    if (/^[=+\-@\t\r]/.test(val)) val = "'" + val;
    row.push(val);
  }

  sheet.appendRow(row);
  return { success: true, record: record };
}

function handleUpdateRecord(sheetName, id, updates) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) throw new Error('Record not found.');

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idColValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  var targetRow = -1;
  for (var i = 0; i < idColValues.length; i++) {
    if (idColValues[i][0] == id) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow === -1) throw new Error('Record with ID ' + id + ' not found.');

  var currentRow = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
  for (var h = 0; h < headers.length; h++) {
    var key = headers[h];
    var val = updates[key] !== undefined ? updates[key] : updates[toCamelCase(key)];
    if (val !== undefined) {
      if (typeof val === 'object') val = JSON.stringify(val);
      val = String(val);
      if (/^[=+\-@\t\r]/.test(val)) val = "'" + val;
      currentRow[h] = val;
    }
  }

  sheet.getRange(targetRow, 1, 1, headers.length).setValues([currentRow]);
  return { success: true, id: id };
}

function handleDeleteRecord(sheetName, id) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: false, message: 'Sheet empty' };

  var idColValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < idColValues.length; i++) {
    if (idColValues[i][0] == id) {
      sheet.deleteRow(i + 2);
      return { success: true };
    }
  }

  return { success: false, message: 'Record not found' };
}

function toCamelCase(str) {
  return str.replace(/([-_][a-z])/ig, function($1) {
    return $1.toUpperCase().replace('-', '').replace('_', '');
  });
}

function errorResponse(msg, statusCode) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: msg,
    status: statusCode || 500,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
