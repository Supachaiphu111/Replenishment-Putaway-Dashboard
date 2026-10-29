import React from 'react';
import { RP20RawRecord } from '../types/rp20';
import { CumulativeTrendChart } from './CumulativeTrendChart';
import { X, TrendingUp, Maximize2 } from 'lucide-react';

interface CumulativeAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: RP20RawRecord[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  isDarkMode?: boolean;
}

export const CumulativeAnalyticsModal: React.FC<CumulativeAnalyticsModalProps> = ({
  isOpen,
  onClose,
  records,
  selectedDate,
  onSelectDate,
  isDarkMode = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`w-full max-w-7xl max-h-[94vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl transition-all ${
          isDarkMode
            ? 'liquid-glass-dark liquid-rim-glow border-white/15 bg-slate-950/95 text-white'
            : 'liquid-glass-light liquid-rim-glow border-slate-200/90 bg-white/95 text-slate-900'
        }`}
      >
        {/* Modal Window Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  หน้าต่างแยก: วิเคราะห์งานสะสมรายวัน &amp; หลายเดือน
                </h3>
                <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded-full bg-cyan-400/15 text-cyan-300 border border-cyan-400/30 font-semibold">
                  Separate Pop-up Window
                </span>
              </div>
              <p className="text-xs text-slate-400">
                แสดงเส้นกราฟสะสม สัดส่วนเปอร์เซ็นต์ (%) และตัวเลขละเอียดทุกประเภทงาน
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border-white/10'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
            title="ปิดหน้าต่างแยก"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Window Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <CumulativeTrendChart
            records={records}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              if (onSelectDate) onSelectDate(d);
              onClose(); // Automatically close and focus date on main dashboard if requested
            }}
            isDarkMode={isDarkMode}
            isStandalonePage={true}
          />
        </div>
      </div>
    </div>
  );
};
