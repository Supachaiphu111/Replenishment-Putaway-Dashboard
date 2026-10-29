import { RP20RawRecord } from '../types/rp20';

const EMPLOYEES = [
  'สมชาย เก่งกล้า (somchai.k)',
  'อนงค์ พรประเสริฐ (anong.p)',
  'กฤษดา ว่องไว (krisada.w)',
  'วิชัย มั่นคง (vichai.m)',
  'พัชรา ทรัพย์เจริญ (patchara.t)',
  'ณรงค์ศักดิ์ เจริญสุข (narongsak.c)',
  'สุดา วงศ์สว่าง (suda.w)',
  'ธีรภัทร ชาญชัย (theerapat.c)',
  'นันทนา สุวรรณ (nanthana.s)',
  'ชาญวิทย์ สิทธิโชค (chanwit.s)',
];

const TASK_DESCRIPTIONS = [
  'Picking (หยิบสินค้าออเดอร์)',
  'Putaway (จัดเก็บสินค้าเข้าชั้น)',
  'Replenishment (เติมสต็อกหน้าหยิบ)',
  'Cycle Count (ตรวจนับสต็อกรายวัน)',
  'Packing & Verification (ตรวจแพ็คสินค้า)',
  'Loading & Staging (จัดสินค้าเตรียมส่ง)',
  'Inventory Transfer (ย้ายตำแหน่งสต็อก)',
];

// Helper to format date YYYY-MM-DD
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function generatePreloadedRP20Data(): RP20RawRecord[] {
  const records: RP20RawRecord[] = [];

  // Multi-Month & Multi-Day Date Schedule (May 2026 to October 2026)
  const multiMonthDates = [
    // May 2026
    '2026-05-08', '2026-05-15', '2026-05-22', '2026-05-29',
    // June 2026
    '2026-06-05', '2026-06-12', '2026-06-19', '2026-06-26',
    // July 2026
    '2026-07-03', '2026-07-10', '2026-07-17', '2026-07-24', '2026-07-31',
    // August 2026
    '2026-08-07', '2026-08-14', '2026-08-21', '2026-08-28',
    // September 2026
    '2026-09-04', '2026-09-11', '2026-09-18', '2026-09-25', '2026-09-30',
    // October 2026 (Recent daily trend)
    '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26'
  ];

  let idCounter = 1;

  for (const dateStr of multiMonthDates) {
    const isRecentDaily = dateStr.startsWith('2026-10-2');
    // Recent days have full 24H operational depth; historical days have representative sampling
    const hoursToGenerate = isRecentDaily
      ? Array.from({ length: 24 }, (_, i) => i)
      : [6, 8, 9, 10, 11, 13, 14, 15, 16, 19, 21, 22, 1, 3];

    for (const hour of hoursToGenerate) {
      let hourWeight = 2;
      if (hour >= 8 && hour <= 11) hourWeight = 6;
      else if (hour === 12) hourWeight = 1;
      else if (hour >= 13 && hour <= 17) hourWeight = 7;
      else if (hour >= 19 && hour <= 23) hourWeight = 4;
      else if (hour >= 0 && hour <= 4) hourWeight = 3;

      const taskCountThisHour = isRecentDaily
        ? Math.max(1, Math.round((hourWeight * 3.2 + (idCounter % 3))))
        : Math.max(1, Math.round(hourWeight * 1.5 + (idCounter % 2)));

      for (let i = 0; i < taskCountThisHour; i++) {
        const userIndex = (i + hour * 3 + idCounter) % EMPLOYEES.length;
        const user = EMPLOYEES[userIndex];
        const taskDesc = TASK_DESCRIPTIONS[(i + hour) % TASK_DESCRIPTIONS.length];

        // 88% Complete, 6% In Progress, 4% Pending, 2% Cancelled
        const statusRand = (idCounter * 7) % 100;
        let status = 'Complete';
        if (statusRand > 94) {
          status = 'Cancelled';
        } else if (statusRand > 90) {
          status = 'Pending';
        } else if (statusRand > 86) {
          status = 'In Progress';
        }

        const minute = String((idCounter * 13) % 60).padStart(2, '0');
        const second = String((idCounter * 17) % 60).padStart(2, '0');
        const timeStr = `${dateStr} ${String(hour).padStart(2, '0')}:${minute}:${second}`;
        const qty = ((idCounter % 25) + 1) * 2;

        records.push({
          id: `RP20-${String(idCounter).padStart(6, '0')}`,
          taskDescription: taskDesc,
          taskStatus: status,
          byUser: user,
          completedTime: timeStr,
          completedDate: dateStr,
          completedHour: hour,
          quantity: qty,
          location: `LOC-${String.fromCharCode(65 + (i % 6))}-${10 + (hour % 20)}`,
          originalRow: {
            'Task ID': `RP20-${String(idCounter).padStart(6, '0')}`,
            'Task Description': taskDesc,
            'Task Status': status,
            'By User': user,
            'Latest Task Update Date': timeStr,
            'Quantity': qty,
          },
        });

        idCounter++;
      }
    }
  }

  return records;
}
