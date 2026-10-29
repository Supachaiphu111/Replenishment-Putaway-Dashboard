/**
 * Production-ready Google Apps Script (Code.gs) template for RP20 WMS Dashboard.
 * Users can copy and paste this into Google Sheets -> Extensions -> Apps Script.
 */

export const APPS_SCRIPT_CODE = `/**
 * ==============================================================================
 * RP20 WMS Google Sheets Automation & Real-time Data Collector
 * ==============================================================================
 * ระบบจัดเก็บและคำนวณข้อมูลงาน RP20 (Replenishment & Putaway) อัตโนมัติใน Google Sheets
 * รองรับ:
 * 1. Webhook API (doPost / doGet) สำหรับรับข้อมูล Real-time จาก Dashboard
 * 2. Custom Menu บน Google Sheets สำหรับคำนวณสรุปผล 24 ชม. และ Leaderboard พนักงาน
 * 3. จัดการโครงสร้าง 3 แผ่นงานอัตโนมัติ: RP20_Tasks_Data, Hourly_24H_Summary, Operator_Leaderboard
 * ==============================================================================
 */

// ชื่อแผ่นงานหลัก
const SHEET_TASKS = 'RP20_Tasks_Data';
const SHEET_HOURLY = 'Hourly_24H_Summary';
const SHEET_LEADERBOARD = 'Operator_Leaderboard';

/**
 * เพิ่มเมนูพิเศษบน Google Sheets อัตโนมัติเมื่อเปิดไฟล์
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 RP20 WMS เมนู')
    .addItem('⚙️ เริ่มต้นสร้างชีตและจัดรูปแบบ (Initialize Sheets)', 'initializeAllSheets')
    .addSeparator()
    .addItem('🔄 คำนวณสรุปยอดรายชั่วโมง 24 ชม.', 'calculateHourlyProductivity')
    .addItem('🏆 อัปเดตตาราง Leaderboard พนักงาน', 'calculateOperatorLeaderboard')
    .addItem('📊 อัปเดตคำนวณทั้งหมดพร้อมกัน', 'refreshAllSummaries')
    .addSeparator()
    .addItem('🧹 ล้างข้อมูลและรีเซ็ตตาราง', 'confirmReset')
    .addToUi();
}

/**
 * Webhook API: รองรับการรับข้อมูล HTTP POST จาก Dashboard
 */
function doPost(e) {
  try {
    const lock = LockService.getScriptLock();
    // รอ Lock ป้องกันข้อมูลชนกันกรณีส่งมาพร้อมกัน
    lock.waitLock(10000);

    let payload;
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    } else {
      payload = {};
    }

    const action = payload.action || 'ADD_TASK';
    let result = {};

    ensureSheetsExist();

    if (action === 'ADD_TASK') {
      result = handleAddTask(payload.task || payload);
    } else if (action === 'BATCH_IMPORT' || action === 'SYNC_BATCH') {
      result = handleBatchImport(payload.records || [], payload.mode || 'APPEND');
    } else if (action === 'INIT_SHEETS') {
      initializeAllSheets();
      result = { success: true, message: 'Initialized sheets successfully' };
    } else {
      result = { success: false, message: 'Unknown action: ' + action };
    }

    // อัปเดตสรุปผลรายชั่วโมงและ Leaderboard อัตโนมัติ
    refreshAllSummaries();

    lock.releaseLock();

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Webhook API: รองรับ HTTP GET เพื่อตรวจสอบสถานะและดึงยอดรวม
 */
function doGet(e) {
  try {
    ensureSheetsExist();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const taskSheet = ss.getSheetByName(SHEET_TASKS);
    const lastRow = taskSheet.getLastRow();
    const totalRecords = Math.max(0, lastRow - 1);

    const response = {
      status: 'active',
      appName: 'RP20 WMS Dashboard Collector',
      sheetTitle: ss.getName(),
      totalRecords: totalRecords,
      lastUpdated: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * บันทึกงานเดี่ยว (Single Task) ลงในตาราง RP20_Tasks_Data
 */
function handleAddTask(task) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TASKS);

  const id = task.id || ('RP-' + new Date().getTime());
  const taskDesc = task.taskDescription || 'Putaway Task';
  const taskStatus = task.taskStatus || 'Complete';
  const byUser = task.byUser || 'Operator';
  const completedTime = task.completedTime || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
  const qty = Number(task.quantity) || 1;
  const completedDate = task.completedDate || completedTime.substring(0, 10);
  const completedHour = task.completedHour !== undefined ? Number(task.completedHour) : parseHourFromTime(completedTime);
  const location = task.location || '';

  sheet.appendRow([
    id,
    taskDesc,
    taskStatus,
    byUser,
    completedTime,
    qty,
    completedDate,
    completedHour,
    location,
    new Date() // Server Timestamp
  ]);

  return {
    success: true,
    action: 'ADD_TASK',
    taskId: id,
    totalRows: sheet.getLastRow() - 1
  };
}

/**
 * บันทึกข้อมูลแบบชุด (Batch Records)
 */
function handleBatchImport(records, mode) {
  if (!records || records.length === 0) {
    return { success: true, count: 0, message: 'No records provided' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TASKS);

  if (mode === 'OVERWRITE') {
    // ล้างข้อมูลเก่าแต่เก็บหัวคอลัมน์ไว้
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }
  }

  const rows = [];
  const now = new Date();

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const completedTime = r.completedTime || '';
    const completedHour = r.completedHour !== undefined ? Number(r.completedHour) : parseHourFromTime(completedTime);

    rows.push([
      r.id || ('RP-' + (i + 1)),
      r.taskDescription || '',
      r.taskStatus || 'Complete',
      r.byUser || '',
      completedTime,
      Number(r.quantity) || 1,
      r.completedDate || (completedTime ? completedTime.substring(0, 10) : ''),
      completedHour,
      r.location || '',
      now
    ]);
  }

  if (rows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  }

  return {
    success: true,
    action: 'BATCH_IMPORT',
    insertedCount: rows.length,
    totalRows: sheet.getLastRow() - 1
  };
}

/**
 * คำนวณยอดงานรายชั่วโมง (00:00 - 23:00 น.) นับเฉพาะสถานะ Complete
 */
function calculateHourlyProductivity() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const taskSheet = ss.getSheetByName(SHEET_TASKS);
  const hourlySheet = ss.getSheetByName(SHEET_HOURLY);

  const lastRow = taskSheet.getLastRow();
  const hourlyCounts = new Array(24).fill(0);
  const hourlyUsers = {};
  for (let h = 0; h < 24; h++) hourlyUsers[h] = {};

  if (lastRow > 1) {
    // คอลัมน์ C: Task Status, D: By User, H: Completed Hour
    const data = taskSheet.getRange(2, 1, lastRow - 1, 9).getValues();

    for (let i = 0; i < data.length; i++) {
      const status = String(data[i][2] || '').trim().toLowerCase();
      const user = String(data[i][3] || '').trim();
      const hourVal = data[i][7];

      // กรองเฉพาะสถานะ Complete
      if (status === 'complete' || status === 'เสร็จสิ้น' || status === 'completed') {
        const hour = parseInt(hourVal, 10);
        if (!isNaN(hour) && hour >= 0 && hour < 24) {
          hourlyCounts[hour]++;
          if (user) {
            hourlyUsers[hour][user] = true;
          }
        }
      }
    }
  }

  // เตรียมแถวสำหรับตารางรายชั่วโมง 24 ชม. พร้อมระบุกะการทำงาน
  const rows = [];
  let cumulative = 0;

  for (let h = 0; h < 24; h++) {
    const label = (h < 10 ? '0' + h : h) + ':00 - ' + (h < 10 ? '0' + h : h) + ':59';
    const count = hourlyCounts[h];
    cumulative += count;
    const activeUsers = Object.keys(hourlyUsers[h]).length;

    let shiftName = 'ช่วงสลับกะ/พัก';
    if (h >= 5 && h < 17) {
      shiftName = 'กะเช้า (05:00-17:00)';
    } else if ((h >= 18 && h <= 23) || (h >= 0 && h < 4)) {
      shiftName = 'กะดึก (18:00-04:00)';
    }

    rows.push([
      h,
      label,
      shiftName,
      count,
      cumulative,
      activeUsers
    ]);
  }

  // อัปเดตตาราง Hourly_24H_Summary (6 คอลัมน์)
  hourlySheet.getRange(2, 1, 24, 6).setValues(rows);
}

/**
 * คำนวณตาราง Leaderboard สรุปยอดพนักงาน (นับเฉพาะ Complete)
 */
function calculateOperatorLeaderboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const taskSheet = ss.getSheetByName(SHEET_TASKS);
  const boardSheet = ss.getSheetByName(SHEET_LEADERBOARD);

  const lastRow = taskSheet.getLastRow();
  const userStats = {};

  if (lastRow > 1) {
    const data = taskSheet.getRange(2, 1, lastRow - 1, 9).getValues();

    for (let i = 0; i < data.length; i++) {
      const status = String(data[i][2] || '').trim().toLowerCase();
      const user = String(data[i][3] || '').trim();
      const hourVal = parseInt(data[i][7], 10);

      if ((status === 'complete' || status === 'เสร็จสิ้น' || status === 'completed') && user) {
        if (!userStats[user]) {
          userStats[user] = {
            total: 0,
            hourly: new Array(24).fill(0)
          };
        }
        userStats[user].total++;
        if (!isNaN(hourVal) && hourVal >= 0 && hourVal < 24) {
          userStats[user].hourly[hourVal]++;
        }
      }
    }
  }

  // แปลงเป็น Array และจัดเรียงจากมากไปน้อย
  const userList = Object.keys(userStats).map(function(u) {
    const s = userStats[u];
    let peakVol = 0;
    let peakH = 0;
    let activeHours = 0;

    for (let h = 0; h < 24; h++) {
      if (s.hourly[h] > peakVol) {
        peakVol = s.hourly[h];
        peakH = h;
      }
      if (s.hourly[h] > 0) activeHours++;
    }

    const avg = activeHours > 0 ? (s.total / activeHours) : 0;

    return {
      user: u,
      total: s.total,
      peakHour: (peakH < 10 ? '0' + peakH : peakH) + ':00',
      peakVol: peakVol,
      avgPerHour: Math.round(avg * 10) / 10
    };
  });

  userList.sort(function(a, b) {
    return b.total - a.total;
  });

  // เคลียร์ตารางเดิม
  const boardLastRow = boardSheet.getLastRow();
  if (boardLastRow > 1) {
    boardSheet.getRange(2, 1, boardLastRow - 1, 6).clearContent();
  }

  if (userList.length > 0) {
    const rows = userList.map(function(item, index) {
      return [
        index + 1,
        item.user,
        item.total,
        item.peakHour,
        item.peakVol,
        item.avgPerHour
      ];
    });

    boardSheet.getRange(2, 1, rows.length, 6).setValues(rows);
  }
}

/**
 * คำนวณสรุปผลทั้งหมด
 */
function refreshAllSummaries() {
  calculateHourlyProductivity();
  calculateOperatorLeaderboard();
}

/**
 * สร้างและจัดรูปแบบแผ่นงานทั้ง 3 แผ่นงานแบบมืออาชีพ
 */
function initializeAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheetsExist();

  // 1. RP20_Tasks_Data Setup
  const taskSheet = ss.getSheetByName(SHEET_TASKS);
  taskSheet.clear();
  const taskHeaders = [
    'Task ID',
    'Task Description',
    'Task Status',
    'By User',
    'Latest Task Update Date',
    'Quantity',
    'Completed Date',
    'Completed Hour',
    'Location',
    'Sync Timestamp'
  ];
  taskSheet.appendRow(taskHeaders);
  formatHeaderRow(taskSheet, '#047857'); // Emerald green
  taskSheet.setFrozenRows(1);
  taskSheet.autoResizeColumns(1, taskHeaders.length);

  // 2. Hourly_24H_Summary Setup
  const hourlySheet = ss.getSheetByName(SHEET_HOURLY);
  hourlySheet.clear();
  const hourlyHeaders = [
    'Hour Index',
    'ช่วงเวลา (24 Hours)',
    'กะการทำงาน (Shift)',
    'ยอดงาน Complete (งาน)',
    'ยอดสะสม (Cumulative)',
    'จน. พนักงานปฏิบัติการ (คน)'
  ];
  hourlySheet.appendRow(hourlyHeaders);
  formatHeaderRow(hourlySheet, '#0f766e'); // Teal
  hourlySheet.setFrozenRows(1);

  // 3. Operator_Leaderboard Setup
  const boardSheet = ss.getSheetByName(SHEET_LEADERBOARD);
  boardSheet.clear();
  const boardHeaders = [
    'อันดับ (Rank)',
    'ชื่อพนักงาน (By User)',
    'ยอดงานเสร็จสิ้น (Total Complete)',
    'ชั่วโมงพีค (Peak Hour)',
    'ยอดสูงสุด/ชม (Peak Vol)',
    'เฉลี่ยต่องาน/ชม (Avg/Hr)'
  ];
  boardSheet.appendRow(boardHeaders);
  formatHeaderRow(boardSheet, '#1e293b'); // Tech slate
  boardSheet.setFrozenRows(1);

  // คำนวณยอดเริ่มต้น
  refreshAllSummaries();
  ss.toast('✅ เริ่มต้นสร้างโครงสร้างและจัดรูปแบบชีต RP20 สำเร็จ!', 'RP20 WMS');
}

/**
 * ยืนยันก่อนรีเซ็ตข้อมูล
 */
function confirmReset() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert('ยืนยันการรีเซ็ต', 'คุณต้องการล้างข้อมูลทั้งหมดในตาราง RP20_Tasks_Data หรือไม่?', ui.ButtonSet.YES_NO);
  if (res == ui.Button.YES) {
    initializeAllSheets();
  }
}

/**
 * ฟังก์ชันช่วย: จัดรูปแบบหัวคอลัมน์ให้สวยงาม
 */
function formatHeaderRow(sheet, bgColor) {
  const range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  range.setBackground(bgColor)
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontFamily('Prompt')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 35);
}

/**
 * ฟังก์ชันช่วย: ตรวจสอบและสร้างชีตให้ครบ 3 แผ่น
 */
function ensureSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const names = [SHEET_TASKS, SHEET_HOURLY, SHEET_LEADERBOARD];
  for (let i = 0; i < names.length; i++) {
    if (!ss.getSheetByName(names[i])) {
      ss.insertSheet(names[i]);
    }
  }
}

/**
 * ฟังก์ชันช่วย: แกะชั่วโมงจากสตริงวันเวลา
 */
function parseHourFromTime(timeStr) {
  if (!timeStr) return 8;
  const match = String(timeStr).match(/\\s+(\\d{1,2}):/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 8;
}
`;

