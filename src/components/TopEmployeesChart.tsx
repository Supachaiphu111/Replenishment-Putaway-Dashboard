import React, { useState } from 'react';
import { UserSummary } from '../types/rp20';
import { Award, UserCheck, ArrowUpDown } from 'lucide-react';

interface TopEmployeesChartProps {
  userSummaries: UserSummary[];
  selectedUser: string;
  onSelectUser: (user: string) => void;
  totalTeamComplete: number;
  isDarkMode?: boolean;
}

export const TopEmployeesChart: React.FC<TopEmployeesChartProps> = ({
  userSummaries,
  selectedUser,
  onSelectUser,
  totalTeamComplete,
  isDarkMode = true,
}) => {
  const [sortBy, setSortBy] = useState<'total' | 'avg'>('total');
  const [showAll, setShowAll] = useState<boolean>(false);

  const sortedUsers = [...userSummaries].sort((a, b) => {
    if (sortBy === 'total') return b.totalComplete - a.totalComplete;
    return b.avgPerHour - a.avgPerHour;
  });

  // Restrict to Top 10 by default as requested
  const displayedUsers = showAll ? sortedUsers : sortedUsers.slice(0, 10);
  const maxTotal = Math.max(...userSummaries.map(u => u.totalComplete), 1);

  return (
    <div className={`rounded-2xl p-5 mb-6 border transition-all ${
      isDarkMode
        ? 'liquid-glass-dark liquid-rim-glow border-white/10 shadow-2xl'
        : 'liquid-glass-light liquid-rim-glow border-white/80 shadow-md'
    }`} id="staff">
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b ${
        isDarkMode ? 'border-white/10' : 'border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={`text-sm font-bold flex items-center gap-2 ${
              isDarkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              <Award className="w-4 h-4 text-amber-300" />
              <span>จัดอันดับยอดงานพนักงาน (Operator Performance Leaderboard)</span>
            </h2>
            <span className={`text-[10px] font-mono-numbers font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-md ${
              isDarkMode
                ? 'bg-amber-400/15 text-amber-200 border-amber-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {showAll ? `แสดงทั้งหมด (${sortedUsers.length} คน)` : '10 อันดับแรก (Top 10)'}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            เปรียบเทียบผลงานจากช่อง By User (สถานะ Complete เท่านั้น · คลิกที่ชื่อเพื่อกรองข้อมูล)
          </p>
        </div>

        {/* Controls: Sort and Toggle Top 10 */}
        <div className="flex items-center gap-2 flex-wrap">
          {sortedUsers.length > 10 && (
            <button
              onClick={() => setShowAll(prev => !prev)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {showAll ? 'ย่อเหลือ 10 อันดับ' : `ดูทั้งหมด (${sortedUsers.length})`}
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <span className={`text-xs hidden sm:inline ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>เรียง:</span>
            <div className={`flex items-center gap-1 p-0.5 rounded-lg text-xs border ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setSortBy('total')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  sortBy === 'total'
                    ? isDarkMode ? 'bg-slate-800 text-white font-bold' : 'bg-white text-slate-900 shadow-xs'
                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ยอดรวมงานเสร็จ
              </button>
              <button
                onClick={() => setSortBy('avg')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors cursor-pointer ${
                  sortBy === 'avg'
                    ? isDarkMode ? 'bg-slate-800 text-white font-bold' : 'bg-white text-slate-900 shadow-xs'
                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เฉลี่ย/ชม.
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard list with visual progress bars */}
      <div className="space-y-2.5">
        {displayedUsers.map((item, index) => {
          const isSelected = selectedUser === item.user;
          const sharePct = totalTeamComplete > 0 ? ((item.totalComplete / totalTeamComplete) * 100).toFixed(1) : '0';
          const barWidthPct = (item.totalComplete / maxTotal) * 100;
          const rank = index + 1;

          return (
            <div
              key={item.user}
              onClick={() => onSelectUser(isSelected ? 'all' : item.user)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? isDarkMode
                    ? 'bg-cyan-950/40 border-cyan-500/80 ring-2 ring-cyan-500/30'
                    : 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                  : index === 0
                  ? isDarkMode
                    ? 'bg-slate-950/70 border-amber-500/30 hover:border-amber-500/60'
                    : 'bg-amber-50/30 border-amber-200 hover:border-amber-300'
                  : isDarkMode
                  ? 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/80'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Rank Badge */}
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono-numbers font-bold shrink-0 ${
                      rank === 1
                        ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-xs shadow-amber-500/40 font-extrabold'
                        : rank === 2
                        ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 font-bold'
                        : rank === 3
                        ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white font-bold'
                        : isDarkMode
                        ? 'bg-slate-800/90 text-slate-400 border border-slate-700/60'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {rank}
                  </span>

                  {/* Name */}
                  <span className={`text-xs font-semibold truncate ${
                    isDarkMode ? 'text-slate-200' : 'text-slate-900'
                  }`}>
                    {item.user}
                  </span>

                  {rank === 1 && (
                    <span className="text-[10px] bg-amber-400/15 text-amber-400 border border-amber-400/30 px-1.5 py-0.2 rounded-xs font-semibold hidden sm:inline">
                      อันดับ 1
                    </span>
                  )}

                  {isSelected && (
                    <span className="text-[10px] bg-cyan-500 text-slate-950 px-1.5 py-0.2 rounded-xs font-bold">
                      กำลังเลือก
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-4 text-xs font-mono-numbers shrink-0">
                  <div className="text-right">
                    <span className={`font-bold ${isDarkMode ? 'text-emerald-400' : 'text-slate-900'}`}>
                      {item.totalComplete.toLocaleString()}
                    </span>
                    <span className={`text-[11px] ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>งาน</span>
                  </div>
                  <div className="text-right hidden sm:block">
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                      {item.avgPerHour.toFixed(1)}
                    </span>
                    <span className={`text-[11px] ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>งาน/ชม.</span>
                  </div>
                  <div className={`text-right text-[11px] hidden md:block ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    สัดส่วน {sharePct}%
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className={`w-full h-1.5 rounded-full overflow-hidden flex ${
                isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
              }`}>
                <div
                  style={{ width: `${barWidthPct}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    rank === 1
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-sm shadow-amber-400/30'
                      : rank === 2
                      ? 'bg-cyan-400'
                      : rank === 3
                      ? 'bg-emerald-400'
                      : isDarkMode
                      ? 'bg-slate-600'
                      : 'bg-slate-400'
                  }`}
                />
              </div>

              {/* Sub-info */}
              <div className={`flex items-center justify-between text-[11px] mt-1.5 ${
                isDarkMode ? 'text-slate-500' : 'text-slate-500'
              }`}>
                <span>
                  ชั่วโมงพีค: <span className={`font-mono-numbers font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{String(item.peakHour).padStart(2, '0')}:00 น.</span> ({item.peakVolume} งาน)
                </span>
                <span>
                  ชั่วโมงที่ทำงาน: <span className={`font-mono-numbers font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.activeHoursCount} ชม.</span>
                </span>
              </div>
            </div>
          );
        })}

        {userSummaries.length === 0 && (
          <div className={`text-center py-8 text-xs ${isDarkMode ? 'text-slate-600' : 'text-slate-500'}`}>
            ไม่พบข้อมูลพนักงานตามเงื่อนไขตัวกรอง
          </div>
        )}
      </div>

      {/* Footer count indicator */}
      {sortedUsers.length > 10 && !showAll && (
        <div className={`mt-3 pt-2 text-center text-xs border-t ${
          isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'
        }`}>
          แสดง 10 อันดับแรก จากพนักงานทั้งหมด {sortedUsers.length} คน{' '}
          <button
            onClick={() => setShowAll(true)}
            className="text-cyan-400 hover:underline font-medium cursor-pointer ml-1"
          >
            กดดูพนักงานทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
};
