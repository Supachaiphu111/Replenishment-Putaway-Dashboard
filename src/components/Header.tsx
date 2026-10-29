import React from 'react';
import { FileSpreadsheet, RefreshCw, Download, Sun, Moon, Zap, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenUpload: () => void;
  onResetSample: () => void;
  onDownloadSample: () => void;
  onOpenLiveEntry?: () => void;
  recordCount: number;
  fileName: string | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  lastSavedTime?: string | null;
  isSaving?: boolean;
  onOpenGoogleSheets: () => void;
  currentUser?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  onGoogleSignIn?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  onResetSample,
  onDownloadSample,
  onOpenLiveEntry,
  recordCount,
  fileName,
  isDarkMode,
  onToggleTheme,
  lastSavedTime,
  isSaving = false,
  onOpenGoogleSheets,
  currentUser,
  onGoogleSignIn,
}) => {
  return (
    <header className={`sticky top-0 z-40 transition-all border-b ${
      isDarkMode
        ? 'liquid-glass-dark liquid-rim-glow border-white/10 text-white'
        : 'liquid-glass-light liquid-rim-glow border-slate-200/80 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          
          {/* Zone 1: Tech Wordmark with Liquid Glass lens */}
          <div className="flex items-center gap-3 shrink-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono-numbers font-bold text-xs tracking-wider transition-all relative overflow-hidden ${
              isDarkMode
                ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-300 border border-emerald-400/30 shadow-[0_0_20px_rgba(16,185,129,0.2),inset_0_1px_1px_rgba(255,255,255,0.3)]'
                : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-[0_4px_16px_rgba(5,150,105,0.3),inset_0_1px_1px_rgba(255,255,255,0.5)] border border-emerald-400/40'
            }`}>
              RP20
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold tracking-tight block leading-tight font-sans">
                  Replenishment &amp; Putaway Dashboard
                </span>
                <span className={`text-[10px] font-mono-numbers px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold backdrop-blur-md transition-all ${
                  isDarkMode
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-300/80 shadow-xs'
                }`}>
                  กะเช้า 05:00-17:00 · กะดึก 18:00-04:00
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                  {fileName ? fileName : 'RP20 WMS Report'}
                </span>
                <span className={isDarkMode ? 'text-slate-600' : 'text-slate-300'}>·</span>
                <span className="font-mono-numbers text-emerald-500 font-medium">
                  สถานะ Complete เท่านั้น
                </span>
                <span className={isDarkMode ? 'text-slate-600' : 'text-slate-300'}>·</span>
                <span className={`font-mono-numbers ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {recordCount.toLocaleString()} รายการ
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Persistence HUD Indicator with Liquid Pulse */}
          <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono-numbers transition-all ${
            isDarkMode
              ? 'bg-slate-900/60 backdrop-blur-xl border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15),inset_0_1px_1px_rgba(255,255,255,0.15)]'
              : 'bg-white/80 backdrop-blur-xl border border-emerald-200 text-emerald-800 shadow-[0_2px_8px_rgba(16,185,129,0.1)]'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSaving ? 'bg-amber-400' : 'bg-emerald-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isSaving ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
              }`}></span>
            </span>
            <span className="font-semibold text-[11px]">
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกแบบ Real-time ตลอด'}
            </span>
            {lastSavedTime && (
              <span className={`text-[10px] pl-1 border-l ${
                isDarkMode ? 'border-emerald-500/30 text-slate-400' : 'border-emerald-200 text-slate-500'
              }`}>
                {lastSavedTime}
              </span>
            )}
          </div>

          {/* Zone 3: Actions & Integrations */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Google Sheets Integration Quick Button */}
            <button
              onClick={onOpenGoogleSheets}
              title="เปิดจัดการ Google Sheets (นำเข้า/ส่งออก)"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap cursor-pointer shadow-xs ${
                currentUser
                  ? isDarkMode
                    ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  : isDarkMode
                  ? 'liquid-btn-dark text-emerald-400 hover:text-emerald-300'
                  : 'bg-white/80 hover:bg-white text-emerald-700 border-emerald-200 shadow-xs'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Google Sheets</span>
              {currentUser && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
              )}
            </button>

            {/* Quick Live Entry Button */}
            {onOpenLiveEntry && (
              <button
                onClick={onOpenLiveEntry}
                title="เพิ่มยอดงานแบบ Real-time ทันที"
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer shadow-xs ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-400/40 shadow-[0_0_16px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.25)]'
                    : 'bg-gradient-to-r from-cyan-50 to-indigo-50 hover:from-cyan-100 hover:to-indigo-100 text-cyan-900 border border-cyan-200 shadow-xs'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>+งาน Real-time</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              title={isDarkMode ? 'สลับเป็นโหมดสว่าง (Light Studio)' : 'สลับเป็นโหมดเทคโนโลยี (Dark Tech Console)'}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                isDarkMode
                  ? 'liquid-btn-dark text-amber-400 hover:text-amber-300'
                  : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white shadow-xs'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onResetSample}
              title="รีเซ็ตกลับเป็นข้อมูลจำลอง"
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเซ็ต</span>
            </button>

            <button
              onClick={onOpenUpload}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer ${
                isDarkMode
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>อัปโหลด Excel</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
