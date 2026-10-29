export interface RP20RawRecord {
  id: string;
  taskDescription: string;
  taskStatus: string;
  byUser: string;
  completedTime: string; // ISO or formatted string
  completedDate: string; // YYYY-MM-DD
  completedHour: number; // 0 - 23
  quantity?: number;
  location?: string;
  durationMinutes?: number;
  originalRow: Record<string, unknown>;
}

export interface ColumnMapping {
  taskDescriptionCol: string;
  taskStatusCol: string;
  byUserCol: string;
  completedTimeCol: string;
  quantityCol?: string;
}

export type ShiftType = 'all' | 'morning' | 'night';

export interface FilterState {
  date: string; // 'all' or 'YYYY-MM-DD'
  user: string; // 'all' or specific user name
  taskDescriptions: string[]; // selected descriptions
  taskStatus: string; // 'Complete' | 'ALL' | custom
  selectedHour?: number | null; // specific hour 0-23 or null for all
  shift?: ShiftType; // 'all' | 'morning' (05:00-17:00) | 'night' (18:00-04:00)
  searchQuery: string;
}

export interface HourlyProductivity {
  hour: number;
  label: string; // "00:00", "01:00", ...
  count: number;
  cumulativeCount: number;
  usersActive: number;
  userBreakdown: Record<string, number>;
  shiftType?: 'morning' | 'night' | 'break';
}

export interface UserSummary {
  user: string;
  totalComplete: number;
  hourlyCounts: number[]; // length 24, index 0 to 23
  peakHour: number;
  peakVolume: number;
  avgPerHour: number;
  activeHoursCount: number;
  morningTotal?: number; // 05:00 - 17:00
  nightTotal?: number; // 18:00 - 04:00
}
