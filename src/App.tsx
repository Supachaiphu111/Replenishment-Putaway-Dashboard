import React, { useState, useMemo, useEffect } from 'react';
import { RP20RawRecord, FilterState, ColumnMapping, HourlyProductivity, UserSummary } from './types/rp20';
import { isHourInShift, getHourShift } from './utils/shiftHelper';
import { generatePreloadedRP20Data } from './data/sampleRP20';
import {
  parseExcelFile,
  isStatusComplete,
  generateSampleRP20Excel,
  detectColumnMapping,
} from './utils/excelParser';
import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { FilterBar } from './components/FilterBar';
import { KpiCards } from './components/KpiCards';
import { HourlyChart } from './components/HourlyChart';
import { HourlyCompleteTable } from './components/HourlyCompleteTable';
import { CumulativeChart } from './components/CumulativeChart';
import { TopEmployeesChart } from './components/TopEmployeesChart';
import { MatrixTable } from './components/MatrixTable';
import { TaskBreakdown } from './components/TaskBreakdown';
import { RawDataTable } from './components/RawDataTable';
import { ColumnMappingModal } from './components/ColumnMappingModal';
import { LiveTaskModal } from './components/LiveTaskModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { initAuth, googleSignIn } from './services/googleAuth';
import { User } from 'firebase/auth';
import { getSavedAppsScriptUrl, isAutoSyncEnabled, syncTaskToAppsScript } from './services/appsScriptSync';
import { FileSpreadsheet, Sparkles, HelpCircle } from 'lucide-react';

const STORAGE_KEY_DATA = 'rp20_records_realtime_v2';
const STORAGE_KEY_FILE = 'rp20_filename_realtime_v2';
const STORAGE_KEY_MAPPING = 'rp20_mapping_realtime_v2';
const STORAGE_KEY_THEME = 'rp20_darkmode_realtime_v2';

