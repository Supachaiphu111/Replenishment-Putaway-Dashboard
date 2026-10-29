import React, { useState } from 'react';
import { RP20RawRecord } from '../types/rp20';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { isStatusComplete } from '../utils/excelParser';

interface RawDataTableProps {
  records: RP20RawRecord[];
  isDarkMode?: boolean;
}

export const RawDataTable: React.FC<RawDataTableProps> = ({
  records,
  isDarkMode = true,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const totalPages = Math.ceil(records.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentRecords = records.slice(startIndex, startIndex + pageSize);

  return (
    <div className={`rounded-2xl p-5 mb-8 border transition-all ${
      isDarkMode
        ? 'liquid-glass-dark liquid-rim-glow border-white/10 shadow-2xl'
        : 'liquid-glass-light liquid-rim-glow border-white/80 shadow-md'
    }`}>
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b ${
        isDarkMode ? 'border-white/10' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-sm font-bold flex items-center gap-2 ${
            isDarkMode ? 'text-slate-100' : 'text-slate-900'
          }`}>
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>รายการงานละเอียดจาก RP20 (Detailed Operational Task Log)</span>
          </h3>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            ข้อมูลระดับแถวพร้อมคอลัมน์ Latest Task Update Date ที่ใช้คำนวณรายชั่วโมง
          </p>
        </div>

        <div className={`flex items-center gap-3 text-xs ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <span>พบ <span className={`font-mono-numbers font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{records.length.toLocaleString()}</span> รายการ</span>
          <span>·</span>
          <span>หน้า {currentPage} / {totalPages}</span>
        </div>
      </div>

      {/* Table */}
      <div className={`overflow-x-auto border rounded-lg ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className={`font-semibold border-b ${
              isDarkMode
                ? 'bg-slate-950/90 text-slate-300 border-slate-800'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              <th className="px-3 py-2.5">รหัสงาน (Task ID)</th>
              <th className="px-3 py-2.5">หัวข้องาน (Task Description)</th>
              <th className="px-3 py-2.5">สถานะงาน (Task Status)</th>
              <th className="px-3 py-2.5">ผู้ปฏิบัติงาน (By User)</th>
              <th className="px-3 py-2.5 text-emerald-500">Latest Task Update Date</th>
              <th className="px-3 py-2.5 text-center">ชั่วโมง (Hour)</th>
              <th className="px-3 py-2.5 text-right">จำนวน (Qty)</th>
            </tr>
          </thead>
          <tbody className={`divide-y font-mono-numbers ${
            isDarkMode ? 'divide-slate-800/80' : 'divide-slate-100'
          }`}>
            {currentRecords.map((r, idx) => {
              const complete = isStatusComplete(r.taskStatus);

              return (
                <tr
                  key={r.id || idx}
                  className={`transition-colors ${
                    isDarkMode
                      ? idx % 2 === 0 ? 'bg-slate-900/60 hover:bg-slate-800/60' : 'bg-slate-950/30 hover:bg-slate-800/60'
                      : idx % 2 === 0 ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/30 hover:bg-slate-50/70'
                  }`}
                >
                  <td className={`px-3 py-2 font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {r.id}
                  </td>
                  <td className={`px-3 py-2 font-sans ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {r.taskDescription}
                  </td>
                  <td className="px-3 py-2 font-sans">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        complete ? 'text-emerald-400 font-bold' : isDarkMode ? 'text-amber-400' : 'text-amber-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          complete ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-amber-400'
                        }`}
                      />
                      {r.taskStatus}
                    </span>
                  </td>
                  <td className={`px-3 py-2 font-sans font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {r.byUser}
                  </td>
                  <td className={`px-3 py-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {r.completedTime}
                  </td>
                  <td className="px-3 py-2 text-center text-cyan-400 font-semibold">
                    {String(r.completedHour).padStart(2, '0')}:00
                  </td>
                  <td className={`px-3 py-2 text-right ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                    {r.quantity ? r.quantity.toLocaleString() : '1'}
                  </td>
                </tr>
              );
            })}

            {currentRecords.length === 0 && (
              <tr>
                <td colSpan={7} className={`px-4 py-8 text-center font-sans ${
                  isDarkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  ไม่พบรายการงานตามเงื่อนไขที่เลือก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between mt-3 pt-2 text-xs ${
          isDarkMode ? 'text-slate-400' : 'text-slate-600'
        }`}>
          <div>
            แสดง {startIndex + 1} - {Math.min(startIndex + pageSize, records.length)} จาก {records.length.toLocaleString()} รายการ
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`p-1.5 rounded-md border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono-numbers px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded-md border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
