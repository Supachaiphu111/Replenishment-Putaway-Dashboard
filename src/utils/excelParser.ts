import * as XLSX from 'xlsx';
import { ColumnMapping, RP20RawRecord, UserSummary, HourlyProductivity } from '../types/rp20';

// Auto-detect columns based on common patterns in RP20 WMS reports
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s_\-.]+/g, '');

  let taskDescriptionCol = '';
  let taskStatusCol = '';
  let byUserCol = '';
  let completedTimeCol = '';
  let quantityCol = '';

  // Priority 1: Exact / standard RP20 columns
  for (const h of headers) {
    const clean = h.trim().toLowerCase();
    const norm = normalize(h);

    // 1. Task Description
    if (!taskDescriptionCol && (clean === 'task description' || clean === 'task_description' || norm === 'taskdescription')) {
      taskDescriptionCol = h;
    }
    // 2. Task Status
    if (!taskStatusCol && (clean === 'task status' || clean === 'task_status' || norm === 'taskstatus')) {
      taskStatusCol = h;
    }
    // 3. By User
    if (!byUserCol && (clean === 'by user' || clean === 'by_user' || norm === 'byuser')) {
      byUserCol = h;
    }
    // 4. Latest Task Update Date (exact RP20 WMS standard column)
    if (!completedTimeCol && (
      clean === 'latest task update date' ||
      clean === 'latest_task_update_date' ||
      norm === 'latesttaskupdatedate' ||
      norm.includes('latesttaskupdate') ||
      norm.includes('taskupdatedate')
    )) {
      completedTimeCol = h;
    }
  }

  // Priority 2: Fuzzy fallback detection if exact headers differ
  for (const h of headers) {
    const norm = normalize(h);

    // Task Description detection
    if (!taskDescriptionCol && (
      norm.includes('taskdesc') || norm.includes('description') || norm.includes('taskname') ||
      norm.includes('activity') || norm.includes('tasktype') || norm.includes('งาน') ||
      norm.includes('รายละเอียด') || norm.includes('ประเภทงาน') || norm === 'task'
    )) {
      taskDescriptionCol = h;
    }
    // Task Status detection
    if (!taskStatusCol && (
      norm.includes('status') || norm.includes('taskstatus') || norm.includes('สถานะ') ||
      norm.includes('state') || norm.includes('condition')
    )) {
      taskStatusCol = h;
    }
    // By User detection
    if (!byUserCol && (
      norm.includes('byuser') || norm.includes('user') || norm.includes('userid') ||
      norm.includes('operator') || norm.includes('employee') || norm.includes('staff') ||
      norm.includes('completedby') || norm.includes('พนักงาน') || norm.includes('ผู้ปฏิบัติ') ||
      norm.includes('worker') || norm.includes('assignee')
    )) {
      byUserCol = h;
    }
    // Latest Task Update Date / Completed Time detection
    if (!completedTimeCol && (
      norm.includes('latesttask') || norm.includes('updatedate') || norm.includes('completetime') ||
      norm.includes('endtime') || norm.includes('completeddate') || norm.includes('enddate') ||
      norm.includes('finishtime') || norm.includes('closedtime') || norm.includes('timestamp') ||
      norm.includes('date') || norm.includes('time') || norm.includes('เวลา') || norm.includes('วันที่')
    )) {
      completedTimeCol = h;
    }
    // Quantity detection
    if (!quantityCol && (
      norm.includes('qty') || norm.includes('quantity') || norm.includes('units') ||
      norm.includes('จำนวน') || norm.includes('pcs')
    )) {
      quantityCol = h;
    }
  }

  // Fallbacks if not detected
  if (!taskDescriptionCol && headers.length > 0) taskDescriptionCol = headers[0];
  if (!taskStatusCol && headers.length > 1) taskStatusCol = headers[1];
  if (!byUserCol && headers.length > 2) byUserCol = headers[2];
  if (!completedTimeCol && headers.length > 3) completedTimeCol = headers[3];

  return {
    taskDescriptionCol,
    taskStatusCol,
    byUserCol,
    completedTimeCol,
    quantityCol: quantityCol || undefined,
  };
}