export default function App() {
  // Preload realistic RP20 dataset initially or restore from realtime local storage
  const [records, setRecords] = useState<RP20RawRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not read cached records:', e);
    }
    return generatePreloadedRP20Data();
  });

  const [fileName, setFileName] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_FILE) || 'RP20_Standard_WMS_Report.xlsx';
    } catch {
      return 'RP20_Standard_WMS_Report.xlsx';
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([
    'Task ID',
    'Task Description',
    'Task Status',
    'By User',
    'Latest Task Update Date',
    'Quantity',
  ]);

  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MAPPING);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      taskDescriptionCol: 'Task Description',
      taskStatusCol: 'Task Status',
      byUserCol: 'By User',
      completedTimeCol: 'Latest Task Update Date',
      quantityCol: 'Quantity',
    };
  });

  const [sheetNames, setSheetNames] = useState<string[]>(['RP20_Tasks_Report']);
  const [activeSheet, setActiveSheet] = useState<string>('RP20_Tasks_Report');
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isLiveEntryOpen, setIsLiveEntryOpen] = useState(false);
  const [isGoogleSheetsOpen, setIsGoogleSheetsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize Firebase Auth listener for Google Workspace OAuth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setCurrentUser(user);
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return true;
  });

  // Real-time persistence states
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} น.`;
  });
  const [isSaving, setIsSaving] = useState(false);

  // Auto-save in real-time whenever records, fileName, or mapping changes
  useEffect(() => {
    setIsSaving(true);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(records));
        if (fileName) localStorage.setItem(STORAGE_KEY_FILE, fileName);
        localStorage.setItem(STORAGE_KEY_MAPPING, JSON.stringify(mapping));
        localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(isDarkMode));
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        setLastSavedTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} น.`);
      } catch (err) {
        console.warn('Real-time save warning (e.g. storage quota):', err);
      } finally {
        setIsSaving(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [records, fileName, mapping, isDarkMode]);

  // Available unique dates
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(records.map(r => r.completedDate))).filter(Boolean);
    return dates.sort((a, b) => b.localeCompare(a)); // latest date first
  }, [records]);

  // Initial Filter State
  const [filters, setFilters] = useState<FilterState>({
    date: availableDates[0] || 'all',
    user: 'all',
    taskDescriptions: [],
    taskStatus: 'Complete', // as requested: "จำนวนนับจาก Task Status สถานะ Complete"
    shift: 'all',
    selectedHour: null,
    searchQuery: '',
  });

  // Keep filter date aligned when records change
  useEffect(() => {
    if (availableDates.length > 0 && (!filters.date || !availableDates.includes(filters.date))) {
      setFilters(prev => ({ ...prev, date: availableDates[0] }));
    }
  }, [availableDates]);

  // Available Users
  const availableUsers = useMemo(() => {
    const users = Array.from(new Set(records.map(r => r.byUser))).filter(Boolean);
    return users.sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Available Descriptions
  const availableDescriptions = useMemo(() => {
    const descs = Array.from(new Set(records.map(r => r.taskDescription))).filter(Boolean);
    return descs.sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Available Task Statuses
  const availableStatuses = useMemo(() => {
    const statuses = Array.from(new Set(records.map(r => r.taskStatus))).filter(Boolean);
    return statuses.sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Handle Excel Upload
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await parseExcelFile(file);
      setRecords(result.records);
      setHeaders(result.headers);
      setMapping(result.mapping);
      setSheetNames(result.sheetNames);
      setActiveSheet(result.activeSheet);
      setFileName(file.name);
      
      // Auto set date filter to newest date in uploaded file
      const newDates = Array.from(new Set(result.records.map(r => r.completedDate))).filter(Boolean).sort().reverse();
      setFilters(prev => ({
        ...prev,
        date: newDates[0] || 'all',
        user: 'all',
        taskDescriptions: [],
        taskStatus: 'Complete',
        searchQuery: '',
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-process records when user updates column mapping
  const handleSaveMapping = (newMapping: ColumnMapping) => {
    setMapping(newMapping);
    const updatedRecords = records.map(r => {
      const original = r.originalRow;
      const desc = String(original[newMapping.taskDescriptionCol] ?? r.taskDescription).trim();
      const st = String(original[newMapping.taskStatusCol] ?? r.taskStatus).trim();
      const usr = String(original[newMapping.byUserCol] ?? r.byUser).trim();
      return {
        ...r,
        taskDescription: desc,
        taskStatus: st,
        byUser: usr,
      };
    });
    setRecords(updatedRecords);
  };

  // Load sample dataset
  const handleLoadSample = () => {
    const sample = generatePreloadedRP20Data();
    setRecords(sample);
    setFileName('RP20_Standard_WMS_Report.xlsx');
    setError(null);
    const dates = Array.from(new Set(sample.map(r => r.completedDate))).sort().reverse();
    setFilters({
      date: dates[0] || 'all',
      user: 'all',
      taskDescriptions: [],
      taskStatus: 'Complete',
      selectedHour: null,
      searchQuery: '',
    });
  };

  // Handle Import from Google Sheets
  const handleGoogleSheetsImport = (
    newRecords: RP20RawRecord[],
    newHeaders: string[],
    newMapping: ColumnMapping,
    sheetName: string,
    spreadsheetTitle: string
  ) => {
    setRecords(newRecords);
    setHeaders(newHeaders);
    setMapping(newMapping);
    setSheetNames([sheetName]);
    setActiveSheet(sheetName);
    setFileName(`${spreadsheetTitle} [${sheetName}]`);
    setError(null);

    const newDates = Array.from(new Set(newRecords.map(r => r.completedDate))).filter(Boolean).sort().reverse();
    setFilters({
      date: newDates[0] || 'all',
      user: 'all',
      taskDescriptions: [],
      taskStatus: 'Complete',
      selectedHour: null,
      searchQuery: '',
    });
  };

  // Add Real-time Live Task (instantly auto-saved & reflected across charts)
  const handleLiveAddTask = (newTask: RP20RawRecord) => {
    setRecords(prev => [newTask, ...prev]);
    // If filtering a specific date and new task is on a different date, switch to new task's date so user sees it
    if (filters.date !== 'all' && filters.date !== newTask.completedDate) {
      setFilters(prev => ({ ...prev, date: newTask.completedDate }));
    }

    // Auto-sync to Google Sheet via Apps Script if configured
    const appsScriptUrl = getSavedAppsScriptUrl();
    if (appsScriptUrl && isAutoSyncEnabled()) {
      syncTaskToAppsScript(appsScriptUrl, newTask).catch(err => {
        console.warn('Apps Script auto-sync warning:', err);
      });
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    generateSampleRP20Excel(records.slice(0, 50));
  };

  // Pre-shift filtered records based on interactive controls (date, user, status, description, search)
  const preShiftFilteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Date filter
      if (filters.date !== 'all' && r.completedDate !== filters.date) {
        return false;
      }

      // 2. By User filter
      if (filters.user !== 'all' && r.byUser !== filters.user) {
        return false;
      }

      // 3. Task Description filter (multi-select: if empty, select all)
      if (filters.taskDescriptions.length > 0 && !filters.taskDescriptions.includes(r.taskDescription)) {
        return false;
      }

      // 4. Task Status filter
      if (filters.taskStatus === 'Complete') {
        if (!isStatusComplete(r.taskStatus)) return false;
      } else if (filters.taskStatus !== 'ALL') {
        if (r.taskStatus.toLowerCase() !== filters.taskStatus.toLowerCase()) return false;
      }

      // 5. Search query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const match =
          r.taskDescription.toLowerCase().includes(q) ||
          r.byUser.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          (r.location && r.location.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [records, filters.date, filters.user, filters.taskDescriptions, filters.taskStatus, filters.searchQuery]);

  // Overall shift counts for morning (05:00-17:00) vs night (18:00-04:00)
  const { morningShiftCount, nightShiftCount } = useMemo(() => {
    let morning = 0;
    let night = 0;
    preShiftFilteredRecords.forEach((r) => {
      if (!isStatusComplete(r.taskStatus)) return;
      if (isHourInShift(r.completedHour, 'morning')) morning++;
      else if (isHourInShift(r.completedHour, 'night')) night++;
    });
    return { morningShiftCount: morning, nightShiftCount: night };
  }, [preShiftFilteredRecords]);

  // Base filtered records (applying shift filter if selected: all, morning, night)
  const baseFilteredRecords = useMemo(() => {
    const activeShift = filters.shift;
    if (activeShift && activeShift !== 'all') {
      return preShiftFilteredRecords.filter(r => isHourInShift(r.completedHour, activeShift));
    }
    return preShiftFilteredRecords;
  }, [preShiftFilteredRecords, filters.shift]);

  // Filtered records (isolated to selected hour if user clicked an hour to drill-down)
  const filteredRecords = useMemo(() => {
    if (filters.selectedHour !== null && filters.selectedHour !== undefined) {
      return baseFilteredRecords.filter(r => r.completedHour === filters.selectedHour);
    }
    return baseFilteredRecords;
  }, [baseFilteredRecords, filters.selectedHour]);

  // Calculate Hourly Productivity across all 24 hours (STRICTLY counting Task Status Complete)
  const hourlyProductivity: HourlyProductivity[] = useMemo(() => {
    const hourlyData: HourlyProductivity[] = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      count: 0,
      cumulativeCount: 0,
      usersActive: 0,
      userBreakdown: {},
      shiftType: getHourShift(h),
    }));

    // Group baseFilteredRecords by hour (STRICTLY counting Task Status Complete)
    const hourUsersMap: Record<number, Set<string>> = {};
    for (let h = 0; h < 24; h++) hourUsersMap[h] = new Set();

    baseFilteredRecords.forEach((r) => {
      // Must have Task Status Complete to be counted in hourly productivity
      if (!isStatusComplete(r.taskStatus)) return;

      const h = r.completedHour;
      if (h >= 0 && h < 24) {
        hourlyData[h].count++;
        hourlyData[h].userBreakdown[r.byUser] = (hourlyData[h].userBreakdown[r.byUser] || 0) + 1;
        hourUsersMap[h].add(r.byUser);
      }
    });

    // Populate active users count and cumulative counts
    let runningCumulative = 0;
    hourlyData.forEach((hObj) => {
      hObj.usersActive = hourUsersMap[hObj.hour].size;
      runningCumulative += hObj.count;
      hObj.cumulativeCount = runningCumulative;
    });

    return hourlyData;
  }, [baseFilteredRecords]);

  // Calculate By User Summaries (STRICTLY counting Task Status Complete)
  const userSummaries: UserSummary[] = useMemo(() => {
    const map: Record<string, { total: number; hourly: number[]; morningTotal: number; nightTotal: number }> = {};

    filteredRecords.forEach((r) => {
      // Must have Task Status Complete to be counted in user productivity
      if (!isStatusComplete(r.taskStatus)) return;

      if (!map[r.byUser]) {
        map[r.byUser] = { total: 0, hourly: new Array(24).fill(0), morningTotal: 0, nightTotal: 0 };
      }
      map[r.byUser].total++;
      if (r.completedHour >= 0 && r.completedHour < 24) {
        map[r.byUser].hourly[r.completedHour]++;
        if (isHourInShift(r.completedHour, 'morning')) {
          map[r.byUser].morningTotal++;
        } else if (isHourInShift(r.completedHour, 'night')) {
          map[r.byUser].nightTotal++;
        }
      }
    });

    return Object.entries(map).map(([user, data]) => {
      let peakHour = 0;
      let peakVol = 0;
      let activeHours = 0;

      data.hourly.forEach((cnt, h) => {
        if (cnt > peakVol) {
          peakVol = cnt;
          peakHour = h;
        }
        if (cnt > 0) activeHours++;
      });

      const avgPerHour = activeHours > 0 ? data.total / activeHours : 0;

      return {
        user,
        totalComplete: data.total,
        hourlyCounts: data.hourly,
        peakHour,
        peakVolume: peakVol,
        avgPerHour,
        activeHoursCount: activeHours,
        morningTotal: data.morningTotal,
        nightTotal: data.nightTotal,
      };
    });
  }, [filteredRecords]);

  // Overall KPIs
  const totalFilteredCount = filteredRecords.length;
  const totalCompleteCount = useMemo(() => {
    return filteredRecords.filter(r => isStatusComplete(r.taskStatus)).length;
  }, [filteredRecords]);

  const activeUsersCount = userSummaries.length;

  const { peakHour, peakVolume } = useMemo(() => {
    let maxHour = 0;
    let maxVol = 0;
    hourlyProductivity.forEach(h => {
      if (h.count > maxVol) {
        maxVol = h.count;
        maxHour = h.hour;
      }
    });
    return { peakHour: maxHour, peakVolume: maxVol };
  }, [hourlyProductivity]);

  const avgPerHour = useMemo(() => {
    const hoursWithWork = hourlyProductivity.filter(h => h.count > 0).length || 1;
    return totalCompleteCount / hoursWithWork;
  }, [hourlyProductivity, totalCompleteCount]);

  const totalQuantity = useMemo(() => {
    return filteredRecords
      .filter(r => isStatusComplete(r.taskStatus))
      .reduce((acc, r) => acc + (r.quantity || 1), 0);
  }, [filteredRecords]);

  const dailyTotalComplete = useMemo(() => {
    return hourlyProductivity.reduce((acc, h) => acc + h.count, 0);
  }, [hourlyProductivity]);

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors relative overflow-x-hidden ${
      isDarkMode
        ? 'bg-slate-950 tech-grid-bg text-slate-100'
        : 'bg-slate-50 tech-grid-bg-light text-slate-900'
    }`}>
      {/* Ambient Fluid Background Orbs for Liquid Glass Refraction */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        {isDarkMode ? (
          <>
            <div className="absolute -top-40 -left-40 w-[550px] h-[550px] rounded-full bg-emerald-500/12 blur-[100px] animate-liquid-orb-1" />
            <div className="absolute top-1/4 -right-40 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[110px] animate-liquid-orb-2" />
            <div className="absolute -bottom-40 left-1/3 w-[650px] h-[650px] rounded-full bg-indigo-500/14 blur-[120px] animate-liquid-orb-3" />
            <div className="absolute top-2/3 right-1/4 w-[450px] h-[450px] rounded-full bg-amber-500/8 blur-[90px] animate-liquid-orb-1" />
          </>
        ) : (
          <>
            <div className="absolute -top-40 -left-40 w-[550px] h-[550px] rounded-full bg-emerald-300/25 blur-[100px] animate-liquid-orb-1" />
            <div className="absolute top-1/4 -right-40 w-[600px] h-[600px] rounded-full bg-cyan-300/25 blur-[110px] animate-liquid-orb-2" />
            <div className="absolute -bottom-40 left-1/3 w-[650px] h-[650px] rounded-full bg-indigo-200/25 blur-[120px] animate-liquid-orb-3" />
            <div className="absolute top-2/3 right-1/4 w-[450px] h-[450px] rounded-full bg-amber-200/25 blur-[90px] animate-liquid-orb-1" />
          </>
        )}
      </div>

      {/* Top Bar Contract Header */}
      <Header
        onOpenUpload={() => {
          const el = document.getElementById('upload-area');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        onResetSample={handleLoadSample}
        onDownloadSample={handleDownloadTemplate}
        onOpenLiveEntry={() => setIsLiveEntryOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
        currentUser={currentUser}
        recordCount={records.length}
        fileName={fileName}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(prev => !prev)}
        lastSavedTime={lastSavedTime}
        isSaving={isSaving}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-0">
        
        {/* Upload & Integration Area */}
        <div id="upload-area">
          <UploadSection
                onFileUpload={handleFileUpload}
                isLoading={isLoading}
                error={error}
                fileName={fileName}
                recordCount={records.length}
                mapping={mapping}
                onOpenMappingModal={() => setIsMappingModalOpen(true)}
                onLoadSample={handleLoadSample}
                onDownloadTemplate={handleDownloadTemplate}
                onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Filter Controls Bar */}
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              availableDates={availableDates}
              availableUsers={availableUsers}
              availableDescriptions={availableDescriptions}
              availableStatuses={availableStatuses}
              totalFilteredCount={totalFilteredCount}
              totalCompleteCount={totalCompleteCount}
              isDarkMode={isDarkMode}
            />

            {/* Metric KPI Cards */}
            <KpiCards
              totalTasks={totalFilteredCount}
              totalComplete={totalCompleteCount}
              activeUsersCount={activeUsersCount}
              peakHour={peakHour}
              peakVolume={peakVolume}
              avgPerHour={avgPerHour}
              totalQuantity={totalQuantity}
              morningShiftCount={morningShiftCount}
              nightShiftCount={nightShiftCount}
              activeShift={filters.shift || 'all'}
              onSelectShift={(s) => setFilters(prev => ({ ...prev, shift: s, selectedHour: null }))}
              isDarkMode={isDarkMode}
            />

            {/* Chart 1: Hourly Productivity (รายชั่วโมง 00:00 - 23:00 น.) */}
            <HourlyChart
              data={hourlyProductivity}
              peakHour={peakHour}
              totalComplete={dailyTotalComplete}
              selectedHour={filters.selectedHour}
              onSelectHour={(h) => setFilters(prev => ({ ...prev, selectedHour: h }))}
              isDarkMode={isDarkMode}
            />

            {/* ดึงยอดทุกชม. ที่มีสถานะ Complete */}
            <div id="hourly-complete">
              <HourlyCompleteTable
                data={hourlyProductivity}
                totalComplete={dailyTotalComplete}
                selectedHour={filters.selectedHour}
                onSelectHour={(h) => setFilters(prev => ({ ...prev, selectedHour: h }))}
                selectedDate={filters.date}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Chart 2: Cumulative Hourly Chart (ยอดสะสมรายชม พร้อมแสดงตัวเลขสะสมกำกับ) */}
            <CumulativeChart
              data={hourlyProductivity}
              totalComplete={dailyTotalComplete}
              isDarkMode={isDarkMode}
            />

            {/* Matrix Table: พนักงาน x ชั่วโมง พร้อมปุ่ม Export CSV, Excel และ Google Sheets */}
            <MatrixTable
              userSummaries={userSummaries}
              hourlyProductivity={hourlyProductivity}
              selectedDate={filters.date}
              onOpenGoogleSheetsExport={() => setIsGoogleSheetsOpen(true)}
              isDarkMode={isDarkMode}
            />

            {/* Two-Column Split: Top Employees Ranking + Task Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <TopEmployeesChart
                userSummaries={userSummaries}
                selectedUser={filters.user}
                onSelectUser={(u) => setFilters(prev => ({ ...prev, user: u }))}
                totalTeamComplete={totalCompleteCount}
                isDarkMode={isDarkMode}
              />

              <TaskBreakdown
                records={filteredRecords}
                onSelectDescription={(desc) => {
                  setFilters(prev => {
                    const exists = prev.taskDescriptions.includes(desc);
                    return {
                      ...prev,
                      taskDescriptions: exists
                        ? prev.taskDescriptions.filter(d => d !== desc)
                        : [...prev.taskDescriptions, desc],
                    };
                  });
                }}
                selectedDescriptions={filters.taskDescriptions}
                isDarkMode={isDarkMode}
              />
            </div>

        {/* Raw Task Logs Table */}
        <RawDataTable records={filteredRecords} isDarkMode={isDarkMode} />

      </main>

      {/* Google Sheets Integration Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsOpen}
        onClose={() => setIsGoogleSheetsOpen(false)}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        onImportComplete={handleGoogleSheetsImport}
        currentRecords={filteredRecords.filter(r => isStatusComplete(r.taskStatus))}
        hourlyProductivity={hourlyProductivity}
        userSummaries={userSummaries}
        isDarkMode={isDarkMode}
      />

      {/* Column Mapping Modal */}
      <ColumnMappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        headers={headers}
        currentMapping={mapping}
        onSaveMapping={handleSaveMapping}
        isDarkMode={isDarkMode}
      />

      {/* Live Real-time Task Entry Modal */}
      <LiveTaskModal
        isOpen={isLiveEntryOpen}
        onClose={() => setIsLiveEntryOpen(false)}
        onAddTask={handleLiveAddTask}
        availableUsers={availableUsers}
        availableDescriptions={availableDescriptions}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
