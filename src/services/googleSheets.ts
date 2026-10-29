import { ColumnMapping, RP20RawRecord, HourlyProductivity, UserSummary } from '../types/rp20';
import { detectColumnMapping, parseDateTimeValue } from '../utils/excelParser';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: SheetTabInfo[];
  spreadsheetUrl?: string;
}

// 1. List user spreadsheets from Google Drive
export async function listSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=30`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
  }));
}

// 2. Fetch Spreadsheet Metadata (Title and Sheets/Tabs)
export async function getSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetMetadata> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const title = data.properties?.title || 'Google Spreadsheet';
  const sheets: SheetTabInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId,
    title: s.properties?.title,
    rowCount: s.properties?.gridProperties?.rowCount,
    columnCount: s.properties?.gridProperties?.columnCount,
  }));

  return {
    spreadsheetId: cleanId,
    title,
    sheets,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
  };
}

// 3. Fetch all values from a specific tab/sheet
export async function fetchSheetValues(
  spreadsheetId: string,
  sheetTitle: string,
  accessToken: string
): Promise<any[][]> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const range = `'${sheetTitle.replace(/'/g, "''")}'!A1:ZZ10000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets Read Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.values || [];
}

// 4. Parse Google Sheets 2D array into RP20RawRecord[]
export function parseSheetRowsToRP20(
  rawValues: any[][]
): {
  records: RP20RawRecord[];
  headers: string[];
  mapping: ColumnMapping;
} {
  if (!rawValues || rawValues.length === 0) {
    throw new Error('แผ่นงาน (Sheet) นี้ไม่มีข้อมูล');
  }

  // Row 0 is the headers
  const headerRow = rawValues[0].map(h => String(h || '').trim());
  const headers = headerRow.map((h, i) => (h ? h : `Col_${i + 1}`));

  if (rawValues.length < 2) {
    throw new Error('พบเฉพาะแถวส่วนหัว (Header) แต่ไม่มีแถวข้อมูลงาน RP20 ในชีตนี้');
  }

  const mapping = detectColumnMapping(headers);

  const descIdx = headers.indexOf(mapping.taskDescriptionCol);
  const statusIdx = headers.indexOf(mapping.taskStatusCol);
  const userIdx = headers.indexOf(mapping.byUserCol);
  const timeIdx = headers.indexOf(mapping.completedTimeCol);
  const qtyIdx = mapping.quantityCol ? headers.indexOf(mapping.quantityCol) : -1;

  const records: RP20RawRecord[] = [];

  for (let r = 1; r < rawValues.length; r++) {
    const row = rawValues[r];
    if (!row || row.length === 0) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = row[colIdx] ?? '';
    });

    const taskDesc = descIdx >= 0 && row[descIdx] !== undefined ? String(row[descIdx]).trim() : '';
    const taskStatus = statusIdx >= 0 && row[statusIdx] !== undefined ? String(row[statusIdx]).trim() : 'Complete';
    const byUser = userIdx >= 0 && row[userIdx] !== undefined ? String(row[userIdx]).trim() : 'Operator';
    const timeVal = timeIdx >= 0 ? row[timeIdx] : '';

    // Ignore completely empty rows
    if (!taskDesc && !byUser && !timeVal) continue;

    const parsedTime = parseDateTimeValue(timeVal);

    let quantity = 1;
    if (qtyIdx >= 0 && row[qtyIdx] !== undefined) {
      const parsedQty = parseFloat(String(row[qtyIdx]).replace(/,/g, ''));
      if (!isNaN(parsedQty) && parsedQty > 0) {
        quantity = parsedQty;
      }
    }

    records.push({
      id: rowObj['Task ID'] || rowObj['TaskID'] || rowObj['ID'] || `GS-${r}-${Math.random().toString(36).substring(2, 7)}`,
      taskDescription: taskDesc || 'Task Operation',
      taskStatus: taskStatus || 'Complete',
      byUser: byUser || 'Operator',
      completedTime: parsedTime.timeStr,
      completedDate: parsedTime.date,
      completedHour: parsedTime.hour,
      quantity,
      location: rowObj['Location'] || rowObj['From Location'] || rowObj['To Location'] || undefined,
      originalRow: rowObj,
    });
  }

  if (records.length === 0) {
    throw new Error('ไม่พบข้อมูลงานที่สามารถแปลงเป็น RP20 Records ได้');
  }

  return { records, headers, mapping };
}