// Convert various date/time formats into standardized { date: 'YYYY-MM-DD', hour: 0..23, timeStr: 'YYYY-MM-DD HH:mm:ss' }
export function parseDateTimeValue(val: unknown): { date: string; hour: number; timeStr: string } {
  if (val === undefined || val === null || val === '') {
    const today = new Date().toISOString().split('T')[0];
    return { date: today, hour: 8, timeStr: `${today} 08:00:00` };
  }

  // Excel serial number
  if (typeof val === 'number') {
    // Excel base date: Dec 30 1899
    const utcDays = Math.floor(val - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const fractionalDay = val - Math.floor(val) + 0.0000001;
    let totalSeconds = Math.floor(86400 * fractionalDay);
    const seconds = totalSeconds % 60;
    totalSeconds -= seconds;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const year = dateInfo.getFullYear();
    const month = String(dateInfo.getMonth() + 1).padStart(2, '0');
    const day = String(dateInfo.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${dateStr} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return { date: dateStr, hour: Math.max(0, Math.min(23, hours)), timeStr };
  }

  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    const hours = val.getHours();
    const mins = String(val.getMinutes()).padStart(2, '0');
    const secs = String(val.getSeconds()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return {
      date: dateStr,
      hour: hours,
      timeStr: `${dateStr} ${String(hours).padStart(2, '0')}:${mins}:${secs}`,
    };
  }

  const str = String(val).trim();

  // Try parsing Thai / DMY format like 26/10/2026 14:30 or 26-10-2026 14:30
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = parseInt(dmyMatch[3], 10);
    // Handle Buddhist Era if > 2500
    if (year > 2500) year -= 543;
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 8;
    const min = dmyMatch[5] || '00';
    const sec = dmyMatch[6] || '00';
    const dateStr = `${year}-${month}-${day}`;
    return {
      date: dateStr,
      hour: Math.max(0, Math.min(23, hour)),
      timeStr: `${dateStr} ${String(hour).padStart(2, '0')}:${min}:${sec}`,
    };
  }

  // Try parsing ISO or YMD format 2026-10-26 14:30
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    if (year > 2500) year -= 543;
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 8;
    const min = ymdMatch[5] || '00';
    const sec = ymdMatch[6] || '00';
    const dateStr = `${year}-${month}-${day}`;
    return {
      date: dateStr,
      hour: Math.max(0, Math.min(23, hour)),
      timeStr: `${dateStr} ${String(hour).padStart(2, '0')}:${min}:${sec}`,
    };
  }

  // Try time-only format like "14:30", "14:30:25", "2:30 PM", "9:00"
  const timeOnlyMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeOnlyMatch) {
    let hour = parseInt(timeOnlyMatch[1], 10);
    const min = timeOnlyMatch[2];
    const sec = timeOnlyMatch[3] || '00';
    const ampm = timeOnlyMatch[4]?.toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    const today = new Date().toISOString().split('T')[0];
    return {
      date: today,
      hour: Math.max(0, Math.min(23, hour)),
      timeStr: `${today} ${String(hour).padStart(2, '0')}:${min}:${sec}`,
    };
  }

  // Fallback native Date.parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hours = parsed.getHours();
    return {
      date: `${year}-${month}-${day}`,
      hour: hours,
      timeStr: str,
    };
  }

  // Fallback to today
  const today = new Date().toISOString().split('T')[0];
  return { date: today, hour: 9, timeStr: str };
}

// Check if status is Complete (handling variations, case-insensitivity, trim, and common WMS codes)
export function isStatusComplete(status: string): boolean {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  
  if (
    s === 'complete' ||
    s === 'completed' ||
    s === 'เสร็จสิ้น' ||
    s === 'เสร็จ' ||
    s === 'เรียบร้อย' ||
    s === 'สำเร็จ' ||
    s === 'ปิดงาน' ||
    s === 'done' ||
    s === 'success' ||
    s === 'finished' ||
    s === 'cmp' ||
    s === 'cmplt' ||
    s === '90' ||
    s === '99'
  ) {
    return true;
  }

  // Regex pattern matching word 'complete' or 'เสร็จ'
  if (/\b(complete|completed)\b/i.test(s) || s.includes('เสร็จสิ้น') || s.includes('สำเร็จ')) {
    return true;
  }

  return false;
}

