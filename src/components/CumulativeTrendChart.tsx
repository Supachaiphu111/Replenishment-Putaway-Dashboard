import React, { useState, useMemo } from 'react';
import { RP20RawRecord } from '../types/rp20';
import { isStatusComplete } from '../utils/excelParser';
import {
  TrendingUp,
  Calendar,
  CalendarRange,
  Layers,
  PieChart,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Maximize2
} from 'lucide-react';

interface CumulativeTrendChartProps {
  records: RP20RawRecord[];
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  isDarkMode?: boolean;
}

type TimeframeMode = 'daily' | 'monthly';
type MetricMode = 'cumulative' | 'volume';
type DailyRange = '7d' | '14d' | '30d' | 'all';
type MonthlyRange = '3m' | '6m' | '12m' | 'all';

// Thematic color palette for task line curves and percentage badges
const TASK_COLORS: Record<string, { stroke: string; fill: string; text: string; bg: string; border: string }> = {
  'Picking (หยิบสินค้าออเดอร์)': {
    stroke: '#10b981', // emerald
    fill: 'rgba(16, 185, 129, 0.25)',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/40',
  },
  'Putaway (จัดเก็บสินค้าเข้าชั้น)': {
    stroke: '#06b6d4', // cyan
    fill: 'rgba(6, 182, 212, 0.25)',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/40',
  },
  'Replenishment (เติมสต็อกหน้าหยิบ)': {
    stroke: '#f59e0b', // amber
    fill: 'rgba(245, 158, 11, 0.25)',
    text: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
  },
  'Cycle Count (ตรวจนับสต็อกรายวัน)': {
    stroke: '#a855f7', // purple
    fill: 'rgba(168, 85, 247, 0.25)',
    text: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/40',
  },
  'Packing & Verification (ตรวจแพ็คสินค้า)': {
    stroke: '#f43f5e', // rose
    fill: 'rgba(244, 63, 94, 0.25)',
    text: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40',
  },
  'Loading & Staging (จัดสินค้าเตรียมส่ง)': {
    stroke: '#3b82f6', // blue
    fill: 'rgba(59, 130, 246, 0.25)',
    text: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40',
  },
  'Inventory Transfer (ย้ายตำแหน่งสต็อก)': {
    stroke: '#f97316', // orange
    fill: 'rgba(249, 115, 22, 0.25)',
    text: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/40',
  },
};

