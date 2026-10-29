import React from 'react';
import { CheckCircle2, Users, Zap, TrendingUp, BarChart3, Package, Sun, Moon, ArrowRight, Clock } from 'lucide-react';
import { ShiftType } from '../types/rp20';

interface KpiCardsProps {
  totalTasks: number;
  totalComplete: number;
  activeUsersCount: number;
  peakHour: number;
  peakVolume: number;
  avgPerHour: number;
  totalQuantity: number;
  morningShiftCount?: number;
  nightShiftCount?: number;
  activeShift?: ShiftType;
  onSelectShift?: (shift: ShiftType) => void;
  isDarkMode?: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalTasks,
  totalComplete,
  activeUsersCount,
  peakHour,
  peakVolume,
  avgPerHour,
  totalQuantity,
  morningShiftCount = 0,
  nightShiftCount = 0,
  activeShift = 'all',
  onSelectShift,
  isDarkMode = true,
}) => {
  const completionRate = totalTasks > 0 ? ((totalComplete / totalTasks) * 100).toFixed(1) : '0';
  const peakHourStr = `${String(peakHour).padStart(2, '0')}:00 - ${String((peakHour + 1) % 24).padStart(2, '0')}:00 น.`;

  const totalShiftCount = morningShiftCount + nightShiftCount;
  const morningPct = totalShiftCount > 0 ? ((morningShiftCount / totalShiftCount) * 100).toFixed(1) : '0.0';
  const nightPct = totalShiftCount > 0 ? ((nightShiftCount / totalShiftCount) * 100).toFixed(1) : '0.0';

  const cards = [
    {
      title: 'ยอดงาน Complete',
      value: totalComplete.toLocaleString(),
      subtext: `จากทั้งหมด ${totalTasks.toLocaleString()} งาน`,
      icon: CheckCircle2,
      accentColor: 'text-emerald-500',
      borderColor: isDarkMode ? 'border-b-emerald-500' : 'border-b-emerald-600',
      badge: `${completionRate}% สำเร็จ`,
    },
    {
      title: 'พนักงานปฏิบัติงาน',
      value: activeUsersCount,
      subtext: 'ผู้ปฏิบัติงาน (By User)',
      icon: Users,
      accentColor: 'text-cyan-400',
      borderColor: isDarkMode ? 'border-b-cyan-500' : 'border-b-cyan-600',
      badge: 'Active Staff',
    },
    {
      title: 'ชั่วโมงพีคสูงสุด',
      value: peakVolume > 0 ? `${String(peakHour).padStart(2, '0')}:00` : '-',
      subtext: `${peakVolume.toLocaleString()} งาน (${peakHourStr})`,
      icon: Zap,
      accentColor: 'text-amber-400',
      borderColor: isDarkMode ? 'border-b-amber-500' : 'border-b-amber-600',
      badge: 'Peak Surge',
    },
    {
      title: 'ความเร็วเฉลี่ย/ชม.',
      value: avgPerHour.toFixed(1),
      subtext: 'งาน Complete ต่อชม.',
      icon: TrendingUp,
      accentColor: 'text-blue-400',
      borderColor: isDarkMode ? 'border-b-blue-500' : 'border-b-blue-600',
      badge: 'Velocity',
    },
    {
      title: 'อัตราความสำเร็จ',
      value: `${completionRate}%`,
      subtext: 'สัดส่วน Complete สุทธิ',
      icon: BarChart3,
      accentColor: 'text-violet-400',
      borderColor: isDarkMode ? 'border-b-violet-500' : 'border-b-violet-600',
      badge: 'Ratio',
    },
    {
      title: 'ยอดชิ้นงานรวม (Qty)',
      value: totalQuantity > 0 ? totalQuantity.toLocaleString() : totalComplete.toLocaleString(),
      subtext: totalQuantity > 0 ? 'ชิ้น (Units/Qty)' : 'จำนวนงาน',
      icon: Package,
      accentColor: 'text-teal-400',
      borderColor: isDarkMode ? 'border-b-teal-500' : 'border-b-teal-600',
      badge: 'Throughput',
    },
  ];

  return (
    <div className="space-y-4 mb-6" id="overview">
      {/* 6 Top Metric KPI Cards - Liquid Glass Optics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`rounded-2xl p-4 border transition-all liquid-interactive relative overflow-hidden group ${
                isDarkMode
                  ? 'liquid-glass-dark liquid-rim-glow border-white/10 hover:border-white/25 shadow-xl'
                  : 'liquid-glass-light liquid-rim-glow border-white/80 hover:border-slate-300 shadow-md'
              }`}
            >
              {/* Subtle Ambient Caustic Light within Glass */}
              <div
                className={`absolute -top-8 -right-8 w-20 h-20 rounded-full blur-xl pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity ${
                  idx === 0
                    ? 'bg-emerald-400'
                    : idx === 1
                    ? 'bg-cyan-400'
                    : idx === 2
                    ? 'bg-amber-400'
                    : idx === 3
                    ? 'bg-blue-400'
                    : idx === 4
                    ? 'bg-violet-400'
                    : 'bg-teal-400'
                }`}
              />

              <div className="flex items-center justify-between mb-2 relative z-10">
                <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {card.title}
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-md ${
                  isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100/80 border border-slate-200'
                }`}>
                  <Icon className={`w-4 h-4 ${card.accentColor}`} />
                </div>
              </div>

              <div className={`text-2xl font-bold font-mono-numbers leading-tight tracking-tight relative z-10 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {card.value}
              </div>

              <div className={`text-[11px] mt-2 pt-1.5 border-t flex items-center justify-between gap-1 relative z-10 ${
                isDarkMode ? 'border-white/5 text-slate-400' : 'border-slate-200/60 text-slate-500'
              }`}>
                <span className="truncate">{card.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shift Performance HUD (กะเช้า 05:00-17:00 vs กะดึก 18:00-04:00) - Liquid Glass Vessels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        {/* Morning Shift Card */}
        <div
          onClick={() => onSelectShift?.(activeShift === 'morning' ? 'all' : 'morning')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden liquid-interactive ${
            activeShift === 'morning'
              ? isDarkMode
                ? 'bg-gradient-to-br from-amber-500/20 via-slate-900/60 to-slate-950/80 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.25),inset_0_1px_2px_rgba(255,255,255,0.3)] ring-1 ring-amber-400/40'
                : 'bg-gradient-to-br from-amber-50/90 via-white/80 to-amber-50/50 border-amber-400 shadow-md ring-1 ring-amber-400/30'
              : isDarkMode
              ? 'liquid-glass-dark liquid-rim-glow border-white/10 hover:border-amber-400/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
              : 'liquid-glass-light liquid-rim-glow border-white/80 hover:border-amber-300 shadow-sm'
          }`}
        >
          {/* Ambient Warm Caustic Blob */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-500/15 blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>กะเช้า (Morning Shift)</span>
                  {activeShift === 'morning' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40 backdrop-blur-md font-semibold">
                      กำลังเลือก
                    </span>
                  )}
                </h3>
                <span className="text-[11px] font-mono-numbers text-slate-400">
                  05:00 - 17:00 น. (12 ชั่วโมง)
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono-numbers font-bold text-amber-300">
                {morningPct}%
              </span>
              <span className="text-[10px] text-slate-400 block">สัดส่วนยอด</span>
            </div>
          </div>

          {/* Liquid Tube Gauge */}
          <div className="w-full h-2 rounded-full bg-slate-800/80 border border-white/10 overflow-hidden mb-3 relative z-10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-700 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
              style={{ width: `${Math.min(100, Math.max(0, Number(morningPct)))}%` }}
            />
          </div>

          <div className={`flex items-baseline justify-between pt-2.5 border-t relative z-10 ${
            isDarkMode ? 'border-white/10' : 'border-slate-200'
          }`}>
            <div>
              <span className="text-[11px] text-slate-400">ยอดงาน Complete:</span>
              <div className="text-xl font-bold font-mono-numbers text-white">
                {morningShiftCount.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-400">งาน</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <span>เฉลี่ย/ชม.: </span>
              <span className="font-mono-numbers font-semibold text-amber-300">
                {(morningShiftCount / 12).toFixed(1)}
              </span>{' '}
              งาน/ชม.
            </div>
          </div>
        </div>

        {/* Night Shift Card */}
        <div
          onClick={() => onSelectShift?.(activeShift === 'night' ? 'all' : 'night')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden liquid-interactive ${
            activeShift === 'night'
              ? isDarkMode
                ? 'bg-gradient-to-br from-indigo-500/20 via-slate-900/60 to-slate-950/80 border-indigo-400/60 shadow-[0_0_30px_rgba(99,102,241,0.25),inset_0_1px_2px_rgba(255,255,255,0.3)] ring-1 ring-indigo-400/40'
                : 'bg-gradient-to-br from-indigo-50/90 via-white/80 to-indigo-50/50 border-indigo-400 shadow-md ring-1 ring-indigo-400/30'
              : isDarkMode
              ? 'liquid-glass-dark liquid-rim-glow border-white/10 hover:border-indigo-400/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]'
              : 'liquid-glass-light liquid-rim-glow border-white/80 hover:border-indigo-300 shadow-sm'
          }`}
        >
          {/* Ambient Cosmic Caustic Blob */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <span>กะดึก (Night Shift)</span>
                  {activeShift === 'night' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 border border-indigo-400/40 backdrop-blur-md font-semibold">
                      กำลังเลือก
                    </span>
                  )}
                </h3>
                <span className="text-[11px] font-mono-numbers text-slate-400">
                  18:00 - 04:00 น. (10 ชั่วโมง ข้ามคืน)
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono-numbers font-bold text-indigo-300">
                {nightPct}%
              </span>
              <span className="text-[10px] text-slate-400 block">สัดส่วนยอด</span>
            </div>
          </div>

          {/* Liquid Tube Gauge */}
          <div className="w-full h-2 rounded-full bg-slate-800/80 border border-white/10 overflow-hidden mb-3 relative z-10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-300 transition-all duration-700 shadow-[0_0_10px_rgba(99,102,241,0.6)]"
              style={{ width: `${Math.min(100, Math.max(0, Number(nightPct)))}%` }}
            />
          </div>

          <div className={`flex items-baseline justify-between pt-2.5 border-t relative z-10 ${
            isDarkMode ? 'border-white/10' : 'border-slate-200'
          }`}>
            <div>
              <span className="text-[11px] text-slate-400">ยอดงาน Complete:</span>
              <div className="text-xl font-bold font-mono-numbers text-white">
                {nightShiftCount.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-400">งาน</span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <span>เฉลี่ย/ชม.: </span>
              <span className="font-mono-numbers font-semibold text-indigo-300">
                {(nightShiftCount / 10).toFixed(1)}
              </span>{' '}
              งาน/ชม.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
