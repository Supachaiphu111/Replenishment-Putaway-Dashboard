import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Upload,
  ArrowRight,
  Database,
  Layers,
  Clock,
  Sparkles,
  ShieldCheck,
  Check,
  Code2,
  Copy,
  Send,
  Zap,
  BookOpen,
  Terminal,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  listSpreadsheets,
  getSpreadsheetMetadata,
  fetchSheetValues,
  parseSheetRowsToRP20,
  createRP20Spreadsheet,
  appendRecordsToSheet,
  DriveSpreadsheetFile,
  SpreadsheetMetadata,
} from '../services/googleSheets';
import { googleSignIn, logout, getAccessToken } from '../services/googleAuth';
import { RP20RawRecord, HourlyProductivity, UserSummary, ColumnMapping } from '../types/rp20';
import { APPS_SCRIPT_CODE, APPS_SCRIPT_INSTRUCTIONS } from '../utils/appsScriptTemplate';
import {
  getSavedAppsScriptUrl,
  saveAppsScriptUrl,
  isAutoSyncEnabled,
  setAutoSyncEnabled,
  testAppsScriptConnection,
  syncBatchToAppsScript,
} from '../services/appsScriptSync';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  onImportComplete: (
    records: RP20RawRecord[],
    headers: string[],
    mapping: ColumnMapping,
    sheetName: string,
    spreadsheetTitle: string
  ) => void;
  currentRecords: RP20RawRecord[];
  hourlyProductivity: HourlyProductivity[];
  userSummaries: UserSummary[];
  isDarkMode?: boolean;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  onImportComplete,
  currentRecords,
  hourlyProductivity,
  userSummaries,
  isDarkMode = true,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'appsscript'>('import');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Files & metadata state
  const [files, setFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<DriveSpreadsheetFile | null>(null);
  const [manualSheetInput, setManualSheetInput] = useState('');

  // Selected spreadsheet metadata & sheets
  const [metaLoading, setMetaLoading] = useState(false);
  const [metadata, setMetadata] = useState<SpreadsheetMetadata | null>(null);
  const [selectedSheetTab, setSelectedSheetTab] = useState<string>('');

  // Sheet data preview
  const [previewLoading, setPreviewLoading] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<{
    records: RP20RawRecord[];
    headers: string[];
    mapping: ColumnMapping;
  } | null>(null);

  // Export state
  const [exportTitle, setExportTitle] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return `RP20_WMS_Report_${today}`;
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessUrl, setExportSuccessUrl] = useState<string | null>(null);

  // Apps Script & Webhook Sync State
  const [copiedCode, setCopiedCode] = useState(false);
  const [appsScriptUrl, setAppsScriptUrl] = useState(() => getSavedAppsScriptUrl());
  const [autoSync, setAutoSync] = useState(() => isAutoSyncEnabled());
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    message: string | null;
    isSuccess?: boolean;
  }>({ loading: false, message: null });
  const [batchSyncStatus, setBatchSyncStatus] = useState<{
    loading: boolean;
    message: string | null;
    isSuccess?: boolean;
  }>({ loading: false, message: null });

  // Confirmation Dialog state for mutating operations
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load drive spreadsheets when user is authenticated & modal is open
  useEffect(() => {
    if (isOpen && currentUser && activeTab !== 'appsscript') {
      loadUserSpreadsheets();
    }
  }, [isOpen, currentUser, activeTab]);

  const loadUserSpreadsheets = async () => {
    setIsLoadingFiles(true);
    setFeedbackMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('กรุณาลงชื่อเข้าใช้ด้วย Google ก่อน');
      }
      const list = await listSpreadsheets(token);
      setFiles(list);
    } catch (err: any) {
      console.error('Error fetching spreadsheets:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'ไม่สามารถดึงรายชื่อ Google Sheets ได้',
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        onUserChange(res.user);
        const list = await listSpreadsheets(res.accessToken);
        setFiles(list);
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setAuthError(err.message || 'การเข้าสู่ระบบ Google ล้มเหลว');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      onUserChange(null);
      setFiles([]);
      setSelectedFile(null);
      setMetadata(null);
      setParsedPreview(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const handleSelectFile = async (file: DriveSpreadsheetFile) => {
    setSelectedFile(file);
    setMetadata(null);
    setParsedPreview(null);
    setFeedbackMessage(null);
    setMetaLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Token expired, please sign in again');
      const meta = await getSpreadsheetMetadata(file.id, token);
      setMetadata(meta);
      if (meta.sheets.length > 0) {
        const defaultTab = meta.sheets[0].title;
        setSelectedSheetTab(defaultTab);
        await previewSheetTab(file.id, defaultTab);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `ไม่สามารถอ่านข้อมูลชีต: ${err.message}`,
      });
    } finally {
      setMetaLoading(false);
    }
  };

  const handleManualLookup = async () => {
    if (!manualSheetInput.trim()) return;
    setMetaLoading(true);
    setFeedbackMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('กรุณาลงชื่อเข้าใช้ด้วย Google');
      const meta = await getSpreadsheetMetadata(manualSheetInput, token);
      setSelectedFile({
        id: meta.spreadsheetId,
        name: meta.title,
        modifiedTime: new Date().toISOString(),
        webViewLink: meta.spreadsheetUrl,
      });
      setMetadata(meta);
      if (meta.sheets.length > 0) {
        setSelectedSheetTab(meta.sheets[0].title);
        await previewSheetTab(meta.spreadsheetId, meta.sheets[0].title);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `ไม่พบ Google Spreadsheet ตามที่ระบุ: ${err.message}`,
      });
    } finally {
      setMetaLoading(false);
    }
  };

  const previewSheetTab = async (spreadsheetId: string, sheetTitle: string) => {
    setPreviewLoading(true);
    setFeedbackMessage(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Session expired');
      const values = await fetchSheetValues(spreadsheetId, sheetTitle, token);
      const parsed = parseSheetRowsToRP20(values);
      setParsedPreview(parsed);
    } catch (err: any) {
      setParsedPreview(null);
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'ไม่สามารถแยกวิเคราะห์คอลัมน์จากแผ่นงานนี้ได้',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleTabChange = async (tabName: string) => {
    setSelectedSheetTab(tabName);
    if (selectedFile) {
      await previewSheetTab(selectedFile.id, tabName);
    }
  };

  // Perform import into the application state
  const handleExecuteImport = () => {
    if (!parsedPreview || !selectedFile) return;
    onImportComplete(
      parsedPreview.records,
      parsedPreview.headers,
      parsedPreview.mapping,
      selectedSheetTab,
      selectedFile.name
    );
    onClose();
  };

  // Trigger export flow with MANDATORY user confirmation dialog
  const promptCreateSpreadsheet = () => {
    if (!currentUser) {
      setFeedbackMessage({ type: 'error', text: 'กรุณาลงชื่อเข้าใช้ด้วย Google ก่อนทำการส่งออก' });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการสร้าง Google Spreadsheet ใหม่',
      description: `ระบบจะสร้าง Google Spreadsheet ใหม่ในบัญชี Google Drive (${currentUser.email || 'ของคุณ'}) ชื่อ "${exportTitle}" โดยจะส่งออกข้อมูลงานสถานะ Complete (${currentRecords.length} รายการ), สรุปรายชั่วโมง 24 ชม., และอันดับพนักงาน คุณต้องการดำเนินการต่อหรือไม่?`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        await executeCreateSpreadsheet();
      },
    });
  };

  const executeCreateSpreadsheet = async () => {
    setIsExporting(true);
    setFeedbackMessage(null);
    setExportSuccessUrl(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('ไม่พบสิทธิ์การเข้าถึง Google Drive');
      const result = await createRP20Spreadsheet(
        exportTitle,
        currentRecords,
        hourlyProductivity,
        userSummaries,
        token
      );
      setExportSuccessUrl(result.spreadsheetUrl);
      setFeedbackMessage({
        type: 'success',
        text: `สร้าง Google Spreadsheet สำเร็จเรียบร้อย!`,
      });
      loadUserSpreadsheets();
    } catch (err: any) {
      console.error('Export error:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการสร้าง Google Spreadsheet',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Apps Script Code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (err) {
      console.warn('Clipboard copy error:', err);
    }
  };

  // Save Apps Script Web App URL and toggle
  const handleSaveUrl = () => {
    saveAppsScriptUrl(appsScriptUrl);
    setTestStatus({
      loading: false,
      message: 'บันทึก Web App URL เรียบร้อยแล้ว',
      isSuccess: true,
    });
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSync(enabled);
    setAutoSyncEnabled(enabled);
  };

  // Test connection to Apps Script Web App
  const handleTestConnection = async () => {
    if (!appsScriptUrl.trim()) {
      setTestStatus({ loading: false, message: 'กรุณาระบุ Web App URL ก่อนทดสอบ', isSuccess: false });
      return;
    }
    setTestStatus({ loading: true, message: 'กำลังทดสอบเชื่อมต่อ Webhook...' });
    saveAppsScriptUrl(appsScriptUrl);
    const res = await testAppsScriptConnection(appsScriptUrl);
    if (res.success) {
      setTestStatus({
        loading: false,
        message: 'เชื่อมต่อ Google Apps Script Webhook สำเร็จ พร้อมจัดเก็บข้อมูล!',
        isSuccess: true,
      });
    } else {
      setTestStatus({
        loading: false,
        message: res.error || 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบ URL',
        isSuccess: false,
      });
    }
  };

  // Batch sync all current records to Apps Script
  const promptBatchSync = () => {
    if (!appsScriptUrl.trim()) {
      setBatchSyncStatus({ loading: false, message: 'กรุณาระบุ Apps Script Web App URL ก่อนส่งข้อมูล', isSuccess: false });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการส่งข้อมูลไปยัง Google Sheet ผ่าน Apps Script',
      description: `ระบบจะส่งข้อมูลงานสถานะ Complete จำนวน ${currentRecords.length.toLocaleString()} รายการไปยัง Google Sheet ผ่าน Apps Script Webhook คุณต้องการดำเนินการต่อหรือไม่?`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        await executeBatchSync();
      },
    });
  };

  const executeBatchSync = async () => {
    setBatchSyncStatus({ loading: true, message: 'กำลังส่งข้อมูลไปยัง Google Sheet...' });
    saveAppsScriptUrl(appsScriptUrl);
    const res = await syncBatchToAppsScript(appsScriptUrl, currentRecords, 'APPEND');
    if (res.success) {
      setBatchSyncStatus({
        loading: false,
        message: `ส่งข้อมูล ${currentRecords.length.toLocaleString()} รายการเข้า Google Sheet สำเร็จแล้ว!`,
        isSuccess: true,
      });
    } else {
      setBatchSyncStatus({
        loading: false,
        message: res.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล',
        isSuccess: false,
      });
    }
  };

  if (!isOpen) return null;

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDarkMode
            ? 'liquid-glass-dark liquid-rim-glow border-white/15 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
            : 'liquid-glass-light liquid-rim-glow border-white/80 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDarkMode ? 'border-white/10 bg-slate-950/40' : 'border-slate-200/80 bg-white/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Google Sheets &amp; Apps Script Integration
                </h2>
                <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Google Workspace
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                ดึงข้อมูล RP20, ส่งออกรายงาน WMS หรือสร้าง Apps Script เพื่อจัดเก็บข้อมูลอัตโนมัติ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User status */}
            {currentUser ? (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
                  isDarkMode
                    ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google User'}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="font-medium max-w-[140px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="ml-1 text-[11px] text-red-400 hover:text-red-300 underline cursor-pointer"
                >
                  ออก
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isLoadingAuth}
                className="gsi-material-button inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <div className="w-4 h-4 shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                  </svg>
                </div>
                <span>{isLoadingAuth ? 'กำลังเข้าสู่ระบบ...' : 'Sign in with Google'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className={`flex border-b px-6 overflow-x-auto ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'import'
                ? isDarkMode
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>นำเข้าข้อมูลจาก Google Sheets (Import)</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'export'
                ? isDarkMode
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>ส่งออกไปยัง Google Sheets (Export / Sync)</span>
          </button>
          <button
            onClick={() => setActiveTab('appsscript')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'appsscript'
                ? isDarkMode
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-cyan-600 text-cyan-700'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>สร้างตัว Apps Script จัดเก็บข้อมูล (Automation)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              ใหม่
            </span>
          </button>
        </div>

        {/* Feedback Alert Banner */}
        {feedbackMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/40 border border-emerald-800/80 text-emerald-300'
                : 'bg-red-950/40 border border-red-800/80 text-red-300'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span className="flex-1">{feedbackMessage.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 3: APPS SCRIPT CODE & WEBHOOK AUTOMATION */}
          {activeTab === 'appsscript' ? (
            <div className="space-y-6">
              
              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className={`p-4 rounded-xl border ${
                  isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 mb-1">
                    จัดเก็บข้อมูล 3 แผ่นงานอัตโนมัติ
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    สร้างแท็บ RP20_Tasks_Data, Hourly_24H_Summary, และ Operator_Leaderboard ให้ทันทีพร้อมตรึงหัวตาราง
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 mb-1">
                    Webhook รับงานแบบ Real-time
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    รองรับ doPost เพื่อรับงานที่บันทึกจากหน้าเว็บเข้ามาต่อท้ายชีตโดยตรง และคำนวณยอด 24 ชม. ทันที
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-emerald-500/30 flex items-center justify-center text-amber-400 mb-2">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 mb-1">
                    เมนูพิเศษบน Google Sheets
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    มีเมนู "🚀 RP20 WMS เมนู" ในชีต ให้กดคำนวณรายชั่วโมงหรืออัปเดต Leaderboard ได้ตลอดเวลา
                  </p>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className={`p-4 rounded-xl border ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>ขั้นตอนการนำ Apps Script ไปติดตั้งใน Google Sheets</span>
                </h3>
                <div className="space-y-2.5">
                  {APPS_SCRIPT_INSTRUCTIONS.map((step) => (
                    <div key={step.step} className="flex items-start gap-3 text-xs">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/40">
                        {step.step}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200 block">
                          {step.title}
                        </span>
                        <span className={`text-[11px] leading-relaxed ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          {step.detail}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Box with Copy Button */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/80">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-semibold text-slate-300">
                      Code.gs (Google Apps Script สำหรับจัดเก็บข้อมูล RP20)
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-xs cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>คัดลอกโค้ดแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกโค้ด Apps Script</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-64 leading-relaxed selection:bg-emerald-800">
                  {APPS_SCRIPT_CODE}
                </pre>
              </div>

              {/* Webhook Configuration & Sync HUD */}
              <div className={`p-5 rounded-xl border ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                  <Send className="w-4 h-4 text-cyan-400" />
                  <span>เชื่อมต่อ Webhook กับ Apps Script Web App (สำหรับ Real-time Sync)</span>
                </h3>
                <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  นำ URL ที่ได้จากการ Deploy เว็บแอป (ลงท้ายด้วย <code>/exec</code>) มาใส่ที่นี่ เพื่อให้ระบบส่งงานที่บันทึกแบบ Real-time เข้า Google Sheet ทันที
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Apps Script Web App URL:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={appsScriptUrl}
                        onChange={(e) => setAppsScriptUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                        className={`flex-1 px-3 py-2 text-xs rounded-lg border font-mono ${
                          isDarkMode
                            ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                      <button
                        onClick={handleSaveUrl}
                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                      >
                        บันทึก URL
                      </button>
                      <button
                        onClick={handleTestConnection}
                        disabled={testStatus.loading}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {testStatus.loading ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
                      </button>
                    </div>
                  </div>

                  {/* Status test feedback */}
                  {testStatus.message && (
                    <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      testStatus.isSuccess
                        ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                        : 'bg-red-950/40 border border-red-800 text-red-300'
                    }`}>
                      {testStatus.isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      )}
                      <span>{testStatus.message}</span>
                    </div>
                  )}

                  {/* Auto Sync Toggle */}
                  <div className="pt-2 flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSync}
                        onChange={(e) => handleToggleAutoSync(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      <span className={`ml-3 text-xs font-semibold ${
                        isDarkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        ซิงค์อัตโนมัติเมื่อมีการเพิ่มงานใหม่แบบ Real-time (Auto-sync Live Tasks)
                      </span>
                    </label>
                  </div>

                  {/* Batch Sync Button */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-400">
                      ส่งข้อมูลสถานะ Complete ทั้งหมดในแดชบอร์ด ({currentRecords.length.toLocaleString()} รายการ) เข้า Google Sheet ทันที
                    </span>
                    <button
                      onClick={promptBatchSync}
                      disabled={batchSyncStatus.loading || !appsScriptUrl.trim()}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{batchSyncStatus.loading ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูลชุดปัจจุบันเข้าชีต (Batch Sync)'}</span>
                    </button>
                  </div>

                  {batchSyncStatus.message && (
                    <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      batchSyncStatus.isSuccess
                        ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                        : 'bg-red-950/40 border border-red-800 text-red-300'
                    }`}>
                      {batchSyncStatus.isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      )}
                      <span>{batchSyncStatus.message}</span>
                    </div>
                  )}

                </div>
              </div>

            </div>
          ) : !currentUser ? (
            /* Prompt to Login for Import & Export tabs */
            <div className={`p-8 text-center rounded-xl border ${
              isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold mb-1">
                เชื่อมต่อบัญชี Google ของคุณเพื่อใช้งาน Google Sheets
              </h3>
              <p className={`text-xs max-w-md mx-auto mb-5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                เข้าถึง Google Spreadsheets ใน Google Drive ของคุณโดยตรงเพื่อดึงข้อมูลรายงาน RP20 และบันทึก/ส่งออกแดชบอร์ด WMS
              </p>
              <button
                onClick={handleSignIn}
                disabled={isLoadingAuth}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <div className="w-4 h-4 bg-white rounded-full p-0.5 flex items-center justify-center">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
                <span>{isLoadingAuth ? 'กำลังเชื่อมต่อ...' : 'ลงชื่อเข้าใช้ด้วย Google'}</span>
              </button>
            </div>
          ) : activeTab === 'import' ? (
            /* Tab 1: Import Flow */
            <div className="space-y-6">
              
              {/* Manual URL / ID input bar */}
              <div className={`p-4 rounded-xl border ${
                isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <label className={`block text-xs font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  วางลิงก์ Google Sheets URL หรือ Spreadsheet ID โดยตรง
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualSheetInput}
                    onChange={(e) => setManualSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit หรือ Spreadsheet ID"
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border font-mono ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    onClick={handleManualLookup}
                    disabled={metaLoading || !manualSheetInput.trim()}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {metaLoading ? 'กำลังโหลด...' : 'ค้นหาชีต'}
                  </button>
                </div>
              </div>

              {/* Browse Recent Spreadsheets from Drive */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Google Spreadsheets ล่าสุดใน Drive
                    </h3>
                    <span className="text-[11px] font-mono-numbers px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {filteredFiles.length} ไฟล์
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อไฟล์..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`pl-8 pr-3 py-1.5 text-xs rounded-lg border ${
                          isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-200'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                    <button
                      onClick={loadUserSpreadsheets}
                      disabled={isLoadingFiles}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                      }`}
                      title="รีเฟรชรายชื่อไฟล์"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {isLoadingFiles ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-emerald-400" />
                    กำลังค้นหา Google Spreadsheets จาก Google Drive...
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className={`p-6 text-center rounded-xl border text-xs text-slate-400 ${
                    isDarkMode ? 'border-slate-800 bg-slate-950/20' : 'border-slate-200 bg-slate-50'
                  }`}>
                    ไม่พบ Google Spreadsheets ในบัญชี หรือลองวางลิงก์ชีตในช่องด้านบน
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                    {filteredFiles.map((file) => {
                      const isSelected = selectedFile?.id === file.id;
                      const dateStr = new Date(file.modifiedTime).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <div
                          key={file.id}
                          onClick={() => handleSelectFile(file)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                            isSelected
                              ? isDarkMode
                                ? 'bg-emerald-950/30 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/50'
                                : 'bg-emerald-50 border-emerald-500 shadow-xs'
                              : isDarkMode
                              ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <FileSpreadsheet
                              className={`w-5 h-5 shrink-0 mt-0.5 ${
                                isSelected ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            />
                            <div className="min-w-0">
                              <h4
                                className={`text-xs font-semibold truncate ${
                                  isSelected
                                    ? 'text-emerald-400'
                                    : isDarkMode
                                    ? 'text-slate-200'
                                    : 'text-slate-800'
                                }`}
                              >
                                {file.name}
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5 font-mono-numbers">
                                แก้ไขล่าสุด: {dateStr}
                              </p>
                            </div>
                          </div>
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-emerald-400 p-1"
                              title="เปิดดูใน Google Sheets"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 2: Tab Selection & Data Preview */}
              {metadata && (
                <div className={`p-4 rounded-xl border space-y-4 ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                        เลือกแผ่นงาน (Sheet Tab)
                      </span>
                      <h4 className="text-xs font-bold text-slate-200">
                        {metadata.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {metadata.sheets.map((sheet) => (
                        <button
                          key={sheet.title}
                          onClick={() => handleTabChange(sheet.title)}
                          className={`px-3 py-1 text-xs rounded-lg font-medium border transition-colors cursor-pointer ${
                            selectedSheetTab === sheet.title
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                              : isDarkMode
                              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {sheet.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview of Columns & Rows */}
                  {previewLoading ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      <RefreshCw className="w-4 h-4 mx-auto animate-spin mb-1 text-emerald-400" />
                      กำลังอ่านและวิเคราะห์คอลัมน์จากแผ่นงาน "{selectedSheetTab}"...
                    </div>
                  ) : parsedPreview ? (
                    <div className="space-y-3 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          วิเคราะห์พบข้อมูล:{' '}
                          <span className="font-mono-numbers font-semibold text-emerald-400">
                            {parsedPreview.records.length.toLocaleString()} รายการ
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          (Task Status Complete:{' '}
                          <strong className="text-emerald-400 font-mono-numbers">
                            {parsedPreview.records.filter(r => r.taskStatus.toLowerCase() === 'complete').length}
                          </strong>
                          )
                        </span>
                      </div>

                      {/* Detected Column Badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Task Description:</span>
                          <span className="font-mono text-emerald-400 font-semibold truncate block">
                            {parsedPreview.mapping.taskDescriptionCol}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Task Status:</span>
                          <span className="font-mono text-emerald-400 font-semibold truncate block">
                            {parsedPreview.mapping.taskStatusCol}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">By User:</span>
                          <span className="font-mono text-emerald-400 font-semibold truncate block">
                            {parsedPreview.mapping.byUserCol}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Latest Task Update Date:</span>
                          <span className="font-mono text-emerald-400 font-semibold truncate block">
                            {parsedPreview.mapping.completedTimeCol}
                          </span>
                        </div>
                      </div>

                      {/* Action Import Button */}
                      <div className="pt-3 flex justify-end">
                        <button
                          onClick={handleExecuteImport}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>นำเข้าข้อมูล RP20 นี้สู่แดชบอร์ดทันที</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

            </div>
          ) : (
            /* Tab 2: Export Flow */
            <div className="space-y-6">
              
              <div className={`p-5 rounded-xl border ${
                isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-emerald-400">
                  <PlusCircle className="w-4 h-4" />
                  สร้าง Google Spreadsheet ใหม่ใน Google Drive
                </h3>
                <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  ระบบจะสร้าง Google Spreadsheet ใหม่ใน Google Drive พร้อมแผ่นงานแยกชัดเจนสำหรับข้อมูลงาน RP20, ตารางสรุปยอดงานรายชั่วโมง (24 ชม.), และตารางจัดอันดับพนักงาน
                </p>

                <div className="space-y-3 max-w-lg mb-5">
                  <label className="block text-xs font-semibold text-slate-300">
                    ชื่อไฟล์ Google Spreadsheet:
                  </label>
                  <input
                    type="text"
                    value={exportTitle}
                    onChange={(e) => setExportTitle(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg border font-mono ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-slate-100'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Sheets breakdown plan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="font-semibold text-emerald-400 block mb-1">
                      1. RP20_Tasks_Data
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      ข้อมูลงานทั้งหมด {currentRecords.length.toLocaleString()} แถว พร้อมเวลาและสถานะ
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="font-semibold text-cyan-400 block mb-1">
                      2. Hourly_Productivity_24H
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      ยอดงานรายชั่วโมง 00:00 - 23:00 น. และยอดสะสม
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="font-semibold text-amber-400 block mb-1">
                      3. Operator_Leaderboard
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      สรุปผลงานพนักงาน {userSummaries.length} คน พร้อมชั่วโมงพีคและค่าเฉลี่ย
                    </span>
                  </div>
                </div>

                <button
                  onClick={promptCreateSpreadsheet}
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isExporting ? 'กำลังส่งออกข้อมูลไปยัง Google Sheets...' : 'ส่งออกไปยัง Google Spreadsheet ใหม่'}</span>
                </button>

                {exportSuccessUrl && (
                  <div className="mt-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/80 flex items-center justify-between gap-3 text-xs text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>ส่งออกสำเร็จแล้ว! เปิดตรวจสอบไฟล์ใน Google Sheets</span>
                    </div>
                    <a
                      href={exportSuccessUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
                    >
                      <span>เปิดชีต</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-3 border-t text-xs ${
            isDarkMode ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>เชื่อมต่อด้วย Google Workspace OAuth (Drive &amp; Spreadsheets) และ Apps Script Webhook อย่างปลอดภัย</span>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            ปิด
          </button>
        </div>
      </div>

      {/* Confirmation Dialog Modal (MANDATORY for mutating operations) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${
              isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-3 text-amber-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold">{confirmDialog.title}</h3>
            </div>
            <p className={`text-xs leading-relaxed mb-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {confirmDialog.description}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className={`px-4 py-2 rounded-lg text-xs font-medium border cursor-pointer ${
                  isDarkMode
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md cursor-pointer transition-colors"
              >
                ยืนยันการบันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