const FALLBACK_PALETTE = [
  { stroke: '#14b8a6', fill: 'rgba(20, 184, 166, 0.25)', text: 'text-teal-400', bg: 'bg-teal-500/15', border: 'border-teal-500/40' },
  { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.25)', text: 'text-pink-400', bg: 'bg-pink-500/15', border: 'border-pink-500/40' },
  { stroke: '#84cc16', fill: 'rgba(132, 204, 22, 0.25)', text: 'text-lime-400', bg: 'bg-lime-500/15', border: 'border-lime-500/40' },
  { stroke: '#eab308', fill: 'rgba(234, 179, 8, 0.25)', text: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40' },
];

function getTaskTheme(taskName: string, index = 0) {
  if (TASK_COLORS[taskName]) return TASK_COLORS[taskName];
  // Match by keyword
  const lower = taskName.toLowerCase();
  if (lower.includes('pick') || lower.includes('หยิบ')) return TASK_COLORS['Picking (หยิบสินค้าออเดอร์)'];
  if (lower.includes('put') || lower.includes('เก็บ')) return TASK_COLORS['Putaway (จัดเก็บสินค้าเข้าชั้น)'];
  if (lower.includes('replenish') || lower.includes('เติม')) return TASK_COLORS['Replenishment (เติมสต็อกหน้าหยิบ)'];
  if (lower.includes('count') || lower.includes('นับ')) return TASK_COLORS['Cycle Count (ตรวจนับสต็อกรายวัน)'];
  if (lower.includes('pack') || lower.includes('แพ็ค')) return TASK_COLORS['Packing & Verification (ตรวจแพ็คสินค้า)'];
  if (lower.includes('load') || lower.includes('ส่ง')) return TASK_COLORS['Loading & Staging (จัดสินค้าเตรียมส่ง)'];
  if (lower.includes('transfer') || lower.includes('ย้าย')) return TASK_COLORS['Inventory Transfer (ย้ายตำแหน่งสต็อก)'];
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

// Format Thai date e.g. 26 ต.ค.
function formatThaiShortDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const mIdx = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return `${d} ${monthNames[mIdx] || parts[1]}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

// Format Thai month e.g. ต.ค. 2026
function formatThaiMonth(monthStr: string): string {
  try {
    const parts = monthStr.split('-');
    if (parts.length >= 2) {
      const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const mIdx = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[0], 10);
      return `${monthNames[mIdx] || parts[1]} ${y}`;
    }
  } catch {
    // fallback
  }
  return monthStr;
}

export const CumulativeTrendChart: React.FC<CumulativeTrendChartProps> = ({
  records,
  selectedDate,
  onSelectDate,
  isDarkMode = true,
}) => {
  // Navigation & filter state
  const [timeframe, setTimeframe] = useState<TimeframeMode>('daily');
  const [metricMode, setMetricMode] = useState<MetricMode>('cumulative');
  const [dailyRange, setDailyRange] = useState<DailyRange>('all');
  const [monthlyRange, setMonthlyRange] = useState<MonthlyRange>('all');

  // Filter only Complete tasks for production accuracy
  const completeRecords = useMemo(() => {
    return records.filter(r => isStatusComplete(r.taskStatus));
  }, [records]);

  // Extract distinct task descriptions in the dataset
  const allTaskDescriptions = useMemo(() => {
    const set = new Set<string>();
    completeRecords.forEach(r => {
      if (r.taskDescription) set.add(r.taskDescription);
    });
    return Array.from(set).sort();
  }, [completeRecords]);

  // Which tasks are currently enabled on the chart
  const [visibleTasks, setVisibleTasks] = useState<Set<string>>(() => new Set(allTaskDescriptions));

  // Sync if new descriptions arrive
  useMemo(() => {
    setVisibleTasks(prev => {
      if (prev.size === 0 && allTaskDescriptions.length > 0) {
        return new Set(allTaskDescriptions);
      }
      return prev;
    });
  }, [allTaskDescriptions]);

  // Toggle single task
  const toggleTaskVisibility = (task: string) => {
    setVisibleTasks(prev => {
      const next = new Set(prev);
      if (next.has(task)) {
        if (next.size > 1) next.delete(task); // keep at least 1
      } else {
        next.add(task);
      }
      return next;
    });
  };

  // Focus only on a single task
  const focusOnlyTask = (task: string) => {
    setVisibleTasks(new Set([task]));
  };

  // Select all tasks
  const selectAllTasks = () => {
    setVisibleTasks(new Set(allTaskDescriptions));
  };

  // Extract chronological periods (Daily or Monthly)
  const periods = useMemo(() => {
    if (timeframe === 'daily') {
      const dates = Array.from(new Set(completeRecords.map(r => r.completedDate))).filter(Boolean).sort();
      if (dailyRange === '7d') return dates.slice(-7);
      if (dailyRange === '14d') return dates.slice(-14);
      if (dailyRange === '30d') return dates.slice(-30);
      return dates;
    } else {
      // Monthly: format YYYY-MM
      const months = Array.from(
        new Set(
          completeRecords.map(r => {
            const d = r.completedDate || '';
            return d.length >= 7 ? d.slice(0, 7) : '';
          })
        )
      ).filter(Boolean).sort();

      if (monthlyRange === '3m') return months.slice(-3);
      if (monthlyRange === '6m') return months.slice(-6);
      if (monthlyRange === '12m') return months.slice(-12);
      return months;
    }
  }, [completeRecords, timeframe, dailyRange, monthlyRange]);

interface CumulativeTrendChartData {
  periodDataList: Array<{
    period: string;
    label: string;
    volume: Record<string, number>;
    cumulative: Record<string, number>;
    periodTotal: number;
    cumulativeTotal: number;
  }>;
  taskTotals: Record<string, number>;
  grandTotal: number;
}

  // Pre-calculate volumes and running cumulative totals per task for each period
  const chartData = useMemo<CumulativeTrendChartData>(() => {
    if (periods.length === 0) {
      return {
        periodDataList: [],
        taskTotals: {},
        grandTotal: 0,
      };
    }

    // periodKey -> task -> count
    const periodMap: Record<string, Record<string, number>> = {};
    periods.forEach(p => {
      periodMap[p] = {};
      allTaskDescriptions.forEach(t => {
        periodMap[p][t] = 0;
      });
    });

    completeRecords.forEach(r => {
      const key = timeframe === 'daily' ? r.completedDate : (r.completedDate || '').slice(0, 7);
      if (periodMap[key] && r.taskDescription) {
        periodMap[key][r.taskDescription] = (periodMap[key][r.taskDescription] || 0) + 1;
      }
    });

    // Running cumulative accumulator
    const runningCum: Record<string, number> = {};
    allTaskDescriptions.forEach(t => {
      runningCum[t] = 0;
    });

    const periodDataList = periods.map(p => {
      const countsInPeriod = periodMap[p];
      const cumInPeriod: Record<string, number> = {};
      let periodSum = 0;
      let cumSum = 0;

      allTaskDescriptions.forEach(t => {
        const c = countsInPeriod[t] || 0;
        runningCum[t] += c;
        cumInPeriod[t] = runningCum[t];
        periodSum += c;
        cumSum += runningCum[t];
      });

      return {
        period: p,
        label: timeframe === 'daily' ? formatThaiShortDate(p) : formatThaiMonth(p),
        volume: countsInPeriod,
        cumulative: cumInPeriod,
        periodTotal: periodSum,
        cumulativeTotal: cumSum,
      };
    });

    // Overall task totals in the analyzed range
    const taskTotals: Record<string, number> = {};
    let grandTotal = 0;
    allTaskDescriptions.forEach(t => {
      const tot = periodDataList.reduce((acc, p) => acc + (p.volume[t] || 0), 0);
      taskTotals[t] = tot;
      grandTotal += tot;
    });

    return {
      periodDataList,
      taskTotals,
      grandTotal,
    };
  }, [periods, completeRecords, timeframe, allTaskDescriptions]);

  // Hover state for interactive scrubber
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG Chart geometry
  const chartHeight = 280;
  const chartWidth = 920;
  const paddingLeft = 60;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 45;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const dataList = chartData.periodDataList || [];
  const pointCount = dataList.length;

  // Max value calculation for Y-Axis
  const maxY = useMemo(() => {
    if (pointCount === 0) return 10;
    let max = 0;
    dataList.forEach(pt => {
      allTaskDescriptions.forEach(t => {
        if (visibleTasks.has(t)) {
          const val = metricMode === 'cumulative' ? pt.cumulative[t] || 0 : pt.volume[t] || 0;
          if (val > max) max = val;
        }
      });
    });
    return max > 0 ? Math.ceil(max * 1.15) : 10;
  }, [dataList, allTaskDescriptions, visibleTasks, metricMode, pointCount]);

  // Generate SVG path for a specific task
  const generateTaskPath = (taskName: string) => {
    if (pointCount === 0) return '';
    const coords = dataList.map((pt, idx) => {
      const x = paddingLeft + (pointCount > 1 ? (idx / (pointCount - 1)) * innerWidth : innerWidth / 2);
      const val = metricMode === 'cumulative' ? pt.cumulative[taskName] || 0 : pt.volume[taskName] || 0;
      const y = paddingTop + innerHeight - (val / maxY) * innerHeight;
      return { x, y };
    });

    return coords.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');
  };

  // Generate SVG Area fill for single focused task
  const generateTaskArea = (taskName: string) => {
    const linePath = generateTaskPath(taskName);
    if (!linePath || pointCount < 2) return '';
    const lastX = paddingLeft + innerWidth;
    const firstX = paddingLeft;
    const bottomY = paddingTop + innerHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  // Top task by percentage in analyzed period
  const { topTask, topPct } = useMemo(() => {
    let topT = allTaskDescriptions[0] || 'Picking';
    let topV = 0;
    Object.entries(chartData.taskTotals).forEach(([t, count]) => {
      if (count > topV) {
        topV = count;
        topT = t;
      }
    });
    const pct = chartData.grandTotal > 0 ? ((topV / chartData.grandTotal) * 100).toFixed(1) : '0';
    return { topTask: topT, topPct: pct };
  }, [chartData, allTaskDescriptions]);

  // Average velocity
  const avgVelocity = useMemo(() => {
    if (pointCount === 0) return 0;
    return (chartData.grandTotal / pointCount).toFixed(0);
  }, [chartData.grandTotal, pointCount]);

  // Active hover point details
  const activeHoverPoint = hoveredIndex !== null && dataList[hoveredIndex] ? dataList[hoveredIndex] : null;

  return (
    <div
      className={`rounded-2xl p-5 mb-6 border transition-all ${
        isDarkMode
          ? 'liquid-glass-dark liquid-rim-glow border-white/10 shadow-2xl'
          : 'liquid-glass-light liquid-rim-glow border-white/80 shadow-md'
      }`}
      id="cumulative-trends"
    >
      {/* =========================================================================
          SECTION HEADER & HIGH-LEVEL CONTROLS
          ========================================================================= */}
      <div
        className={`flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 mb-4 border-b ${
          isDarkMode ? 'border-white/10' : 'border-slate-200'
        }`}
      >
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2
              className={`text-sm sm:text-base font-bold flex items-center gap-2 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              <span>กราฟจำนวนงานสะสม (รายวัน &amp; หลายเดือน) แยกตามประเภทงาน</span>
            </h2>
            <span
              className={`text-[10px] font-mono-numbers px-2.5 py-0.5 rounded-full border backdrop-blur-md font-semibold ${
                isDarkMode
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              Cumulative Multi-Task Trend
            </span>
          </div>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            วิเคราะห์แนวโน้มการเติบโตของงานสะสมในแต่ละวันและหลายเดือน พร้อมเส้นกราฟและสัดส่วนเปอร์เซ็นต์ (%) ของแต่ละงาน
          </p>
        </div>

        {/* Action Pills: Daily vs Multi-Month Toggle & Metric Mode */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Switcher (รายวัน / หลายเดือน) */}
          <div
            className={`flex items-center gap-1 p-0.5 rounded-xl border backdrop-blur-md ${
              isDarkMode ? 'bg-slate-950/60 border-white/10' : 'bg-white/80 border-slate-200 shadow-xs'
            }`}
          >
            <button
              type="button"
              onClick={() => setTimeframe('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeframe === 'daily'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>📅 รายวัน (Daily)</span>
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeframe === 'monthly'
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold shadow-[0_0_14px_rgba(99,102,241,0.4)]'
                  : isDarkMode
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>📆 หลายเดือน (Multi-Month)</span>
            </button>
          </div>

          {/* Metric Mode Toggle (Cumulative vs Volume) */}
          <div
            className={`flex items-center gap-1 p-0.5 rounded-xl border backdrop-blur-md ${
              isDarkMode ? 'bg-slate-950/60 border-white/10' : 'bg-white/80 border-slate-200 shadow-xs'
            }`}
          >
            <button
              type="button"
              onClick={() => setMetricMode('cumulative')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                metricMode === 'cumulative'
                  ? isDarkMode
                    ? 'bg-slate-800 text-emerald-300 font-bold shadow-xs border border-white/10'
                    : 'bg-slate-900 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="แสดงกราฟยอดสะสมต่อเนื่อง (Cumulative Total Curve)"
            >
              📈 สะสมต่อเนื่อง
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('volume')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                metricMode === 'volume'
                  ? isDarkMode
                    ? 'bg-slate-800 text-cyan-300 font-bold shadow-xs border border-white/10'
                    : 'bg-slate-900 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="แสดงกราฟยอดในแต่ละงวดวัน/เดือน (Period Volume)"
            >
              📊 ยอดในแต่ละงวด
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RANGE SELECTORS & SUMMARY KPI CARDS
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Metric 1: Total Volume */}
        <div
          className={`p-3.5 rounded-xl border ${
            isDarkMode ? 'bg-slate-950/40 border-white/10' : 'bg-white/80 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>ยอดงานรวมตลอดช่วง</span>
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-emerald-400">
            {chartData.grandTotal.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">งาน</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            ครอบคลุม {pointCount} {timeframe === 'daily' ? 'วัน' : 'เดือน'} (สถานะ Complete)
          </div>
        </div>

        {/* Metric 2: Dominant Task & % */}
        <div
          className={`p-3.5 rounded-xl border ${
            isDarkMode ? 'bg-slate-950/40 border-white/10' : 'bg-white/80 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>งานที่มีสัดส่วนสูงสุด</span>
            <PieChart className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono-numbers text-cyan-400">{topPct}%</span>
            <span className="text-xs text-slate-400 truncate max-w-[100px]">{topTask}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">
            {chartData.taskTotals[topTask]?.toLocaleString() || 0} งาน จากทั้งหมด
          </div>
        </div>

        {/* Metric 3: Average Throughput */}
        <div
          className={`p-3.5 rounded-xl border ${
            isDarkMode ? 'bg-slate-950/40 border-white/10' : 'bg-white/80 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>ความเร็วเฉลี่ยต่องวด</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-amber-400">
            {Number(avgVelocity).toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">{timeframe === 'daily' ? 'งาน/วัน' : 'งาน/เดือน'}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            เฉลี่ยความถี่การปฏิบัติงาน
          </div>
        </div>

        {/* Metric 4: Range Selector Pill Island */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            isDarkMode ? 'bg-slate-950/40 border-white/10' : 'bg-white/80 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>ช่วงเวลาการวิเคราะห์</span>
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {timeframe === 'daily' ? (
              <>
                {(['7d', '14d', '30d', 'all'] as DailyRange[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDailyRange(r)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                      dailyRange === r
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 font-bold'
                        : isDarkMode
                        ? 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {r === '7d' ? '7 วัน' : r === '14d' ? '14 วัน' : r === '30d' ? '30 วัน' : 'ทั้งหมด'}
                  </button>
                ))}
              </>
            ) : (
              <>
                {(['3m', '6m', '12m', 'all'] as MonthlyRange[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setMonthlyRange(r)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                      monthlyRange === r
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50 font-bold'
                        : isDarkMode
                        ? 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {r === '3m' ? '3 เดือน' : r === '6m' ? '6 เดือน' : r === '12m' ? '12 เดือน' : 'ทั้งหมด'}
                  </button>
                ))}
              </>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            แสดง {pointCount} จุดข้อมูล
          </div>
        </div>
      </div>

      {/* =========================================================================
          LIQUID GLASS PERCENTAGE TUBE GAUGE (สัดส่วนเปอร์เซ็นต์ของแต่ละงาน)
          ========================================================================= */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className={`font-semibold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <PieChart className="w-3.5 h-3.5 text-cyan-400" />
            <span>สัดส่วนเปอร์เซ็นต์ของแต่ละงานตลอดช่วง (Task Percentage Share)</span>
          </span>
          <span className="text-[11px] font-mono-numbers text-slate-400">
            รวม 100% ({chartData.grandTotal.toLocaleString()} งาน)
          </span>
        </div>

        {/* Stacked Liquid Bar */}
        <div className="w-full h-3 rounded-full bg-slate-900/80 border border-white/10 overflow-hidden flex shadow-inner">
          {allTaskDescriptions.map((taskName, idx) => {
            const count = chartData.taskTotals[taskName] || 0;
            const pct = chartData.grandTotal > 0 ? (count / chartData.grandTotal) * 100 : 0;
            if (pct <= 0) return null;
            const theme = getTaskTheme(taskName, idx);
            const isVisible = visibleTasks.has(taskName);

            return (
              <div
                key={taskName}
                style={{
                  width: `${pct}%`,
                  backgroundColor: theme.stroke,
                  opacity: isVisible ? 1 : 0.25,
                }}
                className="h-full transition-all duration-300 relative group cursor-pointer hover:brightness-125"
                title={`${taskName}: ${count.toLocaleString()} งาน (${pct.toFixed(1)}%)`}
                onClick={() => toggleTaskVisibility(taskName)}
              />
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE MULTI-LINE SVG CHART
          ========================================================================= */}
      <div className="relative overflow-x-auto pb-2">
        <div className="min-w-[760px] relative">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              {/* Neon Line Glow Filter */}
              <filter id="liquid-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Area Gradients for each task */}
              {allTaskDescriptions.map((task, idx) => {
                const theme = getTaskTheme(task, idx);
                return (
                  <linearGradient key={`grad-${task}`} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.stroke} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={theme.stroke} stopOpacity="0.0" />
                  </linearGradient>
                );
              })}
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = paddingTop + innerHeight - ratio * innerHeight;
              const val = Math.round(ratio * maxY);
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={paddingLeft + innerWidth}
                    y2={y}
                    stroke={isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
                    strokeDasharray={ratio === 0 ? '' : '3 3'}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="font-mono-numbers text-[10px]"
                    fill={isDarkMode ? '#94a3b8' : '#64748b'}
                  >
                    {val.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Area Fill for Focused Single Task (if only 1 task selected) */}
            {visibleTasks.size === 1 &&
              allTaskDescriptions.map((task, idx) => {
                if (!visibleTasks.has(task)) return null;
                const areaPath = generateTaskArea(task);
                return (
                  <path
                    key={`area-${task}`}
                    d={areaPath}
                    fill={`url(#grad-${idx})`}
                    className="transition-all duration-300"
                  />
                );
              })}

            {/* SVG Line Curves for Each Active Task */}
            {allTaskDescriptions.map((task, idx) => {
              if (!visibleTasks.has(task)) return null;
              const linePath = generateTaskPath(task);
              const theme = getTaskTheme(task, idx);

              return (
                <g key={`series-${task}`} className="transition-all duration-300">
                  {/* Glow underlay */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke={theme.stroke}
                    strokeWidth="3.5"
                    strokeOpacity="0.4"
                    filter="url(#liquid-glow)"
                  />
                  {/* Crisp optical line */}
                  <path
                    d={linePath}
                    fill="none"
                    stroke={theme.stroke}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Circular data dots on points */}
                  {dataList.map((pt, pIdx) => {
                    const x =
                      paddingLeft + (pointCount > 1 ? (pIdx / (pointCount - 1)) * innerWidth : innerWidth / 2);
                    const val = metricMode === 'cumulative' ? pt.cumulative[task] || 0 : pt.volume[task] || 0;
                    const y = paddingTop + innerHeight - (val / maxY) * innerHeight;
                    const isHovered = hoveredIndex === pIdx;

                    return (
                      <circle
                        key={`dot-${task}-${pIdx}`}
                        cx={x}
                        cy={y}
                        r={isHovered ? 5.5 : 3}
                        fill={theme.stroke}
                        stroke={isDarkMode ? '#0f172a' : '#ffffff'}
                        strokeWidth="1.5"
                        className="transition-all duration-150 cursor-pointer"
                        style={{
                          filter: isHovered ? 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' : undefined,
                        }}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* X-Axis Labels & Hover Columns */}
            {dataList.map((pt, idx) => {
              const x = paddingLeft + (pointCount > 1 ? (idx / (pointCount - 1)) * innerWidth : innerWidth / 2);
              const isHovered = hoveredIndex === idx;
              const isSelectedDate = selectedDate && pt.period === selectedDate;

              return (
                <g key={`x-${pt.period}`}>
                  {/* Transparent hover hit-test rect */}
                  <rect
                    x={x - (innerWidth / Math.max(1, pointCount)) / 2}
                    y={paddingTop}
                    width={innerWidth / Math.max(1, pointCount)}
                    height={innerHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onClick={() => {
                      if (timeframe === 'daily' && onSelectDate) {
                        onSelectDate(pt.period);
                      }
                    }}
                  />

                  {/* Hover vertical scrubber line */}
                  {isHovered && (
                    <line
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={paddingTop + innerHeight}
                      stroke={isDarkMode ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.25)'}
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  )}

                  {/* X-Axis Label */}
                  <text
                    x={x}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    className={`font-mono-numbers text-[10px] transition-colors ${
                      isHovered
                        ? isDarkMode
                          ? 'fill-emerald-400 font-bold'
                          : 'fill-slate-900 font-bold'
                        : isSelectedDate
                        ? 'fill-amber-400 font-bold'
                        : isDarkMode
                        ? 'fill-slate-400'
                        : 'fill-slate-600'
                    }`}
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* =========================================================================
              FLOATING LIQUID GLASS TOOLTIP (เมื่อเลื่อนเมาส์ผ่านจุดกราฟ)
              ========================================================================= */}
          {activeHoverPoint && hoveredIndex !== null && (
            <div
              className={`absolute top-2 z-30 p-3.5 rounded-2xl border shadow-2xl text-xs min-w-[280px] pointer-events-none backdrop-blur-2xl transition-all ${
                isDarkMode
                  ? 'bg-slate-900/90 border-white/20 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)]'
                  : 'bg-white/95 border-slate-300 text-slate-900 shadow-xl'
              }`}
              style={{
                left: `${Math.min(
                  Math.max(
                    ((hoveredIndex / Math.max(1, pointCount - 1)) * 100),
                    15
                  ),
                  85
                )}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {/* Tooltip Header */}
              <div className="flex items-center justify-between border-b pb-2 mb-2 border-white/10">
                <div className="flex items-center gap-1.5 font-bold">
                  <span>{timeframe === 'daily' ? '📅 วันที่' : '📆 เดือน'}</span>
                  <span className="font-mono-numbers text-emerald-400">{activeHoverPoint.label}</span>
                </div>
                <div className="font-mono-numbers font-semibold text-slate-300 text-[11px]">
                  รวม: {metricMode === 'cumulative'
                    ? activeHoverPoint.cumulativeTotal.toLocaleString()
                    : activeHoverPoint.periodTotal.toLocaleString()}{' '}
                  งาน
                </div>
              </div>

              {/* Task Breakdown with Percentages */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {allTaskDescriptions
                  .map((taskName, idx) => {
                    const theme = getTaskTheme(taskName, idx);
                    const val =
                      metricMode === 'cumulative'
                        ? activeHoverPoint.cumulative[taskName] || 0
                        : activeHoverPoint.volume[taskName] || 0;
                    const tot =
                      metricMode === 'cumulative'
                        ? activeHoverPoint.cumulativeTotal
                        : activeHoverPoint.periodTotal;
                    const pct = tot > 0 ? ((val / tot) * 100).toFixed(1) : '0';
                    const isVisible = visibleTasks.has(taskName);

                    return {
                      taskName,
                      val,
                      pct,
                      theme,
                      isVisible,
                    };
                  })
                  .sort((a, b) => b.val - a.val)
                  .map(item => (
                    <div
                      key={item.taskName}
                      className={`flex items-center justify-between text-[11px] py-0.5 ${
                        !item.isVisible ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: item.theme.stroke }}
                        />
                        <span className="truncate">{item.taskName}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono-numbers shrink-0">
                        <span className="font-bold text-white">{item.val.toLocaleString()}</span>
                        <span
                          className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold"
                          style={{
                            backgroundColor: item.theme.fill,
                            color: item.theme.stroke,
                          }}
                        >
                          {item.pct}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              {timeframe === 'daily' && (
                <div className="mt-2 pt-1.5 border-t border-white/10 text-[10px] text-slate-400 text-center">
                  💡 คลิกที่จุดเพื่อเจาะลึก 24 ชั่วโมงของวันนี้
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE TASK BREAKDOWN CARDS & LEGEND (เปอร์เซ็นต์ของแต่ละงาน)
          ========================================================================= */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
              ยอดสะสมและสัดส่วนเปอร์เซ็นต์รายประเภทงาน (Click to Toggle / Focus Line):
            </span>
            <span className="text-xs font-mono-numbers text-slate-400">
              ({visibleTasks.size}/{allTaskDescriptions.length} เส้นกราฟ)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllTasks}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all cursor-pointer ${
                visibleTasks.size === allTaskDescriptions.length
                  ? isDarkMode
                    ? 'bg-slate-800 text-emerald-300 border-white/20'
                    : 'bg-slate-900 text-white'
                  : isDarkMode
                  ? 'bg-slate-950/60 text-slate-400 border-white/10 hover:text-white'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              แสดงทั้งหมด
            </button>
          </div>
        </div>

        {/* Task Cards Grid with % meters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {allTaskDescriptions.map((taskName, idx) => {
            const count = chartData.taskTotals[taskName] || 0;
            const pct = chartData.grandTotal > 0 ? ((count / chartData.grandTotal) * 100).toFixed(1) : '0';
            const theme = getTaskTheme(taskName, idx);
            const isVisible = visibleTasks.has(taskName);

            return (
              <div
                key={taskName}
                onClick={() => toggleTaskVisibility(taskName)}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isVisible
                    ? isDarkMode
                      ? 'bg-slate-950/50 border-white/15 hover:border-white/30 shadow-md'
                      : 'bg-white/80 border-slate-200 hover:border-slate-300 shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-950/20 border-white/5 opacity-40 hover:opacity-70'
                    : 'bg-slate-100/50 border-slate-200 opacity-40 hover:opacity-70'
                }`}
              >
                {/* Header row: Status toggle + Name + % badge */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: theme.stroke }}
                    />
                    <span
                      className={`text-xs font-semibold truncate ${
                        isDarkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}
                      title={taskName}
                    >
                      {taskName}
                    </span>
                  </div>

                  {/* Percentage Share Pill */}
                  <span
                    className="text-xs font-mono-numbers font-bold px-2 py-0.5 rounded-full shrink-0 transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: theme.fill,
                      color: theme.stroke,
                      border: `1px solid ${theme.stroke}40`,
                    }}
                  >
                    {pct}%
                  </span>
                </div>

                {/* Metric count */}
                <div className="flex items-baseline justify-between text-xs font-mono-numbers mb-2">
                  <span className="text-slate-400 text-[11px]">ยอดรวมช่วงนี้:</span>
                  <span className="font-bold text-white text-sm">{count.toLocaleString()} งาน</span>
                </div>

                {/* Mini Liquid Tube Gauge for this task */}
                <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(2, Number(pct)))}%`,
                      backgroundColor: theme.stroke,
                    }}
                  />
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    {isVisible ? (
                      <>
                        <Eye className="w-3 h-3 text-emerald-400" />
                        <span>แสดงเส้นกราฟ</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 text-slate-500" />
                        <span>ซ่อนเส้นกราฟ</span>
                      </>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      focusOnlyTask(taskName);
                    }}
                    className={`hover:text-white px-1.5 py-0.5 rounded-sm transition-colors ${
                      isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-200'
                    }`}
                    title="แสดงเฉพาะกราฟของงานนี้เดี่ยวๆ"
                  >
                    ดูเฉพาะงานนี้
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
