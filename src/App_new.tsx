
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DashboardView } from './components/DashboardView';
import { MemberView } from './components/MemberView';
import { ScheduleView } from './components/ScheduleView';
import { BackupView } from './components/BackupView';
import { AIInsights } from './components/AIInsights';
import { HistoryView } from './components/HistoryView';
import { Member, Arrear, MeetingSchedule, ViewState, MemberStatus } from './types';
import { 
  getMembers, saveMembers, 
  getArrears, saveArrears, 
  getSchedules, saveSchedules 
} from './services/storageService';

const App: React.FC = () => {
  // Requirement: Halaman awal yang tampil adalah Backup & Restore
  const [currentView, setCurrentView] = useState<ViewState>('BACKUP');
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

  const handleBulkAddMembers = (newMembers: Member[]) => {
    const updatedMembers = [...members, ...newMembers];
    setMembers(updatedMembers);
    saveMembers(updatedMembers);
  };

  const handleBulkAddArrears = (newArrears: Arrear[]) => {
    const updatedArrears = [...arrears, ...newArrears];
    setArrears(updatedArrears);
    saveArrears(updatedArrears);
  };

  const handleDeleteMember = (id: string) => {
    const updatedMembers = members.filter(m => m.id !== id);
    setMembers(updatedMembers);
    saveMembers(updatedMembers);
  };

  // --- NEW: Toggle Member Status Handler ---
  const handleToggleMemberStatus = (id: string) => {
    const updatedMembers = members.map(m => {
      if (m.id === id) {
        return {
          ...m,
          status: m.status === MemberStatus.ACTIVE ? MemberStatus.INACTIVE : MemberStatus.ACTIVE
        };
      }
      return m;
    });
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

  // --- NEW: Handle Delete History Item (Tagihan/Pelunasan) ---
  const handleDeleteHistoryItem = (item: any) => {
    let updatedArrears = [...arrears];

    if (item.type === 'TAGIHAN') {
      // Logic: Hapus item tunggakan berdasarkan ID (atau grup ID)
      const idsToDelete = item.rawIds || [item.id];
      updatedArrears = updatedArrears.filter(a => !idsToDelete.includes(a.id));
    } else if (item.type === 'PELUNASAN') {
      // Logic: Kembalikan status menjadi BELUM_LUNAS dan hapus paidAt
      const paymentId = item.paymentGroupId; 
      
      if (paymentId) {
        updatedArrears = updatedArrears.map(a => {
          if (a.paymentId === paymentId || a.id === paymentId) {
             const { paidAt, paymentId, ...rest } = a;
             return { ...rest, status: 'BELUM_LUNAS' } as Arrear;
          }
          return a;
        });
      }
    }
    
    setArrears(updatedArrears);
    saveArrears(updatedArrears);
  };

  const handlePayMemberDebt = (memberId: string, date: string, amount: number) => {
    let remainingPayment = amount;
    if (remainingPayment <= 0) return;

    const memberActiveArrears = arrears
      .filter(a => a.memberId === memberId && a.status === 'BELUM_LUNAS')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const updates = new Map<string, Arrear>();
    const newPaidItems: Arrear[] = [];
    
    const paymentId = `pid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    for (const item of memberActiveArrears) {
      if (remainingPayment <= 0) break;

      if (remainingPayment >= item.amount) {
        updates.set(item.id, { 
          ...item, 
          status: 'LUNAS', 
          paidAt: date,
          paymentId: paymentId 
        });
        remainingPayment -= item.amount;
      } else {
        const paidPortion: Arrear = {
          ...item,
          id: `${item.id}-paid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: `${item.title} (Parsial)`,
          amount: remainingPayment,
          status: 'LUNAS',
          paidAt: date,
          paymentId: paymentId 
        };
        newPaidItems.push(paidPortion);

        updates.set(item.id, {
          ...item,
          amount: item.amount - remainingPayment,
        });

        remainingPayment = 0;
      }
    }

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
            // Pass new props
            onDeleteHistoryItem={handleDeleteHistoryItem}
          />
        );
      case 'MEMBERS':
        return (
          <MemberView 
            members={members} 
            arrears={arrears}
            onAddMember={handleAddMember} 
            onDeleteMember={handleDeleteMember}
            onAddArrear={handleAddArrear}
            onBulkAddMembers={handleBulkAddMembers}
            onBulkAddArrears={handleBulkAddArrears}
            onToggleStatus={handleToggleMemberStatus}
          />
        );
      case 'HISTORY':
        return (
          <HistoryView
            arrears={arrears}
            members={members}
            schedules={schedules}
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
      case 'AI_INSIGHTS':
        return (
          <AIInsights 
            members={members}
            payments={arrears}
          />
        );
      case 'BACKUP':
        return <BackupView />;
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
            onDeleteHistoryItem={handleDeleteHistoryItem}
          />
        );
    }
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView} isDatabaseLoaded={members.length > 0}>
      {renderContent()}
    </Layout>
  );
};

export default App;
