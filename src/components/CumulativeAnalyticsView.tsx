import React, { useMemo } from 'react';
import { RP20RawRecord } from '../types/rp20';
import { isStatusComplete } from '../utils/excelParser';
import { isHourInShift } from '../utils/shiftHelper';
import { CumulativeTrendChart } from './CumulativeTrendChart';
import {
  TrendingUp,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  PieChart,
  Sun,
  Moon,
  Maximize2,
  FileSpreadsheet,
  CheckCircle2,
  Activity
} from 'lucide-react';

interface CumulativeAnalyticsViewProps {
  records: RP20RawRecord[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  onBackToDashboard: () => void;
  onOpenPopoutModal?: () => void;
  isDarkMode?: boolean;
}

export const CumulativeAnalyticsView: React.FC<CumulativeAnalyticsViewProps> = ({
  records,
  selectedDate,
  onSelectDate,
  onBackToDashboard,
  onOpenPopoutModal,
  isDarkMode = true,
}) => {
  // Complete records only
  const completeRecords = useMemo(() => {
    return records.filter(r => isStatusComplete(r.taskStatus));
  }, [records]);

  // Total complete count
  const totalComplete = completeRecords.length;

  // Breakdown by Shift across the entire historical dataset
  const shiftStats = useMemo(() => {
    let morning = 0;
    let night = 0;
    completeRecords.forEach(r => {
      if (isHourInShift(r.completedHour, 'morning')) morning++;
      else if (isHourInShift(r.completedHour, 'night')) night++;
    });
    const morningPct = totalComplete > 0 ? ((morning / totalComplete) * 100).toFixed(1) : '0';
    const nightPct = totalComplete > 0 ? ((night / totalComplete) * 100).toFixed(1) : '0';
    return { morning, night, morningPct, nightPct };
  }, [completeRecords, totalComplete]);

  // Unique days & months count
  const periodCounts = useMemo(() => {
    const days = new Set(completeRecords.map(r => r.completedDate).filter(Boolean));
    const months = new Set(
      completeRecords
        .map(r => (r.completedDate ? r.completedDate.slice(0, 7) : ''))
        .filter(Boolean)
    );
    return { daysCount: days.size, monthsCount: months.size };
  }, [completeRecords]);

  // Top task breakdown
  const topTaskInfo = useMemo(() => {
    const taskMap: Record<string, number> = {};
    completeRecords.forEach(r => {
      const desc = r.taskDescription || 'อื่นๆ';
      taskMap[desc] = (taskMap[desc] || 0) + 1;
    });

    let topName = '-';
    let topVal = 0;
    Object.entries(taskMap).forEach(([t, v]) => {
      if (v > topVal) {
        topVal = v;
        topName = t;
      }
    });

    const pct = totalComplete > 0 ? ((topVal / totalComplete) * 100).toFixed(1) : '0';
    return { topName, topVal, pct };
  }, [completeRecords, totalComplete]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* =========================================================================
          HERO LIQUID GLASS NAVIGATION BANNER
          ========================================================================= */}
      <div
        className={`rounded-2xl p-5 sm:p-6 border transition-all ${
          isDarkMode
            ? 'liquid-glass-dark liquid-rim-glow border-white/10 shadow-2xl'
            : 'liquid-glass-light liquid-rim-glow border-slate-200/90 shadow-md'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <button
              onClick={onBackToDashboard}
              title="กลับสู่แดชบอร์ดกะ & รายชั่วโมงหลัก"
              className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 mt-0.5 ${
                isDarkMode
                  ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border-white/10 hover:border-white/25 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 shadow-xs'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                  <span>ศูนย์วิเคราะห์งานสะสมรายวัน &amp; หลายเดือน</span>
                </span>
                <span className="text-xs font-mono-numbers px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-semibold backdrop-blur-md">
                  Dedicated Multi-Period Analytics Hub
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                วิเคราะห์แนวโน้มผลงานสะสมเชิงลึก (Cumulative Trend Curves) พร้อมสัดส่วนเปอร์เซ็นต์ (Task Share %) และแสดงตัวเลขละเอียดของทุกประเภทงาน
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
            {onOpenPopoutModal && (
              <button
                onClick={onOpenPopoutModal}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  isDarkMode
                    ? 'liquid-btn-dark text-cyan-300 hover:text-cyan-200'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-xs'
                }`}
                title="เปิดในหน้าต่าง Pop-up แยกอิสระ"
              >
                <Maximize2 className="w-4 h-4 text-cyan-400" />
                <span>เปิดหน้าต่าง Pop-up แยก</span>
              </button>
            )}

            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.35)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all cursor-pointer"
            >
              <span>📊 แดชบอร์ดกะ 24 ชม.</span>
            </button>
          </div>
        </div>

        {/* Highlight KPI Vessel Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
          <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-white/10' : 'bg-white/80 border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>ยอดงานสะสมรวม (Complete)</span>
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono-numbers text-emerald-400">
              {totalComplete.toLocaleString()} <span className="text-xs font-normal text-slate-400">งาน</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              สะสมใน {periodCounts.daysCount} วัน ({periodCounts.monthsCount} เดือน)
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-white/10' : 'bg-white/80 border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>งานที่มีสัดส่วนสูงสุด</span>
              <PieChart className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono-numbers text-cyan-400">{topTaskInfo.pct}%</span>
              <span className="text-xs text-slate-400 truncate max-w-[110px]">{topTaskInfo.topName}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {topTaskInfo.topVal.toLocaleString()} งาน
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-white/10' : 'bg-white/80 border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>กะเช้า 05:00-17:00</span>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono-numbers text-amber-400">
              {shiftStats.morning.toLocaleString()}{' '}
              <span className="text-xs font-mono-numbers text-slate-400">({shiftStats.morningPct}%)</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              ยอดงานกะเช้าสะสม
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-white/10' : 'bg-white/80 border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>กะดึก 18:00-04:00</span>
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono-numbers text-indigo-400">
              {shiftStats.night.toLocaleString()}{' '}
              <span className="text-xs font-mono-numbers text-slate-400">({shiftStats.nightPct}%)</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              ยอดงานกะดึกสะสม
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          EMBEDDED CUMULATIVE TREND CHART COMPONENT WITH FULL NUMBERS & TABLE
          ========================================================================= */}
      <CumulativeTrendChart
        records={records}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        isDarkMode={isDarkMode}
        isStandalonePage={true}
        onOpenPopoutModal={onOpenPopoutModal}
      />
    </div>
  );
};
