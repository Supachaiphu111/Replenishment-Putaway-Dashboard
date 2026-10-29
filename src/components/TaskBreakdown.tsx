import React from 'react';
import { ListChecks, CheckCircle2 } from 'lucide-react';
import { RP20RawRecord } from '../types/rp20';
import { isStatusComplete } from '../utils/excelParser';

interface TaskBreakdownProps {
  records: RP20RawRecord[];
  onSelectDescription: (desc: string) => void;
  selectedDescriptions: string[];
  isDarkMode?: boolean;
}

export const TaskBreakdown: React.FC<TaskBreakdownProps> = ({
  records,
  onSelectDescription,
  selectedDescriptions,
  isDarkMode = true,
}) => {
  // Aggregate by task description
  const descMap: Record<string, { total: number; complete: number }> = {};
  // Aggregate by task status
  const statusMap: Record<string, number> = {};

  records.forEach((r) => {
    // Description
    if (!descMap[r.taskDescription]) {
      descMap[r.taskDescription] = { total: 0, complete: 0 };
    }
    descMap[r.taskDescription].total++;
    if (isStatusComplete(r.taskStatus)) {
      descMap[r.taskDescription].complete++;
    }

    // Status
    statusMap[r.taskStatus] = (statusMap[r.taskStatus] || 0) + 1;
  });

  const descList = Object.entries(descMap).sort((a, b) => b[1].total - a[1].total);
  const statusList = Object.entries(statusMap).sort((a, b) => b[1] - a[1]);
  const totalTasks = records.length;
  const maxDescCount = descList.length > 0 ? descList[0][1].total : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* 2 Cols: Task Description Distribution */}
      <div className={`lg:col-span-2 rounded-2xl p-5 border transition-all ${
        isDarkMode
          ? 'liquid-glass-dark liquid-rim-glow border-white/10 shadow-2xl'
          : 'liquid-glass-light liquid-rim-glow border-white/80 shadow-md'
      }`}>
        <div className={`flex items-center justify-between mb-4 pb-3 border-b ${
          isDarkMode ? 'border-white/10' : 'border-slate-200'
        }`}>
          <div>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${
              isDarkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              <ListChecks className="w-4 h-4 text-emerald-500" />
              <span>สัดส่วนประเภทงาน (Task Description Distribution)</span>
            </h3>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              เปรียบเทียบสัดส่วนงาน Replenishment, Putaway และอื่นๆ
            </p>
          </div>
          <span className={`text-xs font-mono-numbers ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {descList.length} ประเภท
          </span>
        </div>

        <div className="space-y-2.5">
          {descList.map(([desc, stats]) => {
            const isSelected = selectedDescriptions.length === 0 || selectedDescriptions.includes(desc);
            const pctOfTotal = totalTasks > 0 ? ((stats.total / totalTasks) * 100).toFixed(1) : '0';
            const compRate = stats.total > 0 ? ((stats.complete / stats.total) * 100).toFixed(0) : '0';
            const barWidth = (stats.total / maxDescCount) * 100;
            const isRepOrPut = desc.toLowerCase().includes('replenish') || desc.toLowerCase().includes('putaway');

            return (
              <div
                key={desc}
                onClick={() => onSelectDescription(desc)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? isDarkMode
                      ? 'bg-slate-950/60 border-slate-700/80 hover:border-slate-600'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    : isDarkMode
                    ? 'opacity-40 border-slate-800/40 hover:opacity-80'
                    : 'opacity-60 border-slate-100 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${
                      isRepOrPut
                        ? isDarkMode ? 'text-emerald-400' : 'text-emerald-800'
                        : isDarkMode ? 'text-slate-200' : 'text-slate-800'
                    }`}>
                      {desc}
                    </span>
                    <span className={isDarkMode ? 'text-slate-600' : 'text-slate-300'}>·</span>
                    <span className={`font-mono-numbers text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {pctOfTotal}%
                    </span>
                  </div>

                  <div className="font-mono-numbers text-xs flex items-center gap-2">
                    <span className={`font-bold ${isDarkMode ? 'text-emerald-400' : 'text-slate-900'}`}>
                      {stats.complete.toLocaleString()}
                    </span>
                    <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      / {stats.total.toLocaleString()} Complete
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-xs border font-bold ${
                      isDarkMode
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {compRate}%
                    </span>
                  </div>
                </div>

                <div className={`w-full h-1.5 rounded-full overflow-hidden flex ${
                  isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                }`}>
                  <div
                    style={{ width: `${barWidth}%` }}
                    className={`h-full rounded-full ${
                      isRepOrPut ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : isDarkMode ? 'bg-slate-600' : 'bg-slate-800'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1 Col: Status Distribution */}
      <div className={`rounded-2xl p-5 border transition-all ${
        isDarkMode
          ? 'liquid-glass-dark liquid-rim-glow border-white/10 shadow-2xl'
          : 'liquid-glass-light liquid-rim-glow border-white/80 shadow-md'
      }`}>
        <div className={`mb-4 pb-3 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <h3 className={`text-sm font-bold flex items-center gap-2 ${
            isDarkMode ? 'text-slate-100' : 'text-slate-900'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>สัดส่วนสถานะงาน (Task Status)</span>
          </h3>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            อัตราความสำเร็จและสถานะงานค้าง
          </p>
        </div>

        <div className="space-y-2.5">
          {statusList.map(([status, count]) => {
            const isComplete = isStatusComplete(status);
            const pct = totalTasks > 0 ? ((count / totalTasks) * 100).toFixed(1) : '0';

            return (
              <div
                key={status}
                className={`p-3 rounded-lg border ${
                  isDarkMode
                    ? isComplete ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-slate-950/40 border-slate-800'
                    : isComplete ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isComplete ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-amber-400'
                      }`}
                    />
                    <span className={isComplete ? (isDarkMode ? 'text-emerald-400 font-bold' : 'text-emerald-800 font-bold') : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}>
                      {status}
                    </span>
                  </div>
                  <div className="font-mono-numbers text-xs">
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{count.toLocaleString()}</span>
                    <span className={`ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>({pct}%)</span>
                  </div>
                </div>

                <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                  isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
                }`}>
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full ${isComplete ? 'bg-emerald-500' : 'bg-amber-400'}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