// Parse Excel file into RP20RawRecord array
export async function parseExcelFile(
  file: File,
  customMapping?: Partial<ColumnMapping>
): Promise<{
  records: RP20RawRecord[];
  headers: string[];
  mapping: ColumnMapping;
  sheetNames: string[];
  activeSheet: string;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const sheetNames = workbook.SheetNames;
  // Pick sheet that contains RP20 or first sheet
  const activeSheet = sheetNames.find(s => s.toUpperCase().includes('RP20')) || sheetNames[0];
  const worksheet = workbook.Sheets[activeSheet];

  // Convert to JSON with raw values
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: true,
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('ไม่พบข้อมูลในไฟล์ Excel ที่เลือก');
  }

  const headers = Object.keys(rawRows[0]);
  const autoMap = detectColumnMapping(headers);
  const mapping: ColumnMapping = {
    ...autoMap,
    ...customMapping,
  };

  const records: RP20RawRecord[] = rawRows.map((row, idx) => {
    const taskDescription = String(row[mapping.taskDescriptionCol] ?? 'Unspecified').trim();
    const taskStatus = String(row[mapping.taskStatusCol] ?? 'Unknown').trim();
    const byUser = String(row[mapping.byUserCol] ?? 'Unassigned').trim();
    const rawTime = row[mapping.completedTimeCol];
    const { date, hour, timeStr } = parseDateTimeValue(rawTime);

    let qty: number | undefined = undefined;
    if (mapping.quantityCol && row[mapping.quantityCol] !== undefined) {
      const qVal = parseFloat(String(row[mapping.quantityCol]));
      if (!isNaN(qVal)) qty = qVal;
    }

    return {
      id: `rp20-${idx + 1}`,
      taskDescription: taskDescription || 'General Task',
      taskStatus: taskStatus || 'Unknown',
      byUser: byUser || 'Unknown User',
      completedTime: timeStr,
      completedDate: date,
      completedHour: hour,
      quantity: qty,
      originalRow: row,
    };
  });

  return {
    records,
    headers,
    mapping,
    sheetNames,
    activeSheet,
  };
}

