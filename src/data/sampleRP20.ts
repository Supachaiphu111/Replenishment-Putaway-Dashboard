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
  const baseDate = new Date(2026, 9, 26); // 2026-10-26

  const dates = [
    formatDate(baseDate),
    formatDate(new Date(2026, 9, 25)),
    formatDate(new Date(2026, 9, 24)),
  ];

  let idCounter = 1;

  for (const dateStr of dates) {
    // Generate realistic shifts for each day
    // Day Shift: 08:00 to 17:00
    // Night Shift: 20:00 to 04:00
    const dayMultiplier = dateStr === dates[0] ? 1.0 : 0.9;

    for (let hour = 0; hour < 24; hour++) {
      // Determine activity weight based on warehouse operational patterns
      let hourWeight = 0;
      if (hour >= 8 && hour <= 11) hourWeight = 8; // Morning peak
      else if (hour === 12) hourWeight = 2; // Lunch break
      else if (hour >= 13 && hour <= 17) hourWeight = 9; // Afternoon rush
      else if (hour >= 18 && hour <= 19) hourWeight = 3; // Shift handover
      else if (hour >= 20 && hour <= 23) hourWeight = 5; // Night shift wave 1
      else if (hour >= 0 && hour <= 4) hourWeight = 3; // Night shift wave 2
      else if (hour >= 5 && hour <= 7) hourWeight = 1; // Early prep

      const taskCountThisHour = Math.round((hourWeight * 4.5 + (idCounter % 5)) * dayMultiplier);

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
