import React from 'react';
import { Calendar, User, CheckSquare, Search, RotateCcw, Filter, Clock, Sparkles, Sun, Moon } from 'lucide-react';
import { FilterState, ShiftType } from '../types/rp20';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableDates: string[];
  availableUsers: string[];
  availableDescriptions: string[];
  availableStatuses: string[];
  totalFilteredCount: number;
  totalCompleteCount: number;
  isDarkMode?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  availableDates,
  availableUsers,
  availableDescriptions,
  availableStatuses,
  totalFilteredCount,
  totalCompleteCount,
  isDarkMode = true,
}) => {
  // Preset handler for Replenishment & Putaway
  const handlePresetSelection = (preset: 'replenish_putaway' | 'replenish_only' | 'putaway_only' | 'all') => {
    if (preset === 'all') {
      onFilterChange({ ...filters, taskDescriptions: [] });
      return;
    }

    const matched: string[] = [];
    if (preset === 'replenish_putaway' || preset === 'replenish_only') {
      const rep = availableDescriptions.filter(d => d.toLowerCase().includes('replenish') || d.includes('เติม'));
      matched.push(...rep);
    }
    if (preset === 'replenish_putaway' || preset === 'putaway_only') {
      const put = availableDescriptions.filter(d => d.toLowerCase().includes('putaway') || d.includes('จัดเก็บ'));
      matched.push(...put);
    }

    onFilterChange({
      ...filters,
      taskDescriptions: matched.length > 0 ? matched : [],
    });
  };

  // Toggle task description selection
  const handleToggleDescription = (desc: string) => {
    let newDescs: string[];
    if (filters.taskDescriptions.includes(desc)) {
      newDescs = filters.taskDescriptions.filter(d => d !== desc);
    } else {
      newDescs = [...filters.taskDescriptions, desc];
    }
    onFilterChange({ ...filters, taskDescriptions: newDescs });
  };

  const handleSelectAllDescriptions = () => {
    onFilterChange({ ...filters, taskDescriptions: [] });
  };

  const handleResetFilters = () => {
    onFilterChange({
      date: availableDates[0] || 'all',
      user: 'all',
      taskDescriptions: [],
      taskStatus: 'Complete',
      selectedHour: null,
      shift: 'all',
      searchQuery: '',
    });
  };

  // Helper to format Thai date
  const formatThaiDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'all') return 'ทุกวันที่ (All Dates)';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const monthNames = [
          'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
          'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];
        const month = monthNames[parseInt(parts[1], 10) - 1] || parts[1];
        const day = parseInt(parts[2], 10);
        return `${day} ${month} ${year}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const isAllDescriptionsSelected = filters.taskDescriptions.length === 0;

  // Detect active preset
  const isReplenishPutawayPreset =
    filters.taskDescriptions.length > 0 &&
    filters.taskDescriptions.every(d =>
      d.toLowerCase().includes('replenish') ||
      d.toLowerCase().includes('putaway') ||
      d.includes('เติม') ||
      d.includes('จัดเก็บ')
    );

  return (
    <div className={`rounded-2xl p-5 mb-6 border transition-all ${
      isDarkMode
        ? 'liquid-glass-dark liquid-rim-glow border-white/10 shadow-2xl'
        : 'liquid-glass-light liquid-rim-glow border-white/80 shadow-md'
    }`}>
      
      {/* Top Presets: Replenishment & Putaway Focus */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b ${
        isDarkMode ? 'border-white/10' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className={`text-xs font-bold uppercase tracking-wider ${
            isDarkMode ? 'text-slate-200' : 'text-slate-800'
          }`}>
            ชุดตัวกรองด่วน (Quick Presets):
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">

          <button
            type="button"
            onClick={() => handlePresetSelection('replenish_putaway')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isReplenishPutawayPreset
                ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/60 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)]'
                : isDarkMode
                ? 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 border-white/10 hover:border-white/20'
                : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-white shadow-xs'
            }`}
          >
            ⚡ Replenish &amp; Putaway
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelection('replenish_only')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            เฉพาะ Replenish
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelection('putaway_only')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            เฉพาะ Putaway
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelection('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer ${
              isAllDescriptionsSelected
                ? isDarkMode
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-slate-900 text-white border-slate-900'
                : isDarkMode
                ? 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            ทุกประเภทงาน
          </button>

          <span className={`text-xs mx-1 ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}>|</span>

          {/* Quick Shift Filter Pills */}
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, shift: 'all' })}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
              (filters.shift === 'all' || !filters.shift)
                ? isDarkMode
                  ? 'bg-slate-800 text-emerald-400 border-slate-700 font-bold'
                  : 'bg-slate-900 text-white border-slate-900 font-bold'
                : isDarkMode
                ? 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            24 ชม.
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, shift: 'morning' })}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
              filters.shift === 'morning'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold shadow-xs'
                : isDarkMode
                ? 'bg-slate-950/40 text-amber-400/80 border-slate-800 hover:text-amber-300'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Sun className="w-3 h-3 text-amber-400" />
            <span>กะเช้า (05-17)</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, shift: 'night' })}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
              filters.shift === 'night'
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 font-bold shadow-xs'
                : isDarkMode
                ? 'bg-slate-950/40 text-indigo-400/80 border-slate-800 hover:text-indigo-300'
                : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <Moon className="w-3 h-3 text-indigo-400" />
            <span>กะดึก (18-04)</span>
          </button>
        </div>
      </div>

      {/* Top Filter Controls: Date, User, Status, 24 Hours */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        
        {/* Date Dropdown */}
        <div>
          <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>วันที่ปฏิบัติงาน (Date)</span>
          </label>
          <div className="relative">
            <select
              value={filters.date}
              onChange={(e) => onFilterChange({ ...filters, date: e.target.value })}
              className={`w-full h-10 pl-3 pr-8 text-xs font-medium rounded-lg border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="all">ทุกวันที่ ({availableDates.length} วัน)</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {formatThaiDate(d)} ({d})
                </option>
              ))}
            </select>
          </div>
          <div className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            วันที่เลือก: <span className={`font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{formatThaiDate(filters.date)}</span>
          </div>
        </div>

        {/* By User Dropdown */}
        <div>
          <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>พนักงาน (By User)</span>
          </label>
          <div className="relative">
            <select
              value={filters.user}
              onChange={(e) => onFilterChange({ ...filters, user: e.target.value })}
              className={`w-full h-10 pl-3 pr-8 text-xs font-medium rounded-lg border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="all">พนักงานทั้งหมด ({availableUsers.length} คน)</option>
              {availableUsers.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            {filters.user === 'all' ? (
              <span>แสดงผลรวมพนักงานทุกคน</span>
            ) : (
              <span className={`truncate block font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-slate-800'}`}>
                {filters.user}
              </span>
            )}
          </div>
        </div>

        {/* Task Status Filter */}
        <div>
          <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>สถานะงาน (Task Status)</span>
          </label>
          <div className="relative">
            <select
              value={filters.taskStatus}
              onChange={(e) => onFilterChange({ ...filters, taskStatus: e.target.value })}
              className={`w-full h-10 pl-3 pr-8 text-xs font-semibold rounded-lg border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                isDarkMode
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
              }`}
            >
              <option value="Complete">✓ เฉพาะ Complete (นับยอดงาน)</option>
              <option value="ALL">ดูทุกสถานะ (รวม In Progress, Cancelled)</option>
              {availableStatuses
                .filter(s => s.toLowerCase() !== 'complete')
                .map((st) => (
                  <option key={st} value={st}>
                    เฉพาะ {st}
                  </option>
                ))}
            </select>
          </div>
          <div className="text-[11px] text-emerald-500 mt-1 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>นับยอดงานจาก Status = Complete</span>
          </div>
        </div>


        {/* Shift Selection: Morning 05:00-17:00, Night 18:00-04:00, or All 24H */}
        <div>
          <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>กะการทำงาน (Work Shift)</span>
          </label>
          <div className="relative">
            <select
              value={filters.shift || 'all'}
              onChange={(e) => onFilterChange({ ...filters, shift: e.target.value as ShiftType })}
              className={`w-full h-10 pl-3 pr-8 text-xs font-semibold rounded-lg border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
                filters.shift === 'morning'
                  ? isDarkMode
                    ? 'bg-amber-950/40 border-amber-600/70 text-amber-300'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                  : filters.shift === 'night'
                  ? isDarkMode
                    ? 'bg-indigo-950/40 border-indigo-600/70 text-indigo-300'
                    : 'bg-indigo-50 border-indigo-300 text-indigo-900'
                  : isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="all">24 ชั่วโมง (กะเช้า + กะดึก)</option>
              <option value="morning">☀️ กะเช้า (05:00 - 17:00 น.)</option>
              <option value="night">🌙 กะดึก (18:00 - 04:00 น.)</option>
            </select>
          </div>
          <div className={`text-[11px] mt-1 font-mono-numbers flex items-center gap-1 ${
            filters.shift === 'morning'
              ? 'text-amber-400'
              : filters.shift === 'night'
              ? 'text-indigo-400'
              : isDarkMode
              ? 'text-slate-400'
              : 'text-slate-500'
          }`}>
            {filters.shift === 'morning' && <span>☀️ กะเช้า: 05:00 - 17:00 น. (12 ชม.)</span>}
            {filters.shift === 'night' && <span>🌙 กะดึก: 18:00 - 04:00 น. (10 ชม.)</span>}
            {(!filters.shift || filters.shift === 'all') && (
              <span>กะเช้า 05-17 น. · กะดึก 18-04 น.</span>
            )}
          </div>
        </div>

      </div>

      {/* Task Description Filter Selection (Multi-select) */}
      <div className={`pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              หัวข้องาน (Task Description):
            </span>
            <span className="text-xs text-slate-500">
              {isAllDescriptionsSelected
                ? 'เลือกทั้งหมด'
                : `เลือก ${filters.taskDescriptions.length}/${availableDescriptions.length} ประเภท`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAllDescriptions}
              className="text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              เลือกทั้งหมด
            </button>
            <span className={isDarkMode ? 'text-slate-700' : 'text-slate-300'}>·</span>
            <button
              type="button"
              onClick={handleResetFilters}
              className={`text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors ${
                isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              ล้างค่าตัวกรอง
            </button>
          </div>
        </div>

        {/* Task Description buttons */}
        <div className="flex flex-wrap gap-1.5">
          {availableDescriptions.map((desc) => {
            const isSelected = isAllDescriptionsSelected || filters.taskDescriptions.includes(desc);
            const isRepOrPut = desc.toLowerCase().includes('replenish') || desc.toLowerCase().includes('putaway');

            return (
              <button
                key={desc}
                type="button"
                onClick={() => handleToggleDescription(desc)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? isDarkMode
                      ? isRepOrPut
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs'
                        : 'bg-slate-800 text-white border-slate-700 shadow-xs'
                      : isRepOrPut
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-950/40 text-slate-500 border-slate-800/80 hover:border-slate-700 hover:text-slate-300'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {desc}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input for finer queries */}
      <div className={`mt-3 pt-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs ${
        isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
      }`}>
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="ค้นหา Task Description, By User, Location..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className={`w-full h-8 pl-8 pr-3 text-xs rounded-md border focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
              isDarkMode
                ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-600'
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span>พบผลลัพธ์:</span>
          <span className={`font-mono-numbers font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {totalFilteredCount.toLocaleString()} งาน
          </span>
          <span className={isDarkMode ? 'text-slate-700' : 'text-slate-300'}>·</span>
          <span>สถานะเสร็จสิ้น:</span>
          <span className="font-mono-numbers font-semibold text-emerald-500">
            {totalCompleteCount.toLocaleString()} งาน Complete
          </span>
        </div>
      </div>

    </div>
  );
};
