import React, { useState } from 'react';
import { HourlyProductivity } from '../types/rp20';
import { Clock, Zap, Sun, Moon } from 'lucide-react';
import { getShiftInfo } from '../utils/shiftHelper';

interface HourlyChartProps {
  data: HourlyProductivity[];
  peakHour: number;
  totalComplete: number;
  selectedHour?: number | null;
  onSelectHour?: (hour: number | null) => void;
  isDarkMode?: boolean;
}

export const HourlyChart: React.FC<HourlyChartProps> = ({
  data,
  peakHour,
  totalComplete,
  selectedHour,
  onSelectHour,
  isDarkMode = true,
}) => {
  const [hoveredHour, setHoveredHour] = useState<HourlyProductivity | null>(null);

  const maxCount = Math.max(...data.map(d => d.count), 10);

  return (
    <div className={`rounded-2xl p-5 mb-6 border transition-all ${
      isDarkMode
        ? 'liquid-glass-dark liquid-rim-glow border-white/10 shadow-2xl'
        : 'liquid-glass-light liquid-rim-glow border-white/80 shadow-md'
    }`} id="hourly">
      <div className={`flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-4 pb-3 border-b ${
        isDarkMode ? 'border-white/10' : 'border-slate-200'
      }`}>
        <div>
          <h2 className={`text-sm font-bold flex items-center gap-2 ${
            isDarkMode ? 'text-slate-100' : 'text-slate-900'
          }`}>
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>กราฟยอดงานรายชั่วโมง 24 ชม. (กะเช้า 05:00-17:00 · กะดึก 18:00-04:00)</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            ยอดงานสถานะ Complete ครอบคลุม 2 กะการทำงานต่อเนื่อง 24 ชั่วโมง (คลิกแท่งชั่วโมงเพื่อเจาะลึก)
          </p>
        </div>

        {/* Shift and Peak Legend */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 font-medium backdrop-blur-md">
            <Sun className="w-3 h-3 text-amber-300" />
            <span>กะเช้า (05:00-17:00)</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 font-medium backdrop-blur-md">
            <Moon className="w-3 h-3 text-indigo-300" />
            <span>กะดึก (18:00-04:00)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
            <span className={isDarkMode ? 'text-amber-300 font-medium' : 'text-slate-700'}>
              ชั่วโมงพีค ({String(peakHour).padStart(2, '0')}:00)
            </span>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="relative">
        {/* Floating tooltip when hovering with Liquid Glass */}
        {hoveredHour && (
          <div className={`absolute top-0 right-4 z-20 p-3.5 rounded-xl shadow-2xl text-xs min-w-[250px] pointer-events-none border backdrop-blur-2xl transition-all ${
            isDarkMode
              ? 'bg-slate-900/80 text-white border-white/20 shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)]'
              : 'bg-white/90 text-slate-900 border-white/80 shadow-xl'
          }`}>
            {(() => {
              const shiftInfo = getShiftInfo(hoveredHour.hour);
              return (
                <>
                  <div className="flex items-center justify-between font-semibold border-b border-slate-800 pb-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span>{shiftInfo.icon}</span>
                      <span className="font-mono-numbers">
                        {hoveredHour.label} - {String((hoveredHour.hour + 1) % 24).padStart(2, '0')}:00 น.
                      </span>
                    </div>
                    <span className="text-emerald-400 font-mono-numbers font-bold">
                      {hoveredHour.count} งาน
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">กะการทำงาน:</span>
                      <span className="font-semibold text-white">{shiftInfo.name} ({shiftInfo.timeRange})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">จำนวนผู้ทำงาน:</span>
                      <span className="font-mono-numbers font-medium text-white">{hoveredHour.usersActive} คน</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ยอดสะสมถึงเวลานี้:</span>
                      <span className="text-emerald-400 font-mono-numbers font-bold">{hoveredHour.cumulativeCount} งาน</span>
                    </div>
                  </div>
                </>
              );
            })()}

            {Object.keys(hoveredHour.userBreakdown).length > 0 && (
              <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px]">
                <div className="text-slate-400 mb-1">พนักงานสูงสุดในชม.นี้:</div>
                <div className="max-h-24 overflow-y-auto space-y-0.5 font-mono-numbers">
                  {Object.entries(hoveredHour.userBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([name, c]) => (
                      <div key={name} className="flex justify-between text-slate-300">
                        <span className="truncate max-w-[140px] font-sans">{name}</span>
                        <span className="text-emerald-400 font-bold">{c}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 24-Hour Bar Graph */}
        <div className="overflow-x-auto pb-2">
          <div className={`min-w-[760px] h-[270px] flex items-end gap-1.5 pt-8 pb-7 px-2 border-b ${
            isDarkMode ? 'border-slate-800' : 'border-slate-200'
          }`}>
            {data.map((item) => {
              const isPeak = item.hour === peakHour && item.count > 0;
              const barHeightPct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              const isSelected = selectedHour === item.hour;
              const shiftInfo = getShiftInfo(item.hour);

              return (
                <div
                  key={item.hour}
                  onClick={() => onSelectHour?.(isSelected ? null : item.hour)}
                  className={`flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer p-0.5 rounded-t-sm transition-all ${
                    isSelected ? (isDarkMode ? 'bg-cyan-950/60 ring-2 ring-cyan-400' : 'bg-indigo-100 ring-2 ring-indigo-500') : ''
                  }`}
                  onMouseEnter={() => setHoveredHour(item)}
                  onMouseLeave={() => setHoveredHour(null)}
                >
                  {/* Value number on top of bar */}
                  <span
                    className={`text-[10px] font-mono-numbers font-semibold mb-1 transition-transform group-hover:scale-110 ${
                      item.count === 0
                        ? isDarkMode ? 'text-slate-700' : 'text-slate-300'
                        : isSelected
                        ? 'text-cyan-400 font-bold'
                        : isPeak
                        ? 'text-amber-400 font-bold'
                        : isDarkMode
                        ? 'text-slate-300'
                        : 'text-slate-700'
                    }`}
                  >
                    {item.count > 0 ? item.count : ''}
                  </span>

                  {/* Bar */}
                  <div
                    style={{ height: `${Math.max(barHeightPct, item.count > 0 ? 4 : 0)}%` }}
                    className={`w-full rounded-t-xs transition-all duration-200 ${
                      isSelected
                        ? 'bg-cyan-400 shadow-md shadow-cyan-500/20'
                        : isPeak
                        ? 'bg-amber-400 group-hover:bg-amber-300 shadow-md shadow-amber-500/20'
                        : item.count > 0
                        ? shiftInfo.shift === 'morning'
                          ? isDarkMode ? 'bg-emerald-500/80 group-hover:bg-emerald-400' : 'bg-emerald-600 group-hover:bg-emerald-500'
                          : shiftInfo.shift === 'night'
                          ? isDarkMode ? 'bg-indigo-500/80 group-hover:bg-indigo-400' : 'bg-indigo-600 group-hover:bg-indigo-500'
                          : 'bg-slate-600 group-hover:bg-slate-500'
                        : isDarkMode
                        ? 'bg-slate-800/40 hover:bg-slate-800/80'
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  />

                  {/* Hour and Shift Indicator */}
                  <div className="absolute -bottom-6 flex flex-col items-center">
                    <span
                      className={`text-[10px] font-mono-numbers ${
                        isSelected
                          ? 'font-bold text-cyan-400'
                          : isPeak
                          ? 'font-bold text-amber-400'
                          : item.count > 0
                          ? isDarkMode
                            ? 'text-slate-300 font-medium'
                            : 'text-slate-700 font-medium'
                          : isDarkMode
                          ? 'text-slate-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {String(item.hour).padStart(2, '0')}
                    </span>
                    <span className="text-[8px] leading-none opacity-70">
                      {shiftInfo.icon}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* X-Axis Description */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] mt-4 pt-2 ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 font-medium text-amber-400">
              <span>☀️ กะเช้า 05:00 - 17:00 น.</span>
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 font-medium text-indigo-400">
              <span>🌙 กะดึก 18:00 - 04:00 น.</span>
            </span>
            <span>·</span>
            <span className="text-slate-500">
              (พักเปลี่ยนกะ 17-18 น. และ 04-05 น.)
            </span>
          </div>
          <div className="font-mono-numbers">
            ยอดรวมในกราฟ (Complete): <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalComplete.toLocaleString()}</span> งาน
          </div>
        </div>
      </div>
    </div>
  );
};
