import React, { useState } from 'react';
import { HourlyProductivity, ShiftType } from '../types/rp20';
import { Clock, CheckCircle2, Download, Users, ArrowUpDown, Sun, Moon } from 'lucide-react';
import { getShiftInfo, isHourInShift } from '../utils/shiftHelper';
import * as XLSX from 'xlsx';

interface HourlyCompleteTableProps {
  data: HourlyProductivity[];
  totalComplete: number;
  selectedHour?: number | null;
  onSelectHour: (hour: number | null) => void;
  selectedDate: string;
  isDarkMode?: boolean;
}

export const HourlyCompleteTable: React.FC<HourlyCompleteTableProps> = ({
  data,
  totalComplete,
  selectedHour,
  onSelectHour,
  selectedDate,
  isDarkMode = true,
}) => {
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [shiftFilter, setShiftFilter] = useState<ShiftType>('all');
  const [sortField, setSortField] = useState<'hour' | 'count'>('hour');
  const [sortAsc, setSortAsc] = useState(true);

  const displayedHours = data.filter(h => {
    if (filterActiveOnly && h.count === 0) return false;
    if (shiftFilter !== 'all' && !isHourInShift(h.hour, shiftFilter)) return false;
    return true;
  });

  const sortedHours = [...displayedHours].sort((a, b) => {
    if (sortField === 'count') {
      return sortAsc ? a.count - b.count : b.count - a.count;
    }
    return sortAsc ? a.hour - b.hour : b.hour - a.hour;
  });

  const maxHourlyCount = Math.max(...data.map(d => d.count), 1);

  // Export hourly breakdown to CSV
  const handleExportCSV = () => {
    const headers = ['ชั่วโมง (Hour)', 'ช่วงเวลา', 'กะการทำงาน (Shift)', 'ยอดงานสถานะ Complete', 'ยอดสะสม (Cumulative)', 'สัดส่วน %', 'จำนวนพนักงาน (Users Active)', 'พนักงานสูงสุดในชั่วโมง'];
    const rows = data.map(h => {
      const topUserEntry = Object.entries(h.userBreakdown).sort((a, b) => b[1] - a[1])[0];
      const topUserText = topUserEntry ? `${topUserEntry[0]} (${topUserEntry[1]} งาน)` : '-';
      const pct = totalComplete > 0 ? ((h.count / totalComplete) * 100).toFixed(1) + '%' : '0%';
      const shiftInfo = getShiftInfo(h.hour);
      return [
        String(h.hour).padStart(2, '0') + ':00',
        `${String(h.hour).padStart(2, '0')}:00 - ${String((h.hour + 1) % 24).padStart(2, '0')}:00`,
        `"${shiftInfo.name} (${shiftInfo.timeRange})"`,
        h.count,
        h.cumulativeCount,
        pct,
        h.usersActive,
        `"${topUserText}"`,
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RP20_Hourly_Complete_Summary_${selectedDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export hourly breakdown to Excel (.xlsx)
  const handleExportExcel = () => {
    const exportData = data.map(h => {
      const topUserEntry = Object.entries(h.userBreakdown).sort((a, b) => b[1] - a[1])[0];
      const topUserText = topUserEntry ? `${topUserEntry[0]} (${topUserEntry[1]} งาน)` : '-';
      const pct = totalComplete > 0 ? parseFloat(((h.count / totalComplete) * 100).toFixed(1)) : 0;
      const shiftInfo = getShiftInfo(h.hour);
      return {
        'ชั่วโมง': `${String(h.hour).padStart(2, '0')}:00`,
        'ช่วงเวลา': `${String(h.hour).padStart(2, '0')}:00 - ${String((h.hour + 1) % 24).padStart(2, '0')}:00 น.`,
        'กะการทำงาน': `${shiftInfo.name} (${shiftInfo.timeRange})`,
        'ยอดงานสถานะ Complete': h.count,
        'ยอดสะสม (Cumulative)': h.cumulativeCount,
        'สัดส่วน (%)': pct,
        'จำนวนพนักงาน (คน)': h.usersActive,
        'พนักงานสูงสุดในชั่วโมง': topUserText,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hourly Complete Summary');
    XLSX.writeFile(workbook, `RP20_Hourly_Complete_${selectedDate || 'all'}.xlsx`);
  };

  return (
    <div className={`rounded-2xl p-5 mb-6 border transition-all ${
      isDarkMode
        ? 'liquid-glass-dark liquid-rim-glow border-white/10 shadow-2xl'
        : 'liquid-glass-light liquid-rim-glow border-white/80 shadow-md'
    }`}>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b ${
        isDarkMode ? 'border-white/10' : 'border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-sm font-bold flex items-center gap-2 ${
              isDarkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ดึงยอดทุกชั่วโมงที่มีสถานะ Complete (Hourly Complete Breakdown)</span>
            </h2>
            <span className={`text-[11px] font-mono-numbers font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-md ${
              isDarkMode
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              COMPLETE 100%
            </span>
          </div>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            แจกแจงยอดงานที่เสร็จสิ้นสมบูรณ์แยกรายชั่วโมง (00:00 - 23:00 น.) ตลอด 24 ชั่วโมง
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Shift filter toggle pills with glass */}
          <div className={`flex items-center gap-1 p-0.5 rounded-xl border backdrop-blur-md ${
            isDarkMode ? 'border-white/10 bg-slate-950/50' : 'border-slate-200 bg-white/70 shadow-xs'
          }`}>
            <button
              type="button"
              onClick={() => setShiftFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                shiftFilter === 'all'
                  ? isDarkMode
                    ? 'bg-slate-800 text-white font-bold shadow-xs'
                    : 'bg-slate-900 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24 ชม.
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter('morning')}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                shiftFilter === 'morning'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-xs'
                  : 'text-amber-400/70 hover:text-amber-300'
              }`}
            >
              <Sun className="w-3 h-3 text-amber-400" />
              <span>กะเช้า (05-17)</span>
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter('night')}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                shiftFilter === 'night'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold shadow-xs'
                  : 'text-indigo-400/70 hover:text-indigo-300'
              }`}
            >
              <Moon className="w-3 h-3 text-indigo-400" />
              <span>กะดึก (18-04)</span>
            </button>
          </div>

          <button
            onClick={() => setFilterActiveOnly(!filterActiveOnly)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              filterActiveOnly
                ? isDarkMode
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : isDarkMode
                ? 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {filterActiveOnly ? '✓ เฉพาะชม.ที่มีงาน' : 'แสดงครบ 24 ชม.'}
          </button>

          <button
            onClick={handleExportCSV}
            title="ส่งออกสรุปยอดทุกชั่วโมงเป็นไฟล์ CSV"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            title="ส่งออกสรุปยอดทุกชั่วโมงเป็นไฟล์ Excel"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก Excel</span>
          </button>
        </div>
      </div>

      {/* Selected Hour Filter Indicator */}
      {selectedHour !== null && selectedHour !== undefined && (
        <div className={`mb-3 p-2.5 rounded-lg flex items-center justify-between text-xs border ${
          isDarkMode
            ? 'bg-cyan-950/40 border-cyan-800/80 text-cyan-300'
            : 'bg-indigo-50 border-indigo-200 text-indigo-900'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>
              กำลังเจาะลึกเฉพาะเวลา: <strong className="font-mono-numbers">{String(selectedHour).padStart(2, '0')}:00 - {String((selectedHour + 1) % 24).padStart(2, '0')}:00 น.</strong> (ยอด Complete: {data[selectedHour]?.count || 0} งาน)
            </span>
          </div>
          <button
            onClick={() => onSelectHour(null)}
            className="font-semibold underline cursor-pointer hover:opacity-80"
          >
            แสดงทุกชั่วโมง (Clear)
          </button>
        </div>
      )}

      {/* High-density Hourly Table */}
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
              <th className="px-3 py-2.5 min-w-[120px]">
                <button
                  onClick={() => {
                    if (sortField === 'hour') setSortAsc(!sortAsc);
                    else {
                      setSortField('hour');
                      setSortAsc(true);
                    }
                  }}
                  className={`inline-flex items-center gap-1 cursor-pointer ${
                    isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>ชั่วโมง (Hour)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>

              <th className="px-3 py-2.5 min-w-[125px]">
                กะการทำงาน (Shift)
              </th>

              <th className="px-3 py-2.5 text-right min-w-[130px]">
                <button
                  onClick={() => {
                    if (sortField === 'count') setSortAsc(!sortAsc);
                    else {
                      setSortField('count');
                      setSortAsc(false);
                    }
                  }}
                  className={`inline-flex items-center gap-1 justify-end w-full cursor-pointer ${
                    isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'
                  }`}
                >
                  <span className="text-emerald-500 font-bold">ยอดสถานะ Complete</span>
                  <ArrowUpDown className="w-3 h-3 text-emerald-500" />
                </button>
              </th>

              <th className="px-3 py-2.5 text-right min-w-[120px]">
                ยอดสะสม (Cumulative)
              </th>

              <th className="px-3 py-2.5 text-right min-w-[80px]">
                สัดส่วน %
              </th>

              <th className="px-3 py-2.5 text-center min-w-[100px]">
                พนักงาน (Users)
              </th>

              <th className="px-3 py-2.5 min-w-[200px]">
                พนักงานที่ทำสูงสุดในชั่วโมงนี้
              </th>

              <th className="px-3 py-2.5 text-center min-w-[120px]">
                ระดับยอดงาน
              </th>
            </tr>
          </thead>

          <tbody className={`divide-y font-mono-numbers ${
            isDarkMode ? 'divide-slate-800/80' : 'divide-slate-100'
          }`}>
            {sortedHours.map((h) => {
              const isSelected = selectedHour === h.hour;
              const pctOfTotal = totalComplete > 0 ? ((h.count / totalComplete) * 100).toFixed(1) : '0';
              const barWidth = maxHourlyCount > 0 ? (h.count / maxHourlyCount) * 100 : 0;
              
              const topUserEntry = Object.entries(h.userBreakdown).sort((a, b) => b[1] - a[1])[0];

              return (
                <tr
                  key={h.hour}
                  onClick={() => onSelectHour(isSelected ? null : h.hour)}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-cyan-950/60 font-medium'
                        : 'bg-indigo-50 font-medium'
                      : h.count > 0
                      ? isDarkMode
                        ? 'hover:bg-slate-800/50'
                        : 'hover:bg-slate-50'
                      : isDarkMode
                      ? 'opacity-40 hover:opacity-80'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* Hour */}
                  <td className="px-3 py-2.5 font-sans">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono-numbers font-bold text-xs ${
                        isSelected
                          ? 'text-cyan-400'
                          : isDarkMode
                          ? 'text-slate-100'
                          : 'text-slate-900'
                      }`}>
                        {String(h.hour).padStart(2, '0')}:00
                      </span>
                      <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        - {String((h.hour + 1) % 24).padStart(2, '0')}:00 น.
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-cyan-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-xs">
                          เลือก
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Shift Badge */}
                  <td className="px-3 py-2.5 font-sans">
                    {(() => {
                      const shift = getShiftInfo(h.hour);
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          shift.shift === 'morning'
                            ? isDarkMode
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                            : shift.shift === 'night'
                            ? isDarkMode
                              ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/60'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            : isDarkMode
                            ? 'bg-slate-900 text-slate-400 border border-slate-800'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          <span>{shift.icon}</span>
                          <span>{shift.name}</span>
                        </span>
                      );
                    })()}
                  </td>

                  {/* Complete Count */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className={`text-xs font-bold font-mono-numbers ${
                        h.count > 0 ? 'text-emerald-400' : isDarkMode ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      {h.count > 0 ? `${h.count.toLocaleString()} งาน` : '-'}
                    </span>
                  </td>

                  {/* Cumulative */}
                  <td className={`px-3 py-2.5 text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className="font-semibold">
                      {h.cumulativeCount > 0 ? h.cumulativeCount.toLocaleString() : '-'}
                    </span>
                  </td>

                  {/* Percentage */}
                  <td className={`px-3 py-2.5 text-right ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {h.count > 0 ? `${pctOfTotal}%` : '-'}
                  </td>

                  {/* Users active */}
                  <td className="px-3 py-2.5 text-center">
                    {h.usersActive > 0 ? (
                      <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                        isDarkMode
                          ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/60'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        <Users className="w-3 h-3" />
                        {h.usersActive} คน
                      </span>
                    ) : (
                      <span className={isDarkMode ? 'text-slate-700' : 'text-slate-300'}>-</span>
                    )}
                  </td>

                  {/* Top user */}
                  <td className="px-3 py-2.5 font-sans truncate max-w-[200px]">
                    {topUserEntry ? (
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className={`truncate font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`} title={topUserEntry[0]}>
                          {topUserEntry[0]}
                        </span>
                        <span className="text-emerald-400 font-mono-numbers font-semibold shrink-0">
                          ({topUserEntry[1]} งาน)
                        </span>
                      </div>
                    ) : (
                      <span className={`text-[11px] ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}>-</span>
                    )}
                  </td>

                  {/* Visual Bar */}
                  <td className="px-3 py-2.5">
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                      isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                    }`}>
                      <div
                        style={{ width: `${barWidth}%` }}
                        className={`h-full rounded-full transition-all ${
                          h.count === maxHourlyCount
                            ? 'bg-amber-400'
                            : h.count > 0
                            ? 'bg-emerald-500'
                            : 'bg-transparent'
                        }`}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer */}
          <tfoot className={`border-t-2 font-mono-numbers font-bold text-xs ${
            isDarkMode
              ? 'bg-slate-950 border-slate-800 text-slate-200'
              : 'bg-slate-50 border-slate-300 text-slate-900'
          }`}>
            <tr>
              <td className="px-3 py-2.5 font-sans">
                รวมยอด Complete 24 ชม.
              </td>
              <td className="px-3 py-2.5 text-right text-emerald-500 text-sm">
                {totalComplete.toLocaleString()} งาน
              </td>
              <td className="px-3 py-2.5 text-right">
                {totalComplete.toLocaleString()} งาน
              </td>
              <td className="px-3 py-2.5 text-right">
                100%
              </td>
              <td className="px-3 py-2.5 text-center font-sans">
                {data.filter(h => h.count > 0).length} ชม. ที่มีงาน
              </td>
              <td colSpan={2} className={`px-3 py-2.5 font-sans text-[11px] ${
                isDarkMode ? 'text-slate-500' : 'text-slate-500'
              }`}>
                คลิกที่แถวชั่วโมงใดๆ เพื่อกรองดูงานในชั่วโมงนั้น
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
