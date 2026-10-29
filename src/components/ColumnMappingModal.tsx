import React, { useState } from 'react';
import { ColumnMapping } from '../types/rp20';
import { X, Check, Settings2, HelpCircle } from 'lucide-react';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  currentMapping: ColumnMapping;
  onSaveMapping: (mapping: ColumnMapping) => void;
  isDarkMode?: boolean;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  headers,
  currentMapping,
  onSaveMapping,
  isDarkMode = true,
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>({ ...currentMapping });

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveMapping(mapping);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border transition-all ${
        isDarkMode
          ? 'liquid-glass-dark liquid-rim-glow border-white/15 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
          : 'liquid-glass-light liquid-rim-glow border-white/80 text-slate-900 shadow-2xl'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isDarkMode ? 'border-white/10 bg-slate-950/40' : 'border-slate-200/80 bg-white/50'
        }`}>
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-emerald-400" />
            <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              ตั้งค่าจับคู่คอลัมน์ Excel (Column Mapping)
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs">
          <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
            หากหัวตารางในไฟล์ Excel ของคุณใช้ชื่อแตกต่างจากมาตรฐาน RP20 คุณสามารถเลือกคอลัมน์ให้ตรงกับข้อมูลจริงได้ที่นี่:
          </p>

          {/* 1. Task Description */}
          <div>
            <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              หัวข้องาน / รายละเอียดงาน (Task Description) <span className="text-emerald-400">*</span>
            </label>
            <select
              value={mapping.taskDescriptionCol}
              onChange={(e) => setMapping({ ...mapping, taskDescriptionCol: e.target.value })}
              className={`w-full h-9 px-3 rounded-md border text-xs focus:outline-none transition-colors ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-slate-400'
              }`}
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ตัวอย่าง: Replenish Pallet, Putaway Direct, Picking</span>
          </div>

          {/* 2. Task Status */}
          <div>
            <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              สถานะงาน (Task Status) <span className="text-emerald-400">*</span>
            </label>
            <select
              value={mapping.taskStatusCol}
              onChange={(e) => setMapping({ ...mapping, taskStatusCol: e.target.value })}
              className={`w-full h-9 px-3 rounded-md border text-xs focus:outline-none transition-colors ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-slate-400'
              }`}
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ระบบจะนับยอดงานเมื่อคอลัมน์นี้มีค่าเป็น &quot;Complete&quot;</span>
          </div>

          {/* 3. By User */}
          <div>
            <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              ผู้ปฏิบัติงาน (By User) <span className="text-emerald-400">*</span>
            </label>
            <select
              value={mapping.byUserCol}
              onChange={(e) => setMapping({ ...mapping, byUserCol: e.target.value })}
              className={`w-full h-9 px-3 rounded-md border text-xs focus:outline-none transition-colors ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-slate-400'
              }`}
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ชื่อหรือรหัสพนักงานผู้ทำงานเสร็จ</span>
          </div>

          {/* 4. Latest Task Update Date */}
          <div>
            <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              วันและเวลาอัปเดตงาน (Latest Task Update Date) <span className="text-emerald-400">*</span>
            </label>
            <select
              value={mapping.completedTimeCol}
              onChange={(e) => setMapping({ ...mapping, completedTimeCol: e.target.value })}
              className={`w-full h-9 px-3 rounded-md border text-xs focus:outline-none transition-colors ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-slate-400'
              }`}
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <span className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>คอลัมน์มาตรฐาน RP20: Latest Task Update Date (ใช้จัดช่วงชั่วโมง 00:00 - 23:00 น. และวันที่)</span>
          </div>

          {/* 5. Quantity (Optional) */}
          <div>
            <label className={`block font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              จำนวนชิ้นงาน (Quantity / Units) (ถ้ามี)
            </label>
            <select
              value={mapping.quantityCol || ''}
              onChange={(e) => setMapping({ ...mapping, quantityCol: e.target.value || undefined })}
              className={`w-full h-9 px-3 rounded-md border text-xs focus:outline-none transition-colors ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-slate-400'
              }`}
            >
              <option value="">-- ไม่ระบุ (นับ 1 ต่องาน) --</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-2 px-5 py-3 border-t ${
          isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              isDarkMode
                ? 'text-slate-300 hover:bg-slate-800'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>บันทึกและประมวลผลใหม่</span>
          </button>
        </div>
      </div>
    </div>
  );
};
