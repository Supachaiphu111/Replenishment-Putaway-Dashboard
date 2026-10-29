export type ShiftType = 'all' | 'morning' | 'night';

/**
 * Shift definitions per warehouse requirements:
 * กะเช้า (Morning Shift): 05:00 - 17:00 น. (Hours: 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16)
 * กะดึก (Night Shift): 18:00 - 04:00 น. (Hours: 18, 19, 20, 21, 22, 23, 0, 1, 2, 3)
 * ช่วงเปลี่ยนกะ / พัก (Transition / Handover):
 *   - 17:00 - 18:00 น. (Hour 17)
 *   - 04:00 - 05:00 น. (Hour 4)
 */

export const MORNING_HOURS: readonly number[] = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
export const NIGHT_HOURS: readonly number[] = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3];
export const BREAK_HOURS: readonly number[] = [4, 17];

export function getHourShift(hour: number): 'morning' | 'night' | 'break' {
  if (hour >= 5 && hour < 17) return 'morning';
  if ((hour >= 18 && hour <= 23) || (hour >= 0 && hour < 4)) return 'night';
  return 'break';
}

export function isHourInShift(hour: number, shift: ShiftType): boolean {
  if (shift === 'all' || !shift) return true;
  if (shift === 'morning') return hour >= 5 && hour < 17;
  if (shift === 'night') return (hour >= 18 && hour <= 23) || (hour >= 0 && hour < 4);
  return true;
}

export function getShiftInfo(hour: number): {
  shift: 'morning' | 'night' | 'break';
  name: string;
  nameEn: string;
  timeRange: string;
  icon: string;
} {
  const s = getHourShift(hour);
  if (s === 'morning') {
    return {
      shift: 'morning',
      name: 'กะเช้า',
      nameEn: 'Morning Shift',
      timeRange: '05:00 - 17:00 น.',
      icon: '☀️',
    };
  }
  if (s === 'night') {
    return {
      shift: 'night',
      name: 'กะดึก',
      nameEn: 'Night Shift',
      timeRange: '18:00 - 04:00 น.',
      icon: '🌙',
    };
  }
  return {
    shift: 'break',
    name: 'พักเปลี่ยนกะ',
    nameEn: 'Handover / Break',
    timeRange: hour === 17 ? '17:00 - 18:00 น.' : '04:00 - 05:00 น.',
    icon: '⏸️',
  };
}

export function getShiftName(shift: ShiftType): string {
  switch (shift) {
    case 'morning':
      return 'กะเช้า (05:00 - 17:00 น.)';
    case 'night':
      return 'กะดึก (18:00 - 04:00 น.)';
    case 'all':
    default:
      return 'ทั้งหมด (24 ชั่วโมง)';
  }
}