export const APPS_SCRIPT_INSTRUCTIONS = [
  {
    step: 1,
    title: 'เปิด Google Sheet หรือสร้างชีตใหม่',
    detail: 'เปิดไฟล์ Google Spreadsheet ที่คุณต้องการใช้จัดเก็บข้อมูลงาน RP20',
  },
  {
    step: 2,
    title: 'เข้าสู่ Apps Script Editor',
    detail: 'บนแถบเมนูด้านบนของ Google Sheets ไปที่เมนู "ส่วนขยาย" (Extensions) > เลือก "Apps Script"',
  },
  {
    step: 3,
    title: 'วางโค้ด Apps Script (Code.gs)',
    detail: 'ลบโค้ดเดิมในไฟล์ Code.gs ทั้งหมด แล้ววางโค้ดที่คัดลอกจากกล่องด้านล่างนี้ลงไป แล้วกดปุ่ม บันทึก (ไอคอนแผ่นดิสก์ หรือ Ctrl+S)',
  },
  {
    step: 4,
    title: 'ทำให้ใช้งานได้ในรูปแบบเว็บแอป (Deploy as Web App)',
    detail: 'กดปุ่มสีฟ้า "ทำให้ใช้งานได้" (Deploy) มุมขวาบน > เลือก "การปรับใช้ใหม่" (New deployment) > เลือกประเภทเป็น "เว็บแอป" (Web app) > ช่อง "ผู้มีสิทธิ์เข้าถึง" (Who has access) ให้เลือกเป็น "ทุกคน" (Anyone) > กด "ทำให้ใช้งานได้" (Deploy)',
  },
  {
    step: 5,
    title: 'คัดลอก URL เว็บแอปมาใส่ในระบบนี้',
    detail: 'คัดลอก "URL ของเว็บแอป" (ลงท้ายด้วย /exec) มาวางในช่อง "Apps Script Web App URL" ด้านล่าง เพื่อเริ่มซิงค์ข้อมูลแบบ Real-time',
  },
];
