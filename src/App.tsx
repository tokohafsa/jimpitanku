import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DashboardView } from './components/DashboardView';
import { MemberView } from './components/MemberView';
import { ScheduleView } from './components/ScheduleView';
import { Member, Arrear, MeetingSchedule, ViewState } from './types';
import { 
  getMembers, saveMembers, 
  getArrears, saveArrears, 
  getSchedules, saveSchedules 
} from './services/storageService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [members, setMembers] = useState<Member[]>([]);
  const [arrears, setArrears] = useState<Arrear[]>([]);
  const [schedules, setSchedules] = useState<MeetingSchedule[]>([]);

  // Load initial data from Local Storage (Synchronous & Offline)
  useEffect(() => {
    setMembers(getMembers());
    setArrears(getArrears());
    setSchedules(getSchedules());
  }, []);

  // Handlers for data mutation
  const handleAddMember = (newMember: Member) => {
    const updatedMembers = [...members, newMember];
    setMembers(updatedMembers);
    saveMembers(updatedMembers);
  };

  const handleDeleteMember = (id: string) => {
    const updatedMembers = members.filter(m => m.id !== id);
    setMembers(updatedMembers);
    saveMembers(updatedMembers);
  };

  const handleAddArrear = (newArrear: Arrear) => {
    const updatedArrears = [...arrears, newArrear];
    setArrears(updatedArrears);
    saveArrears(updatedArrears);
  };

  const handlePayArrear = (id: string, date: string) => {
    const updatedArrears = arrears.map(a => 
      a.id === id ? { ...a, status: 'LUNAS', paidAt: date } as Arrear : a
    );
    setArrears(updatedArrears);
    saveArrears(updatedArrears);
  };

  // Logika Pembayaran Hutang (Algoritma Lokal)
  const handlePayMemberDebt = (memberId: string, date: string, amount: number) => {
    let remainingPayment = amount;
    if (remainingPayment <= 0) return;

    // Ambil tunggakan aktif anggota ini, urutkan dari yang terlama
    const memberActiveArrears = arrears
      .filter(a => a.memberId === memberId && a.status === 'BELUM_LUNAS')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const updates = new Map<string, Arrear>();
    const newPaidItems: Arrear[] = [];

    for (const item of memberActiveArrears) {
      if (remainingPayment <= 0) break;

      if (remainingPayment >= item.amount) {
        // 1. Bayar Lunas item ini
        updates.set(item.id, { 
          ...item, 
          status: 'LUNAS', 
          paidAt: date 
        });
        remainingPayment -= item.amount;
      } else {
        // 2. Bayar Sebagian (Parsial)
        
        // a. Buat item baru khusus untuk yang SUSAH dibayar (LUNAS)
        const paidPortion: Arrear = {
          ...item,
          id: `${item.id}-paid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: `${item.title} (Parsial)`,
          amount: remainingPayment,
          status: 'LUNAS',
          paidAt: date,
        };
        newPaidItems.push(paidPortion);

        // b. Update item lama sisa tagihannya (BELUM LUNAS)
        updates.set(item.id, {
          ...item,
          amount: item.amount - remainingPayment,
        });

        remainingPayment = 0;
      }
    }

    // Gabungkan update ke dalam state utama
    const updatedArrearsList = arrears.map(a => {
      if (updates.has(a.id)) {
        return updates.get(a.id)!;
      }
      return a;
    });

    const finalArrears = [...updatedArrearsList, ...newPaidItems];

    setArrears(finalArrears);
    saveArrears(finalArrears);
  };

  // Schedule Handlers
  const handleAddSchedule = (schedule: MeetingSchedule) => {
    const updatedSchedules = [...schedules, schedule];
    setSchedules(updatedSchedules);
    saveSchedules(updatedSchedules);
  };

  const handleUpdateSchedule = (id: string, hostMemberId: string) => {
    const updatedSchedules = schedules.map(s => 
      s.id === id ? { ...s, hostMemberId } : s
    );
    setSchedules(updatedSchedules);
    saveSchedules(updatedSchedules);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return (
          <DashboardView 
            members={members} 
            arrears={arrears} 
            schedules={schedules}
            onAddArrear={handleAddArrear}
            onPayArrear={handlePayArrear}
            onPayMemberDebt={handlePayMemberDebt}
            onAddMember={handleAddMember}
          />
        );
      case 'MEMBERS':
        return (
          <MemberView 
            members={members} 
            onAddMember={handleAddMember} 
            onDeleteMember={handleDeleteMember}
            onAddArrear={handleAddArrear}
          />
        );
      case 'SCHEDULE':
        return (
          <ScheduleView 
            members={members}
            schedules={schedules}
            onAddSchedule={handleAddSchedule}
            onUpdateSchedule={handleUpdateSchedule}
          />
        );
      default:
        return (
          <DashboardView 
            members={members} 
            arrears={arrears} 
            schedules={schedules}
            onAddArrear={handleAddArrear}
            onPayArrear={handlePayArrear}
            onPayMemberDebt={handlePayMemberDebt}
            onAddMember={handleAddMember}
          />
        );
    }
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView}>
      {renderContent()}
    </Layout>
  );
};

export default App;