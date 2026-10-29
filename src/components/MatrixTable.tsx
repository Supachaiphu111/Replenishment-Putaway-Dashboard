import React, { useState } from 'react';
import { UserSummary, HourlyProductivity } from '../types/rp20';
import { Table, Download, FileSpreadsheet, Search, ArrowUpDown, Sun, Moon } from 'lucide-react';
import { exportMatrixToCSV, exportMatrixToExcel } from '../utils/excelParser';
import { getShiftInfo, MORNING_HOURS, NIGHT_HOURS } from '../utils/shiftHelper';

interface MatrixTableProps {
  userSummaries: UserSummary[];
  hourlyProductivity: HourlyProductivity[];
  selectedDate: string;
  onOpenGoogleSheetsExport?: () => void;
  isDarkMode?: boolean;
}

export const MatrixTable: React.FC<MatrixTableProps> = ({
  userSummaries,
  hourlyProductivity,
  selectedDate,
  onOpenGoogleSheetsExport,
  isDarkMode = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'total'>('total');
  const [sortAsc, setSortAsc] = useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Shift calculation helpers
  const getUserMorningTotal = (u: UserSummary) => {
    if (u.morningTotal !== undefined) return u.morningTotal;
    return MORNING_HOURS.reduce((sum, h) => sum + (u.hourlyCounts[h] || 0), 0);
  };

  const getUserNightTotal = (u: UserSummary) => {
    if (u.nightTotal !== undefined) return u.nightTotal;
    return NIGHT_HOURS.reduce((sum, h) => sum + (u.hourlyCounts[h] || 0), 0);
  };

  const morningTeamTotal = hourlyProductivity
    .filter(h => MORNING_HOURS.includes(h.hour))
    .reduce((acc, h) => acc + h.count, 0);

  const nightTeamTotal = hourlyProductivity
    .filter(h => NIGHT_HOURS.includes(h.hour))
    .reduce((acc, h) => acc + h.count, 0);

  // Filter users by search term
  const filteredUsers = userSummaries.filter(u =>
    u.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortField === 'name') {
      return sortAsc ? a.user.localeCompare(b.user) : b.user.localeCompare(a.user);
    }
    return sortAsc ? a.totalComplete - b.totalComplete : b.totalComplete - a.totalComplete;
  });

  // Calculate cell background intensity
  const maxCellVal = Math.max(
    ...userSummaries.flatMap(u => u.hourlyCounts),
    1
  );

  const getHeatmapColor = (val: number) => {
    if (val === 0) return isDarkMode ? 'text-slate-700' : 'text-slate-300';
    const intensity = val / maxCellVal;
    if (intensity > 0.7) {
      return isDarkMode
        ? 'bg-amber-400/25 text-amber-300 font-bold'
        : 'bg-amber-100 text-amber-900 font-bold';
    }
    if (intensity > 0.4) {
      return isDarkMode
        ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
        : 'bg-emerald-100 text-emerald-900 font-semibold';
    }
    if (intensity > 0.15) {
      return isDarkMode
        ? 'bg-slate-800 text-slate-200'
        : 'bg-slate-100 text-slate-800';
    }
    return isDarkMode ? 'text-slate-400' : 'text-slate-700';
  };

  const handleExportCSV = () => {
    exportMatrixToCSV(sortedUsers, hourlyProductivity, selectedDate);
  };

  const handleExportExcel = () => {
    exportMatrixToExcel(sortedUsers, hourlyProductivity, selectedDate);
  };

  const totalTeamTasks = hourlyProductivity.reduce((acc, h) => acc + h.count, 0);

  return (
    <div className={`rounded-2xl p-5 mb-6 border transition-all ${
      isDarkMode
        ? 'liquid-glass-dark liquid-rim-glow border-white/10 shadow-2xl'
        : 'liquid-glass-light liquid-rim-glow border-white/80 shadow-md'
    }`} id="matrix">
      {/* Header and Controls */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b ${
        isDarkMode ? 'border-white/10' : 'border-slate-200'
      }`}>
        <div>
          <h2 className={`text-sm font-bold flex items-center gap-2 ${
            isDarkMode ? 'text-slate-100' : 'text-slate-900'
          }`}>
            <Table className="w-4 h-4 text-emerald-400" />
            <span>ตาราง Matrix ยอดงาน (พนักงาน By User × 24 ชั่วโมง 00:00 - 23:00 น.)</span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            สรุปการปฏิบัติงานรายบุคคลในแต่ละช่วงชั่วโมง พร้อมการกระจายตัวแบบ Heatmap
          </p>
        </div>

        {/* Action buttons: Export CSV, Excel & Google Sheets */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {onOpenGoogleSheetsExport && (
            <button
              onClick={onOpenGoogleSheetsExport}
              title="ส่งออกไปยัง Google Sheets โดยตรง"
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-xs ${
                isDarkMode
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>ส่งออกไป Google Sheets</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            title="ส่งออกตารางเป็นไฟล์ CSV รองรับภาษาไทย UTF-8"
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            title="ส่งออกตาราง Matrix เป็นไฟล์ Excel (.xlsx)"
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>ส่งออก Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Sorting bar */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 text-xs ${
        isDarkMode ? 'text-slate-400' : 'text-slate-500'
      }`}>
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงานในตาราง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full h-8 pl-8 pr-3 text-xs rounded-md border focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
              isDarkMode
                ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span>แสดง {sortedUsers.length} คน</span>
          <span>·</span>
          <span>ระดับสีแสดงความหนาแน่นงาน</span>
        </div>
      </div>

      {/* Scrollable Matrix Table */}
      <div className={`border rounded-lg overflow-x-auto ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className={`font-semibold border-b ${
              isDarkMode
                ? 'bg-slate-950/90 text-slate-300 border-slate-800'
                : 'bg-slate-100/80 text-slate-700 border-slate-200'
            }`}>
              {/* Sticky User Column */}
              <th className={`sticky left-0 z-10 px-3 py-2.5 min-w-[180px] border-r shadow-xs ${
                isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  onClick={() => {
                    if (sortField === 'name') setSortAsc(!sortAsc);
                    else {
                      setSortField('name');
                      setSortAsc(true);
                    }
                  }}
                  className={`inline-flex items-center gap-1 cursor-pointer ${
                    isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'
                  }`}
                >
                  <span>พนักงาน (By User)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>

              {/* 24 Hours Columns */}
              {hours.map((h) => {
                const shiftInfo = getShiftInfo(h);
                return (
                  <th
                    key={h}
                    className={`px-1 py-1.5 text-center min-w-[42px] font-mono-numbers text-[11px] border-r transition-colors ${
                      isDarkMode ? 'border-slate-800/60' : 'border-slate-200/60'
                    } ${
                      shiftInfo.shift === 'morning'
                        ? isDarkMode ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50/80 text-amber-900'
                        : shiftInfo.shift === 'night'
                        ? isDarkMode ? 'bg-indigo-500/10 text-indigo-200' : 'bg-indigo-50/80 text-indigo-900'
                        : isDarkMode ? 'bg-slate-950/40 text-slate-500' : 'bg-slate-100/50 text-slate-400'
                    }`}
                    title={`${String(h).padStart(2, '0')}:00 - ${String(h).padStart(2, '0')}:59 (${shiftInfo.name})`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] leading-none select-none">{shiftInfo.icon}</span>
                      <span className="font-semibold">{String(h).padStart(2, '0')}</span>
                    </div>
                  </th>
                );
              })}

              {/* Morning Shift Column (05:00 - 17:00) */}
              <th className={`px-2.5 py-2 text-right min-w-[80px] border-r text-[11px] font-semibold ${
                isDarkMode ? 'bg-amber-950/40 text-amber-300 border-slate-800' : 'bg-amber-50 text-amber-900 border-slate-200'
              }`} title="กะเช้า 05:00 - 17:00 น. (12 ชม.)">
                <div className="flex items-center justify-end gap-1">
                  <span>☀️ กะเช้า</span>
                </div>
              </th>

              {/* Night Shift Column (18:00 - 04:00) */}
              <th className={`px-2.5 py-2 text-right min-w-[80px] border-r text-[11px] font-semibold ${
                isDarkMode ? 'bg-indigo-950/40 text-indigo-300 border-slate-800' : 'bg-indigo-50 text-indigo-900 border-slate-200'
              }`} title="กะดึก 18:00 - 04:00 น. (10 ชม.)">
                <div className="flex items-center justify-end gap-1">
                  <span>🌙 กะดึก</span>
                </div>
              </th>

              {/* Total Column */}
              <th className={`px-3 py-2 text-right min-w-[70px] border-r ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-200/70 border-slate-200'
              }`}>
                <button
                  onClick={() => {
                    if (sortField === 'total') setSortAsc(!sortAsc);
                    else {
                      setSortField('total');
                      setSortAsc(false);
                    }
                  }}
                  className={`inline-flex items-center gap-1 justify-end w-full cursor-pointer ${
                    isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'
                  }`}
                >
                  <span>รวม 24H</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>

              {/* Avg Column */}
              <th className={`px-3 py-2 text-right min-w-[65px] ${
                isDarkMode ? 'bg-slate-950/80 text-slate-300' : 'bg-slate-200/50'
              }`}>
                เฉลี่ย/ชม.
              </th>
            </tr>
          </thead>

          <tbody className={`divide-y font-mono-numbers ${
            isDarkMode ? 'divide-slate-800/80' : 'divide-slate-100'
          }`}>
            {sortedUsers.map((u, rowIdx) => (
              <tr
                key={u.user}
                className={`transition-colors ${
                  isDarkMode
                    ? rowIdx % 2 === 0 ? 'bg-slate-900/60 hover:bg-slate-800/60' : 'bg-slate-950/30 hover:bg-slate-800/60'
                    : rowIdx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/30 hover:bg-slate-50'
                }`}
              >
                {/* Sticky User cell */}
                <td className={`sticky left-0 z-10 px-3 py-2 text-xs font-sans font-medium border-r truncate max-w-[190px] ${
                  isDarkMode
                    ? 'bg-slate-900 text-slate-200 border-slate-800'
                    : 'bg-inherit text-slate-800 border-slate-200'
                }`}>
                  {u.user}
                </td>

                {/* 24 Hours cells */}
                {u.hourlyCounts.map((count, hIdx) => (
                  <td
                    key={hIdx}
                    className={`px-1 py-1.5 text-center text-[11px] border-r ${
                      isDarkMode ? 'border-slate-800/40' : 'border-slate-100'
                    } ${getHeatmapColor(count)}`}
                  >
                    {count > 0 ? count : '-'}
                  </td>
                ))}

                {/* Morning Shift Total */}
                <td className={`px-2.5 py-2 text-right font-medium border-r text-[11px] ${
                  isDarkMode
                    ? 'bg-amber-950/20 text-amber-300 border-slate-800'
                    : 'bg-amber-50/40 text-amber-900 border-slate-200'
                }`}>
                  {getUserMorningTotal(u) > 0 ? getUserMorningTotal(u).toLocaleString() : '-'}
                </td>

                {/* Night Shift Total */}
                <td className={`px-2.5 py-2 text-right font-medium border-r text-[11px] ${
                  isDarkMode
                    ? 'bg-indigo-950/20 text-indigo-300 border-slate-800'
                    : 'bg-indigo-50/40 text-indigo-900 border-slate-200'
                }`}>
                  {getUserNightTotal(u) > 0 ? getUserNightTotal(u).toLocaleString() : '-'}
                </td>

                {/* Total */}
                <td className={`px-3 py-2 text-right font-bold border-r ${
                  isDarkMode
                    ? 'bg-slate-950 text-emerald-400 border-slate-800'
                    : 'bg-slate-50 text-slate-900 border-slate-200'
                }`}>
                  {u.totalComplete.toLocaleString()}
                </td>

                {/* Avg */}
                <td className={`px-3 py-2 text-right ${
                  isDarkMode ? 'bg-slate-950/40 text-slate-300' : 'bg-slate-50/50 text-slate-600'
                }`}>
                  {u.avgPerHour.toFixed(1)}
                </td>
              </tr>
            ))}

            {sortedUsers.length === 0 && (
              <tr>
                <td colSpan={29} className={`px-4 py-8 text-center font-sans ${
                  isDarkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  ไม่พบข้อมูลพนักงานในตาราง Matrix
                </td>
              </tr>
            )}
          </tbody>

          {/* Table Footer: Hourly Totals and Cumulative Totals */}
          <tfoot className={`border-t-2 font-mono-numbers font-semibold text-xs ${
            isDarkMode ? 'border-slate-800' : 'border-slate-300'
          }`}>
            {/* Hourly Total Row */}
            <tr className={isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}>
              <td className={`sticky left-0 z-10 px-3 py-2.5 font-sans font-bold border-r ${
                isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                รวมรายชั่วโมง (Team Total)
              </td>
              {hourlyProductivity.map((h) => (
                <td
                  key={h.hour}
                  className={`px-1 py-2 text-center text-[11px] font-bold border-r ${
                    isDarkMode ? 'border-slate-800 text-emerald-400' : 'border-slate-200 text-slate-900'
                  }`}
                >
                  {h.count > 0 ? h.count : '-'}
                </td>
              ))}
              {/* Morning Shift Total */}
              <td className={`px-2.5 py-2.5 text-right font-bold border-r text-[11px] ${
                isDarkMode ? 'bg-amber-950/40 text-amber-300 border-slate-800' : 'bg-amber-100/70 text-amber-900 border-slate-200'
              }`}>
                {morningTeamTotal.toLocaleString()}
              </td>
              {/* Night Shift Total */}
              <td className={`px-2.5 py-2.5 text-right font-bold border-r text-[11px] ${
                isDarkMode ? 'bg-indigo-950/40 text-indigo-300 border-slate-800' : 'bg-indigo-100/70 text-indigo-900 border-slate-200'
              }`}>
                {nightTeamTotal.toLocaleString()}
              </td>
              <td className={`px-3 py-2.5 text-right font-bold border-r ${
                isDarkMode ? 'bg-slate-900 text-emerald-400 border-slate-800' : 'bg-slate-200 text-slate-900 border-slate-200'
              }`}>
                {totalTeamTasks.toLocaleString()}
              </td>
              <td className={`px-3 py-2.5 text-right ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                {(totalTeamTasks / 24).toFixed(1)}
              </td>
            </tr>

            {/* Cumulative Row */}
            <tr className={isDarkMode ? 'bg-emerald-950/40 text-emerald-300' : 'bg-emerald-50 text-emerald-900'}>
              <td className={`sticky left-0 z-10 px-3 py-2 font-sans font-semibold border-r ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-emerald-50 border-slate-200 text-emerald-800'
              }`}>
                ยอดสะสม (Cumulative)
              </td>
              {hourlyProductivity.map((h) => (
                <td
                  key={h.hour}
                  className={`px-1 py-1.5 text-center text-[10px] font-bold border-r ${
                    isDarkMode ? 'border-slate-800/60' : 'border-slate-200/60'
                  }`}
                >
                  {h.cumulativeCount > 0 ? h.cumulativeCount : '-'}
                </td>
              ))}
              {/* Morning Shift Share */}
              <td className={`px-2.5 py-2 text-right text-[11px] font-semibold border-r ${
                isDarkMode ? 'bg-amber-950/20 text-amber-300/90 border-slate-800' : 'bg-amber-50/60 text-amber-800 border-slate-200'
              }`}>
                {totalTeamTasks > 0 ? `${((morningTeamTotal / totalTeamTasks) * 100).toFixed(0)}%` : '0%'}
              </td>
              {/* Night Shift Share */}
              <td className={`px-2.5 py-2 text-right text-[11px] font-semibold border-r ${
                isDarkMode ? 'bg-indigo-950/20 text-indigo-300/90 border-slate-800' : 'bg-indigo-50/60 text-indigo-800 border-slate-200'
              }`}>
                {totalTeamTasks > 0 ? `${((nightTeamTotal / totalTeamTasks) * 100).toFixed(0)}%` : '0%'}
              </td>
              <td className={`px-3 py-2 text-right font-bold border-r ${
                isDarkMode ? 'bg-slate-900 text-emerald-400 border-slate-800' : 'bg-emerald-100/70 text-emerald-700 border-slate-200'
              }`}>
                {hourlyProductivity[23]?.cumulativeCount.toLocaleString() || totalTeamTasks.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right">
                100%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
