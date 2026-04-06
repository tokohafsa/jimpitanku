
import React, { useMemo } from 'react';
import { Arrear, Member, MeetingSchedule } from '../types';
import { Calendar, MapPin, Wallet, ArrowDownCircle, Search, ChevronRight } from 'lucide-react';

interface HistoryViewProps {
  arrears: Arrear[];
  members: Member[];
  schedules: MeetingSchedule[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ arrears, members, schedules }) => {
  
  // Helper to find meeting host based on date
  const getMeetingLocation = (dateString: string): string => {
    const d = new Date(dateString);
    const monthIndex = d.getMonth();
    const year = d.getFullYear();
    
    const schedule = schedules.find(s => s.monthIndex === monthIndex && s.year === year);
    if (schedule && schedule.hostMemberId) {
      const host = members.find(m => m.id === schedule.hostMemberId);
      // Removed "Rumah" prefix as requested
      return host ? host.name : 'Lokasi belum ditentukan';
    }
    return 'Tidak ada pertemuan';
  };

  // Helper formatting date
  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  // Grouping Logic
  const groupedHistory = useMemo(() => {
    const groups: Record<string, {
      date: string;
      location: string;
      totalAmount: number;
      memberAggregation: Record<string, number>;
      payersCount: number;
    }> = {};

    // Filter only PAID items
    const paidArrears = arrears.filter(a => a.status === 'LUNAS' && a.paidAt);

    paidArrears.forEach(item => {
      const dateKey = item.paidAt!;
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          location: getMeetingLocation(dateKey),
          totalAmount: 0,
          memberAggregation: {},
          payersCount: 0
        };
      }

      // Sum total amount for the group
      groups[dateKey].totalAmount += item.amount;
      
      // Sum amount for this specific member on this date to avoid duplicates
      const currentMemberSum = groups[dateKey].memberAggregation[item.memberName] || 0;
      groups[dateKey].memberAggregation[item.memberName] = currentMemberSum + item.amount;
    });

    // Convert object to array, process member aggregations, and sort descending
    return Object.values(groups)
      .map(group => {
        const displayItems = Object.entries(group.memberAggregation)
          .map(([name, amount]) => ({ name, amount }));
        
        return {
          ...group,
          displayItems,
          payersCount: displayItems.length
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  }, [arrears, schedules, members]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h2 className="text-2xl font-bold text-slate-800">Riwayat Pembayaran</h2>
        <p className="text-slate-500">Laporan pelunasan iuran dikelompokkan per tanggal transaksi.</p>
      </div>

      <div className="space-y-6 relative">
        <div className="absolute left-4 top-4 bottom-0 w-0.5 bg-slate-200 hidden md:block"></div>

        {groupedHistory.length > 0 ? (
          groupedHistory.map((group) => (
            <div key={group.date} className="relative md:pl-12">
              <div className="absolute left-0 top-6 w-8 h-8 bg-indigo-100 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-indigo-600 hidden md:flex">
                <Calendar size={14} />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 capitalize">
                      {formatFullDate(group.date)}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                      <MapPin size={14} className="text-orange-500" />
                      {group.location}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                    <Wallet size={16} className="text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">
                      Total Masuk: <span className="font-bold">Rp {group.totalAmount.toLocaleString('id-ID')}</span>
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-2 text-sm font-semibold text-slate-500">
                    {group.payersCount} Anggota Melakukan Pembayaran
                  </div>

                  <details className="group">
                    <summary className="flex items-center gap-2 text-sm font-medium text-indigo-600 cursor-pointer hover:text-indigo-700 w-fit select-none py-2">
                       <Search size={16} /> 
                       <span>Lihat Rincian Transaksi</span>
                       <ChevronRight size={16} className="transition-transform group-open:rotate-90" />
                    </summary>
                    
                    <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                      <table className="w-full text-xs text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-700">
                            <tr>
                              <th className="px-4 py-3 border-b border-slate-200">Nama Anggota</th>
                              <th className="px-4 py-3 text-right border-b border-slate-200">Jumlah Pembayaran</th>
                            </tr>
                        </thead>
                        <tbody>
                            {group.displayItems.map((item, idx) => (
                              <tr key={`${group.date}-${item.name}-${idx}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                                <td className="px-4 py-3 text-right">Rp {item.amount.toLocaleString('id-ID')}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-slate-300 text-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <ArrowDownCircle size={32} />
             </div>
             <h3 className="text-lg font-medium text-slate-900">Belum Ada Riwayat</h3>
             <p className="text-slate-500 max-w-sm">
               Belum ada data pelunasan yang tercatat. Lakukan pelunasan iuran di menu Dashboard untuk melihat riwayat di sini.
             </p>
          </div>
        )}
      </div>
    </div>
  );
};
