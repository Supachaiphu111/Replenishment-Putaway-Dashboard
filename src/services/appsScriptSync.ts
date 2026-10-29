import { RP20RawRecord } from '../types/rp20';

const STORAGE_KEY_APPS_SCRIPT_URL = 'rp20_appscript_webhook_url';
const STORAGE_KEY_AUTO_SYNC = 'rp20_appscript_auto_sync_enabled';

export function getSavedAppsScriptUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_APPS_SCRIPT_URL) || '';
  } catch {
    return '';
  }
}

export function saveAppsScriptUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_APPS_SCRIPT_URL, url.trim());
  } catch (err) {
    console.warn('Failed to save Apps Script URL:', err);
  }
}

export function isAutoSyncEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_AUTO_SYNC) === 'true';
  } catch {
    return false;
  }
}

export function setAutoSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTO_SYNC, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('Failed to set auto-sync preference:', err);
  }
}

/**
 * Test connectivity to the Apps Script Web App URL via GET
 */
export async function testAppsScriptConnection(
  webAppUrl: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const url = webAppUrl.trim();
  if (!url) {
    return { success: false, error: 'กรุณาระบุ URL ของ Apps Script Web App' };
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP Error status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (err: any) {
    // Note: If CORS blocks GET reading, try sending a dummy ping via POST with mode no-cors
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'PING' }),
      });
      return {
        success: true,
        data: { status: 'connected (no-cors)', message: 'เชื่อมต่อ Webhook สำเร็จ' },
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        error: err.message || 'ไม่สามารถติดต่อ Apps Script Web App ได้ กรุณาตรวจสอบ URL หรือสิทธิ์การเข้าถึงเป็น "ทุกคน (Anyone)"',
      };
    }
  }
}

/**
 * Send a single RP20 task to the Google Sheet via Apps Script Web App
 */
export async function syncTaskToAppsScript(
  webAppUrl: string,
  task: RP20RawRecord
): Promise<{ success: boolean; error?: string }> {
  const url = webAppUrl.trim();
  if (!url) return { success: false, error: 'No Apps Script URL configured' };

  try {
    const payload = {
      action: 'ADD_TASK',
      task: {
        id: task.id,
        taskDescription: task.taskDescription,
        taskStatus: task.taskStatus,
        byUser: task.byUser,
        completedTime: task.completedTime,
        quantity: task.quantity || 1,
        completedDate: task.completedDate,
        completedHour: task.completedHour,
        location: task.location || '',
      },
    };

    // Google Apps Script requires text/plain to avoid CORS preflight issues
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync task to Apps Script:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a batch of RP20 records to the Google Sheet via Apps Script Web App
 */
export async function syncBatchToAppsScript(
  webAppUrl: string,
  records: RP20RawRecord[],
  mode: 'APPEND' | 'OVERWRITE' = 'APPEND'
): Promise<{ success: boolean; error?: string }> {
  const url = webAppUrl.trim();
  if (!url) return { success: false, error: 'กรุณาระบุ URL ของ Apps Script Web App' };

  try {
    const payload = {
      action: 'BATCH_IMPORT',
      mode,
      records: records.map(r => ({
        id: r.id,
        taskDescription: r.taskDescription,
        taskStatus: r.taskStatus,
        byUser: r.byUser,
        completedTime: r.completedTime,
        quantity: r.quantity || 1,
        completedDate: r.completedDate,
        completedHour: r.completedHour,
        location: r.location || '',
      })),
    };

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync batch to Apps Script:', err);
    return { success: false, error: err.message };
  }
}
