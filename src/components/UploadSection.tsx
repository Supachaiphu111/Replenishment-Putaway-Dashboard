import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Settings2, Download, Table2, Check } from 'lucide-react';
import { ColumnMapping } from '../types/rp20';

interface UploadSectionProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  error: string | null;
  fileName: string | null;
  recordCount: number;
  mapping: ColumnMapping;
  onOpenMappingModal: () => void;
  onLoadSample: () => void;
  onDownloadTemplate: () => void;
  onOpenGoogleSheets: () => void;
  isDarkMode?: boolean;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onFileUpload,
  isLoading,
  error,
  fileName,
  recordCount,
  mapping,
  onOpenMappingModal,
  onLoadSample,
  onDownloadTemplate,
  onOpenGoogleSheets,
  isDarkMode = true,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndUpload(file);
    }
  };

  const validateAndUpload = (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isValid) {
      alert('กรุณาอัปโหลดไฟล์ Excel (.xlsx หรือ .xls) เท่านั้น');
      return;
    }
    onFileUpload(file);
  };

  return (
    <div className={`rounded-2xl p-5 mb-6 border transition-all ${
      isDarkMode
        ? 'liquid-glass-dark liquid-rim-glow border-white/10 shadow-2xl'
        : 'liquid-glass-light liquid-rim-glow border-white/80 shadow-md'
    }`}>
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
        
        {/* Left: Drag & Drop Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            isDragOver
              ? isDarkMode
                ? 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_24px_rgba(16,185,129,0.3)]'
                : 'border-emerald-600 bg-emerald-50/80 shadow-sm'
              : isDarkMode
              ? 'border-white/15 hover:border-emerald-400/60 bg-slate-950/40 hover:bg-slate-900/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]'
              : 'border-slate-300 hover:border-emerald-500/60 bg-white/50 hover:bg-white/80 hover:shadow-xs'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
            isDarkMode
              ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-300 border-emerald-400/30 shadow-[0_0_15px_rgba(16,185,129,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]'
              : 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-xs'
          }`}>
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {isLoading ? 'กำลังประมวลผลไฟล์...' : 'คลิกเลือกไฟล์ หรือ ลากไฟล์ Excel (RP20) มาวางที่นี่'}
              </span>
              <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                (.xlsx, .xls)
              </span>
            </div>
            
            {/* Tech Detected Columns Pill Strip */}
            <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px]">
              <span className={`inline-flex items-center gap-1 font-mono-numbers px-2.5 py-0.5 rounded-full ${
                isDarkMode ? 'bg-white/5 text-emerald-300 border border-emerald-400/20 backdrop-blur-sm' : 'bg-slate-100 text-slate-700'
              }`}>
                <Check className="w-3 h-3 text-emerald-400" />
                Task Description
              </span>
              <span className={`inline-flex items-center gap-1 font-mono-numbers px-2.5 py-0.5 rounded-full ${
                isDarkMode ? 'bg-white/5 text-emerald-300 border border-emerald-400/20 backdrop-blur-sm' : 'bg-slate-100 text-slate-700'
              }`}>
                <Check className="w-3 h-3 text-emerald-400" />
                Task Status: Complete
              </span>
              <span className={`inline-flex items-center gap-1 font-mono-numbers px-2.5 py-0.5 rounded-full ${
                isDarkMode ? 'bg-white/5 text-emerald-300 border border-emerald-400/20 backdrop-blur-sm' : 'bg-slate-100 text-slate-700'
              }`}>
                <Check className="w-3 h-3 text-emerald-400" />
                By User
              </span>
              <span className={`inline-flex items-center gap-1 font-mono-numbers px-2.5 py-0.5 rounded-full ${
                isDarkMode ? 'bg-white/5 text-emerald-300 border border-emerald-400/20 backdrop-blur-sm' : 'bg-slate-100 text-slate-700'
              }`}>
                <Check className="w-3 h-3 text-emerald-400" />
                Latest Task Update Date
              </span>
            </div>
          </div>
        </div>

        {/* Right: Active Status & Utilities */}
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:border-l lg:pl-6 shrink-0 ${
          isDarkMode ? 'lg:border-white/10' : 'lg:border-slate-200'
        }`}>
          
          {/* File details HUD */}
          <div className={`rounded-xl p-3 border min-w-[240px] backdrop-blur-xl ${
            isDarkMode
              ? 'bg-slate-950/50 border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
              : 'bg-white/70 border-slate-200/80 shadow-xs'
          }`}>
            <div className={`flex items-center justify-between text-xs mb-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span>สถานะไฟล์:</span>
              <span className="font-mono-numbers font-medium text-emerald-500">
                {recordCount.toLocaleString()} รายการ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className={`text-xs font-semibold truncate ${
                isDarkMode ? 'text-slate-200' : 'text-slate-900'
              }`} title={fileName || 'ข้อมูลตัวอย่าง RP20'}>
                {fileName || 'RP20_Standard_WMS_Report.xlsx'}
              </span>
            </div>
            <div className={`mt-2 pt-2 border-t text-[11px] flex items-center justify-between ${
              isDarkMode ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}>
              <span>จับคู่คอลัมน์แล้ว:</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMappingModal();
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Settings2 className="w-3 h-3" />
                ตรวจสอบ
              </button>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              onClick={onOpenGoogleSheets}
              type="button"
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-xs ${
                isDarkMode
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-400/40 hover:border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>ดึงจาก Google Sheets</span>
            </button>
            <button
              onClick={onDownloadTemplate}
              type="button"
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                isDarkMode
                  ? 'liquid-btn-dark text-slate-200'
                  : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white shadow-xs'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>โหลดแม่แบบ RP20</span>
            </button>
            <button
              onClick={onLoadSample}
              type="button"
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 border-white/10 hover:border-white/20'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>ใช้ข้อมูลจำลอง</span>
            </button>
          </div>

        </div>

      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-950/40 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
