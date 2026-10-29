import React, { useState } from 'react';
import { X, PlusCircle, CheckCircle, Clock, User, FileText, Hash, Send } from 'lucide-react';
import { RP20RawRecord } from '../types/rp20';
import { getSavedAppsScriptUrl, isAutoSyncEnabled } from '../services/appsScriptSync';

interface LiveTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: RP20RawRecord) => void;
  availableUsers: string[];
  availableDescriptions: string[];
  isDarkMode?: boolean;
}

export const LiveTaskModal: React.FC<LiveTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  availableUsers,
  availableDescriptions,
  isDarkMode = true,
}) => {
  // Current local ISO string for datetime input: YYYY-MM-DDTHH:mm
  const getNowFormatted = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const [taskDescription, setTaskDescription] = useState(
    availableDescriptions[0] || 'Replenishment (เติมสต็อกหน้าหยิบ)'
  );
  const [customDescription, setCustomDescription] = useState('');
  const [byUser, setByUser] = useState(availableUsers[0] || 'Somchai P.');
  const [customUser, setCustomUser] = useState('');
  const [taskStatus, setTaskStatus] = useState('Complete');
  const [dateTimeStr, setDateTimeStr] = useState(getNowFormatted());
  const [quantity, setQuantity] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalDescription = customDescription.trim() || taskDescription;
    const finalUser = customUser.trim() || byUser;

    const selectedDateObj = new Date(dateTimeStr);
    const completedHour = !isNaN(selectedDateObj.getHours()) ? selectedDateObj.getHours() : new Date().getHours();
    
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateFormatted = `${selectedDateObj.getFullYear()}-${pad(selectedDateObj.getMonth() + 1)}-${pad(selectedDateObj.getDate())}`;
    const timeFormatted = `${pad(selectedDateObj.getHours())}:${pad(selectedDateObj.getMinutes())}:${pad(selectedDateObj.getSeconds())}`;
    const fullDateTime = `${dateFormatted} ${timeFormatted}`;

    const newRecord: RP20RawRecord = {
      id: `LIVE-${Date.now()}`,
      taskDescription: finalDescription,
      taskStatus: taskStatus,
      byUser: finalUser,
      completedTime: fullDateTime,
      completedDate: dateFormatted,
      completedHour: completedHour,
      quantity: Number(quantity) || 1,
      originalRow: {
        'Task ID': `TSK-LIVE-${Date.now().toString().slice(-6)}`,
        'Task Description': finalDescription,
        'Task Status': taskStatus,
        'By User': finalUser,
        'Latest Task Update Date': fullDateTime,
        Quantity: Number(quantity) || 1,
      },
    };

    onAddTask(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isDarkMode
          ? 'liquid-glass-dark liquid-rim-glow border-white/15 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.7)]'
          : 'liquid-glass-light liquid-rim-glow border-white/80 text-slate-900 shadow-2xl'
      }`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between p-5 border-b ${
          isDarkMode ? 'border-white/10 bg-slate-950/40' : 'border-slate-200/80 bg-white/50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 flex-wrap">
                <span>บันทึกงานใหม่ Real-time (Live Task Entry)</span>
                <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 backdrop-blur-md">
                  Real-time Sync
                </span>
                {Boolean(getSavedAppsScriptUrl() && isAutoSyncEnabled()) && (
                  <span className="text-[10px] font-mono-numbers px-1.5 py-0.5 rounded-sm bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                    <Send className="w-2.5 h-2.5" />
                    <span>Sheets Auto-Sync</span>
                  </span>
                )}
              </h3>
              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                บันทึกยอดงานที่เสร็จทันที ข้อมูลจะอัปเดตกราฟและเซฟลงพื้นที่เก็บข้อมูลแบบเรียลไทม์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDarkMode
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Task Status */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 flex items-center justify-between ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Task Status (สถานะงาน)</span>
              </span>
              <span className="text-[11px] font-mono-numbers text-emerald-400 font-normal">
                * ต้องเป็น Complete เพื่อนับยอด
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTaskStatus('Complete')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  taskStatus === 'Complete'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold ring-1 ring-emerald-500/40'
                    : isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Complete (นับยอด)</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskStatus('In Progress')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  taskStatus === 'In Progress'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold ring-1 ring-amber-500/40'
                    : isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span>In Progress (รอดำเนินการ)</span>
              </button>
            </div>
          </div>

          {/* By User */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>พนักงานผู้ปฏิบัติงาน (By User)</span>
            </label>
            <div className="space-y-2">
              <select
                value={byUser}
                onChange={(e) => {
                  setByUser(e.target.value);
                  if (e.target.value !== '__custom__') setCustomUser('');
                }}
                className={`w-full text-xs rounded-lg px-3 py-2 border outline-none font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-cyan-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                }`}
              >
                {availableUsers.map((u) => (
                  <option key={u} value={u} className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    {u}
                  </option>
                ))}
                <option value="__custom__" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                  + พิมพ์ชื่อพนักงานใหม่...
                </option>
              </select>

              {byUser === '__custom__' && (
                <input
                  type="text"
                  placeholder="กรอกชื่อ-นามสกุล หรือ รหัสพนักงาน"
                  value={customUser}
                  onChange={(e) => setCustomUser(e.target.value)}
                  required
                  className={`w-full text-xs rounded-lg px-3 py-2 border outline-none font-medium ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-cyan-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                />
              )}
            </div>
          </div>

          {/* Task Description */}
          <div>
            <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>หัวข้องาน (Task Description)</span>
            </label>
            <div className="space-y-2">
              <select
                value={taskDescription}
                onChange={(e) => {
                  setTaskDescription(e.target.value);
                  if (e.target.value !== '__custom__') setCustomDescription('');
                }}
                className={`w-full text-xs rounded-lg px-3 py-2 border outline-none font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                }`}
              >
                {availableDescriptions.map((desc) => (
                  <option key={desc} value={desc} className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                    {desc}
                  </option>
                ))}
                <option value="__custom__" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                  + พิมพ์หัวข้องานใหม่...
                </option>
              </select>

              {taskDescription === '__custom__' && (
                <input
                  type="text"
                  placeholder="กรอกหัวข้องาน เช่น Replenishment Pallet to Rack"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  required
                  className={`w-full text-xs rounded-lg px-3 py-2 border outline-none font-medium ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                />
              )}
            </div>
          </div>


          {/* Date & Time + Quantity Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>วัน-เวลาเสร็จงาน (Update Date)</span>
              </label>
              <input
                type="datetime-local"
                value={dateTimeStr}
                onChange={(e) => setDateTimeStr(e.target.value)}
                required
                className={`w-full text-xs rounded-lg px-3 py-2 border outline-none font-mono-numbers ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-purple-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <Hash className="w-3.5 h-3.5 text-blue-400" />
                <span>จำนวนชิ้นงาน (Quantity)</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full text-xs rounded-lg px-3 py-2 border outline-none font-mono-numbers ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                }`}
              />
            </div>
          </div>

          {/* Actions */}
          <div className={`pt-3 flex items-center justify-end gap-3 border-t ${
            isDarkMode ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                isDarkMode
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>บันทึก Real-time ทันที</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
