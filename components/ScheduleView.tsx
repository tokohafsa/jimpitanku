import React from 'react';
import { Member, MeetingSchedule, MemberStatus } from '../types';
import { MONTH_NAMES } from '../constants';
import { CalendarPlus, MapPin, User, CalendarDays } from 'lucide-react';

interface ScheduleViewProps {
  members: Member[];
  schedules: MeetingSchedule[];
  onAddSchedule: (schedule: MeetingSchedule) => void;
  onUpdateSchedule: (id: string, hostMemberId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ 
  members, 
  schedules, 
  onAddSchedule, 
  onUpdateSchedule 
}) => {
  
  // Hanya tampilkan anggota aktif di dropdown
  const activeMembers = members.filter(m => m.status === MemberStatus.ACTIVE);

  const handleAddNextMonth = () => {
    let nextMonthIndex = new Date().getMonth();
    let nextYear = new Date().getFullYear();

    if (schedules.length > 0) {
      const lastSchedule = schedules[schedules.length - 1];
      nextMonthIndex = lastSchedule.monthIndex + 1;
      nextYear = lastSchedule.year;

      if (nextMonthIndex > 11) {
        nextMonthIndex = 0;
        nextYear += 1;
      }
    }

    const newSchedule: MeetingSchedule = {
      id: `sched-${Date.now()}`,
      monthIndex: nextMonthIndex,
      year: nextYear,
      hostMemberId: '' // Kosongkan agar user memilih
    };

    onAddSchedule(newSchedule);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Jadwal Pertemuan</h2>
          <p className="text-slate-500">Atur lokasi tuan rumah pertemuan rutin bulanan.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-1/3">Bulan & Tahun</th>
                <th className="px-6 py-4">Lokasi Tuan Rumah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.length > 0 ? (
                schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                          <CalendarDays size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-base">{MONTH_NAMES[schedule.monthIndex]}</p>
                          <p className="text-xs text-slate-500">{schedule.year}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative max-w-sm">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <MapPin size={18} />
                        </div>
                        <select
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg appearance-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                            schedule.hostMemberId 
                              ? 'border-indigo-200 bg-indigo-50/30 text-indigo-900 font-medium' 
                              : 'border-slate-300 bg-slate-100 text-slate-500 italic'
                          }`}
                          value={schedule.hostMemberId}
                          onChange={(e) => onUpdateSchedule(schedule.id, e.target.value)}
                        >
                          <option value="">-- Pilih Tuan Rumah --</option>
                          {activeMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <User size={14} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <CalendarDays size={48} className="text-slate-200 mb-2" />
                      <p>Belum ada jadwal pertemuan dibuat.</p>
                      <p className="text-sm">Klik tombol di bawah untuk membuat jadwal bulan ini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={handleAddNextMonth}
        className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
      >
        <CalendarPlus size={20} />
        {schedules.length === 0 ? "Buat Jadwal Bulan Ini" : "Tambah Bulan Berikutnya"}
      </button>
    </div>
  );
};