// 5. Create a new Google Spreadsheet with current RP20 analytics
export async function createRP20Spreadsheet(
  title: string,
  records: RP20RawRecord[],
  hourlyData: HourlyProductivity[],
  userSummaries: UserSummary[],
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // Step A: Create Spreadsheet Container
  const createPayload = {
    properties: {
      title: title || `RP20_WMS_Report_${new Date().toISOString().slice(0, 10)}`,
    },
    sheets: [
      { properties: { title: 'RP20_Tasks_Data' } },
      { properties: { title: 'Hourly_Productivity_24H' } },
      { properties: { title: 'Operator_Leaderboard' } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errorText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;

  // Step B: Prepare data rows for each sheet
  // 1. RP20 Tasks Data
  const tasksHeader = [
    'Task ID',
    'Task Description',
    'Task Status',
    'By User',
    'Latest Task Update Date',
    'Quantity',
    'Completed Date',
    'Completed Hour',
    'Location',
  ];
  const tasksValues = [
    tasksHeader,
    ...records.map(r => [
      r.id,
      r.taskDescription,
      r.taskStatus,
      r.byUser,
      r.completedTime,
      r.quantity || 1,
      r.completedDate,
      `${String(r.completedHour).padStart(2, '0')}:00`,
      r.location || '',
    ]),
  ];

  // 2. Hourly 24H Summary
  const hourlyHeader = ['Hour (ช่วงเวลา)', 'Completed Tasks (ยอดงานเสร็จ)', 'Cumulative Tasks (ยอดสะสม)', 'Active Users (จน. พนักงาน)'];
  const hourlyValues = [
    hourlyHeader,
    ...hourlyData.map(h => [
      h.label,
      h.count,
      h.cumulativeCount,
      h.usersActive,
    ]),
  ];

  // 3. Operator Leaderboard (Top operators)
  const operatorHeader = ['Operator (พนักงาน)', 'Total Complete (ยอดรวม)', 'Peak Hour (ชม. พีค)', 'Peak Volume (ยอดสูงสุด/ชม)', 'Avg Per Hour (เฉลี่ย/ชม)'];
  const sortedOperators = [...userSummaries].sort((a, b) => b.totalComplete - a.totalComplete);
  const operatorValues = [
    operatorHeader,
    ...sortedOperators.map(o => [
      o.user,
      o.totalComplete,
      `${String(o.peakHour).padStart(2, '0')}:00`,
      o.peakVolume,
      Math.round(o.avgPerHour * 10) / 10,
    ]),
  ];

  // Step C: Batch update values into the new sheets
  const updatePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'RP20_Tasks_Data'!A1",
        values: tasksValues,
      },
      {
        range: "'Hourly_Productivity_24H'!A1",
        values: hourlyValues,
      },
      {
        range: "'Operator_Leaderboard'!A1",
        values: operatorValues,
      },
    ],
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    }
  );

  if (!updateRes.ok) {
    const errorText = await updateRes.text();
    console.warn('Batch update values warning:', errorText);
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

// 6. Append records to an existing Google Spreadsheet
export async function appendRecordsToSheet(
  spreadsheetId: string,
  sheetTitle: string,
  records: RP20RawRecord[],
  accessToken: string
): Promise<{ updatedRows: number }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const rows = records.map(r => [
    r.id,
    r.taskDescription,
    r.taskStatus,
    r.byUser,
    r.completedTime,
    r.quantity || 1,
    r.completedDate,
    r.completedHour,
  ]);

  const range = `'${sheetTitle.replace(/'/g, "''")}'!A:H`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: rows }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to append to Google Sheet: ${errorText}`);
  }

  const data = await res.json();
  return { updatedRows: data.updates?.updatedRows || rows.length };
}

// Helper to extract sheet ID from raw ID or full Google Sheets URL
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    return match[1];
  }
  return trimmed;
}