// Export Matrix Data to CSV
export function exportMatrixToCSV(
  userSummaries: UserSummary[],
  hourlyProductivity: HourlyProductivity[],
  selectedDate: string
) {
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  
  // CSV Header with Morning Shift and Night Shift summaries
  const headers = ['By User', ...hours, 'กะเช้า (05:00-17:00)', 'กะดึก (18:00-04:00)', 'ยอดรวม (Total Complete)', 'เฉลี่ย/ชม. (Avg/Hr)'];
  const rows: (string | number)[][] = [];

  // Rows for each user
  for (const user of userSummaries) {
    const morningCount = user.hourlyCounts.slice(5, 17).reduce((a, b) => a + b, 0);
    const nightCount = user.hourlyCounts.slice(18, 24).reduce((a, b) => a + b, 0) + user.hourlyCounts.slice(0, 4).reduce((a, b) => a + b, 0);
    const row = [
      user.user,
      ...user.hourlyCounts,
      morningCount,
      nightCount,
      user.totalComplete,
      user.avgPerHour.toFixed(1),
    ];
    rows.push(row);
  }

  // Summary Row
  const totalMorning = hourlyProductivity.slice(5, 17).reduce((acc, h) => acc + h.count, 0);
  const totalNight = hourlyProductivity.slice(18, 24).reduce((acc, h) => acc + h.count, 0) + hourlyProductivity.slice(0, 4).reduce((acc, h) => acc + h.count, 0);
  const totalRow = [
    'รวมยอดงานทั้งหมด (Total)',
    ...hourlyProductivity.map(h => h.count),
    totalMorning,
    totalNight,
    hourlyProductivity.reduce((acc, h) => acc + h.count, 0),
    '-',
  ];
  rows.push(totalRow);

  // Cumulative Row
  const cumulativeRow = [
    'ยอดสะสม (Cumulative)',
    ...hourlyProductivity.map(h => h.cumulativeCount),
    '-',
    '-',
    hourlyProductivity.length > 0 ? hourlyProductivity[hourlyProductivity.length - 1].cumulativeCount : 0,
    '-',
  ];
  rows.push(cumulativeRow);

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel Thai support
    [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `RP20_Hourly_Matrix_${selectedDate || 'all'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export Matrix to Excel (.xlsx)
export function exportMatrixToExcel(
  userSummaries: UserSummary[],
  hourlyProductivity: HourlyProductivity[],
  selectedDate: string
) {
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  
  const data: Record<string, unknown>[] = userSummaries.map(u => {
    const morningCount = u.hourlyCounts.slice(5, 17).reduce((a, b) => a + b, 0);
    const nightCount = u.hourlyCounts.slice(18, 24).reduce((a, b) => a + b, 0) + u.hourlyCounts.slice(0, 4).reduce((a, b) => a + b, 0);

    const rowObj: Record<string, unknown> = {
      'พนักงาน (By User)': u.user,
    };
    hours.forEach((h, idx) => {
      rowObj[h] = u.hourlyCounts[idx];
    });
    rowObj['กะเช้า (05:00-17:00)'] = morningCount;
    rowObj['กะดึก (18:00-04:00)'] = nightCount;
    rowObj['ยอดรวม (Total)'] = u.totalComplete;
    rowObj['เฉลี่ย/ชม.'] = parseFloat(u.avgPerHour.toFixed(1));
    return rowObj;
  });

  const totalMorning = hourlyProductivity.slice(5, 17).reduce((acc, h) => acc + h.count, 0);
  const totalNight = hourlyProductivity.slice(18, 24).reduce((acc, h) => acc + h.count, 0) + hourlyProductivity.slice(0, 4).reduce((acc, h) => acc + h.count, 0);

  // Summary row
  const summaryRow: Record<string, unknown> = {
    'พนักงาน (By User)': '--- ยอดรวมทั้งหมด (Total Team) ---',
  };
  hours.forEach((h, idx) => {
    summaryRow[h] = hourlyProductivity[idx]?.count || 0;
  });
  summaryRow['กะเช้า (05:00-17:00)'] = totalMorning;
  summaryRow['กะดึก (18:00-04:00)'] = totalNight;
  summaryRow['ยอดรวม (Total)'] = hourlyProductivity.reduce((acc, h) => acc + h.count, 0);
  summaryRow['เฉลี่ย/ชม.'] = '';
  data.push(summaryRow);

  // Cumulative row
  const cumulativeRow: Record<string, unknown> = {
    'พนักงาน (By User)': '--- ยอดสะสมรายชั่วโมง (Cumulative) ---',
  };
  hours.forEach((h, idx) => {
    cumulativeRow[h] = hourlyProductivity[idx]?.cumulativeCount || 0;
  });
  cumulativeRow['กะเช้า (05:00-17:00)'] = '';
  cumulativeRow['กะดึก (18:00-04:00)'] = '';
  cumulativeRow['ยอดรวม (Total)'] = hourlyProductivity[23]?.cumulativeCount || 0;
  cumulativeRow['เฉลี่ย/ชม.'] = '';
  data.push(cumulativeRow);

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hourly Productivity Matrix');
  XLSX.writeFile(workbook, `RP20_Hourly_Matrix_${selectedDate || 'all'}.xlsx`);
}

// Generate a downloadable sample RP20 Excel file for the user to download
export function generateSampleRP20Excel(records: RP20RawRecord[]) {
  const excelData = records.map((r, i) => ({
    'Task ID': `TSK-2026-${String(i + 1).padStart(5, '0')}`,
    'Task Description': r.taskDescription,
    'Task Status': r.taskStatus,
    'By User': r.byUser,
    'Latest Task Update Date': r.completedTime,
    'Quantity': r.quantity || 1,
    'Zone': `Zone-${String.fromCharCode(65 + (i % 5))}`,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'RP20_Tasks_Report');
  XLSX.writeFile(workbook, 'RP20_Sample_Template.xlsx');
}
