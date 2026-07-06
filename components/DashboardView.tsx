
import React, { useState, useMemo, useEffect } from 'react';
import { Member, Arrear, MeetingSchedule, MemberStatus, BatchRecord } from '../types';
import { Search, X, Plus, History, Wallet, User, Hash, Calculator, Coins, AlertCircle, CalendarDays, ArrowUpRight, ArrowDownLeft, ChevronDown, Trash2, CheckCircle, Save, FileText, FileDown, MessageSquare } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getBatchHistory } from '../services/storageService';

interface DashboardProps {
  members: Member[];
  arrears: Arrear[];
  schedules?: MeetingSchedule[];
  onAddArrear: (arrear: Arrear) => void;
  onPayArrear: (id: string, date: string) => void;
  onPayMemberDebt: (memberId: string, date: string, amount: number) => void;
  onUpdateMember: (member: Member) => void;
  onAddMember: (member: Member) => void;
  onDeleteHistoryItem?: (item: any) => void;
  initialMemberId?: string | null;
  onClearInitialMemberId?: () => void;
  onCloseDetail?: () => void;
}

// Helper format tanggal DD-MMMM-YY
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const formatted = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: '2-digit'
  }).format(date);
  return formatted.replace(/ /g, '-');
};

export const DashboardView: React.FC<DashboardProps> = ({ 
  members, 
  arrears, 
  schedules = [],
  onAddArrear, 
  onPayArrear, 
  onPayMemberDebt,
  onUpdateMember,
  onDeleteHistoryItem,
  initialMemberId,
  onClearInitialMemberId,
  onCloseDetail
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTanggal, setExportTanggal] = useState('');
  const [exportTempat, setExportTempat] = useState('');
  
  // Selected Member for "Detail/Tambah Tunggakan" Modal
  const [selectedMemberStats, setSelectedMemberStats] = useState<any | null>(null);
  
  // State for Pay Modal
  const [payMember, setPayMember] = useState<{member: Member, totalDebt: number} | null>(null);
  const [payAmount, setPayAmount] = useState<string>(''); // Editable amount
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // State for Add Arrear in Detail Modal
  const [addCount, setAddCount] = useState<string>('');
  const [addDate, setAddDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // State for Confirmations
  const [isAddConfirmOpen, setIsAddConfirmOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [memberNotes, setMemberNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  
  // Helper to find meeting host based on date
  const getMeetingLocation = (dateString: string): string => {
    const d = new Date(dateString);
    const monthIndex = d.getMonth();
    const year = d.getFullYear();
    
    const schedule = schedules.find(s => s.monthIndex === monthIndex && s.year === year);
    if (schedule) {
       if (schedule.hostMemberId) {
          const host = members.find(m => m.id === schedule.hostMemberId);
          // Removed "Rumah" prefix as requested
          return host ? host.name : 'Lokasi ?';
       }
       return 'Lokasi Belum Diatur';
    }
    return 'Luar Jadwal';
  };

  // Helper: Get Latest Transaction Date for a Member (Created OR Paid)
  const getLatestTransactionDate = (memberHistory: Arrear[]): string | null => {
    if (!memberHistory || memberHistory.length === 0) return null;
    let maxDate = '';
    memberHistory.forEach(h => {
      if (h.createdAt > maxDate) maxDate = h.createdAt;
      if (h.status === 'LUNAS' && h.paidAt && h.paidAt > maxDate) maxDate = h.paidAt;
    });
    return maxDate || null;
  };

  // Calculate generic stats per member
  const memberStats = useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    return members.map(member => {
      const memberArrears = arrears.filter(a => a.memberId === member.id);
      
      const totalAccumulatedRp = memberArrears.reduce((sum, item) => sum + item.amount, 0);
      const totalAccumulatedCount = totalAccumulatedRp / 500;
      
      const activeArrears = memberArrears.filter(a => a.status === 'BELUM_LUNAS');
      const activeAmountRp = activeArrears.reduce((sum, item) => sum + item.amount, 0);
      const activeCount = activeAmountRp / 500;

      const pastArrears = activeArrears.filter(a => a.createdAt < startOfCurrentMonth);
      const pastArrearsAmountRp = pastArrears.reduce((sum, item) => sum + item.amount, 0);
      const pastArrearsCount = pastArrearsAmountRp / 500;

      const latestDate = getLatestTransactionDate(memberArrears);

      // Find actual last payment date for display column
      const lastPaymentDate = memberArrears.reduce((max, item) => {
         if (item.status === 'LUNAS' && item.paidAt) {
             return item.paidAt > max ? item.paidAt : max;
         }
         return max;
      }, '');

      return {
        ...member,
        totalAccumulatedCount,
        activeCount,
        activeAmountRp,
        pastArrearsCount,
        history: memberArrears, // Raw arrears data
        latestTransactionDate: latestDate,
        lastPaymentDate: lastPaymentDate || null
      };
    });
  }, [members, arrears]);

  const filteredStats = memberStats.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update selected member stats if data changes while modal is open
  useEffect(() => {
    if (selectedMemberStats) {
      const updated = memberStats.find(m => m.id === selectedMemberStats.id);
      if (updated) {
        setSelectedMemberStats(updated);
        setMemberNotes(updated.notes || '');
      }
    }
  }, [memberStats, selectedMemberStats?.id]);

  // Handle initialMemberId from props
  useEffect(() => {
    if (initialMemberId) {
      const target = memberStats.find(m => m.id === initialMemberId);
      if (target) {
        setSelectedMemberStats(target);
        setMemberNotes(target.notes || '');
        onClearInitialMemberId?.();
      }
    }
  }, [initialMemberId, memberStats, onClearInitialMemberId]);

  // --- DERIVED HISTORY LOGIC (RECONSTRUCTION MODE) ---
  const historyEvents = useMemo(() => {
    if (!selectedMemberStats) return [];
    
    const events: any[] = [];

    // 1. Group items to reconstruct Original Bills (Menggabungkan pecahan parsial)
    const billGroups: Record<string, Arrear[]> = {};

    selectedMemberStats.history.forEach((arrear: Arrear) => {
      const separatorIndex = arrear.id.indexOf('-paid-');
      const rootId = separatorIndex !== -1 ? arrear.id.substring(0, separatorIndex) : arrear.id;

      if (!billGroups[rootId]) {
        billGroups[rootId] = [];
      }
      billGroups[rootId].push(arrear);
    });

    // 2. Prepare Payment Groups
    const paymentGroups: Record<string, {
      date: string;
      amount: number;
      titles: string[];
      location: string;
      id: string; // paymentId
    }> = {};

    // 3. Process Bill Groups
    Object.values(billGroups).forEach((parts) => {
      const mainPart = parts[0];
      const totalOriginalAmount = parts.reduce((sum, part) => sum + part.amount, 0);
      const itemCount = Math.round(totalOriginalAmount / 500);
      const cleanTitle = mainPart.title.replace(' (Parsial)', '');

      // A. Push Event TAGIHAN
      events.push({
        id: mainPart.id, // Gunakan ID mainPart untuk referensi single, atau logic lain untuk grup
        rawIds: parts.map(p => p.id), // Store all related IDs for deletion
        date: mainPart.createdAt,
        type: 'TAGIHAN',
        amount: totalOriginalAmount,
        location: '-', 
        mutationLabel: `+${itemCount}`,
        mutationClass: 'text-red-600 bg-red-50 border-red-100',
        amountLabel: `Rp ${totalOriginalAmount.toLocaleString('id-ID')}`,
        description: cleanTitle,
      });

      // B. Collect Payments
      parts.forEach(part => {
        if (part.status === 'LUNAS' && part.paidAt) {
          const groupKey = part.paymentId || `single-${part.id}`;

          if (!paymentGroups[groupKey]) {
            paymentGroups[groupKey] = {
              id: groupKey,
              date: part.paidAt,
              amount: 0,
              titles: [],
              location: getMeetingLocation(part.paidAt)
            };
          }
          paymentGroups[groupKey].amount += part.amount;
          paymentGroups[groupKey].titles.push(part.title);
        }
      });
    });

    // 4. Convert Payment Groups to Events
    Object.values(paymentGroups).forEach(group => {
      const itemCount = Math.round(group.amount / 500);
      let desc = "";
      if (group.titles.length === 1) {
        desc = `Pelunasan: ${group.titles[0]}`;
      } else {
        desc = `Pelunasan Gabungan (${group.titles.length} Item)`;
      }

      events.push({
        id: `pay-group-${group.id}`,
        paymentGroupId: group.id, // For Deletion reference
        date: group.date,
        type: 'PELUNASAN',
        amount: group.amount,
        location: group.location, 
        mutationLabel: `-${itemCount}`,
        mutationClass: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        amountLabel: `Rp ${group.amount.toLocaleString('id-ID')}`,
        description: desc,
      });
    });

    // SORTED NEWEST FIRST
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedMemberStats, schedules, members]);

  const handleCloseDetail = () => {
    setSelectedMemberStats(null);
    setIsHistoryExpanded(false);
    onCloseDetail?.();
  };

  // --- Handlers ---

  const handleAddButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCount || parseInt(addCount) <= 0) return;
    setIsAddConfirmOpen(true);
  };

  const confirmAddArrear = () => {
    if (!selectedMemberStats) return;

    const count = parseInt(addCount || '0');
    const totalAmount = count * 500;

    if (totalAmount > 0) {
      const newArrear: Arrear = {
        id: `susulan-${Date.now()}`,
        memberId: selectedMemberStats.id,
        memberName: selectedMemberStats.name,
        title: `Tagihan (${count} Kosong)`, 
        amount: totalAmount,
        createdAt: addDate,
        status: 'BELUM_LUNAS'
      };
      onAddArrear(newArrear);
      setAddCount('');
      setAddDate(new Date().toISOString().split('T')[0]); 
      setIsAddConfirmOpen(false);
    }
  };

  const openPayModal = (member: Member, totalDebt: number) => {
    setPayMember({ member, totalDebt });
    setPayAmount(totalDebt.toString()); 
    setPayDate(new Date().toISOString().split('T')[0]);
  };

  const handlePayAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!payMember) return;
    const val = e.target.value;
    const numVal = parseInt(val);
    
    if (val === '') {
      setPayAmount('');
      return;
    }

    if (!isNaN(numVal)) {
      if (numVal > payMember.totalDebt) {
        setPayAmount(payMember.totalDebt.toString());
      } else {
        setPayAmount(val);
      }
    }
  };

  const confirmBulkPay = () => {
    if (payMember) {
      const nominal = parseInt(payAmount.replace(/[^0-9]/g, '') || '0');
      if (nominal > 0 && nominal <= payMember.totalDebt) {
        onPayMemberDebt(payMember.member.id, payDate, nominal);
        setPayMember(null);
      }
    }
  };
  
  const handleMemberSwitch = (memberId: string) => {
    const newStats = memberStats.find(m => m.id === memberId);
    if (newStats) {
      setSelectedMemberStats(newStats);
      setMemberNotes(newStats.notes || '');
      setAddCount('');
      setAddDate(new Date().toISOString().split('T')[0]);
      setIsHistoryExpanded(false);
    }
  };

  // Delete Handlers
  const handleDeleteClick = (item: any) => {
    setDeleteItem(item);
  };

  const confirmDelete = () => {
    if (deleteItem && onDeleteHistoryItem) {
        onDeleteHistoryItem(deleteItem);
        setDeleteItem(null);
    }
  };

  const handleSaveNotes = () => {
    if (!selectedMemberStats || !onUpdateMember) return;
    setIsSavingNotes(true);
    
    const updatedMember: Member = {
      ...members.find(m => m.id === selectedMemberStats.id)!,
      notes: memberNotes
    };
    
    onUpdateMember(updatedMember);
    
    setTimeout(() => {
      setIsSavingNotes(false);
    }, 500);
  };

  // --- VALIDATION LOGIC ---

  // 1. Validation for ADDING ARREAR (Tagihan)
  // Rule: addDate must be > selectedMemberStats.latestTransactionDate
  const isAddDateInvalid = useMemo(() => {
    if (!selectedMemberStats || !selectedMemberStats.latestTransactionDate) return false;
    return addDate <= selectedMemberStats.latestTransactionDate;
  }, [addDate, selectedMemberStats]);

  // 2. Validation for PAYMENT (Pelunasan)
  // Rule: payDate must be > latestTransactionDate associated with payMember
  const payMemberLatestDate = useMemo(() => {
    if (!payMember) return null;
    const stats = memberStats.find(m => m.id === payMember.member.id);
    return stats ? stats.latestTransactionDate : null;
  }, [payMember, memberStats]);

  const isPayDateInvalid = useMemo(() => {
    if (!payMemberLatestDate) return false;
    return payDate <= payMemberLatestDate;
  }, [payDate, payMemberLatestDate]);

  // Combined validity for Pay button
  const isPayButtonDisabled = !payMember || 
    parseInt(payAmount || '0') <= 0 || 
    parseInt(payAmount || '0') > payMember.totalDebt ||
    isPayDateInvalid;

  const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const GREEN  = [146, 208, 80]  as [number, number, number];
    const WHITE  = [255, 255, 255] as [number, number, number];
    const BLACK  = [0, 0, 0]       as [number, number, number];
    const GREY   = [240, 240, 240] as [number, number, number];

    // HALAMAN 1: Rekap Tunggakan
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('REKAPAN JIMPITAN KOSONG RT 02', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const sdTanggal = exportTanggal ? exportTanggal.toUpperCase() : '___________________';
    const tempat    = exportTempat  ? exportTempat.toUpperCase()  : '___________________';
    doc.text(`S/D TANGGAL :  ${sdTanggal}`, 14, 19);
    doc.text(`TMPT :  ${tempat}`, pageWidth / 2 + 5, 19);

    const activeMembers = memberStats
      .filter(m => m.status === MemberStatus.ACTIVE)
      .sort((a, b) => a.name.localeCompare(b.name));

    const EXTRA_ROWS = 4;
    const exportData = activeMembers.map((m, idx) => ({
      no: idx + 1, name: m.name, kosong: m.activeCount, nominal: m.activeAmountRp, isEmpty: m.activeCount === 0,
    }));

    const half = Math.ceil(exportData.length / 2);
    const leftCol  = exportData.slice(0, half);
    const rightCol: any[] = exportData.slice(half);
    let extraNo = exportData.length + 1;
    while (rightCol.length < leftCol.length + EXTRA_ROWS) {
      rightCol.push({ no: extraNo++, name: '', kosong: 0, nominal: 0, isEmpty: true });
    }

    const tableBody = leftCol.map((left, i) => {
      const right = rightCol[i] || { no: '', name: '', kosong: 0, nominal: 0, isEmpty: true };
      const lBg = left.isEmpty ? GREEN : WHITE;
      const rBg = right.isEmpty ? GREEN : WHITE;
      return [
        { content: left.no,     styles: { halign: 'center' as const, fillColor: lBg, textColor: BLACK } },
        { content: left.name,   styles: { fillColor: lBg, textColor: BLACK } },
        { content: left.kosong, styles: { halign: 'center' as const, fillColor: lBg, textColor: BLACK } },
        { content: left.nominal === 0 ? 0 : left.nominal.toLocaleString('id-ID'), styles: { halign: 'right' as const, fillColor: lBg, textColor: BLACK } },
        { content: '',          styles: { fillColor: lBg } },
        { content: right.no,   styles: { halign: 'center' as const, fillColor: rBg, textColor: BLACK } },
        { content: right.name, styles: { fillColor: rBg, textColor: BLACK } },
        { content: right.kosong, styles: { halign: 'center' as const, fillColor: rBg, textColor: BLACK } },
        { content: right.nominal === 0 ? 0 : right.nominal.toLocaleString('id-ID'), styles: { halign: 'right' as const, fillColor: rBg, textColor: BLACK } },
        { content: '',          styles: { fillColor: rBg } },
      ];
    });

    const totalRow = [
      { content: '', styles: { fillColor: WHITE } },
      { content: '', styles: { fillColor: WHITE } },
      { content: '', styles: { fillColor: WHITE } },
      { content: '', styles: { fillColor: WHITE } },
      { content: '', styles: { fillColor: WHITE } },
      { content: '', styles: { fillColor: GREY } },
      { content: '', styles: { fillColor: GREY } },
      { content: 'TOTAL (KK)', styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: GREY, textColor: BLACK } },
      { content: '', styles: { fillColor: GREY } },
      { content: 'TERIMA', styles: { halign: 'center' as const, fontStyle: 'bold' as const, fillColor: GREY, textColor: BLACK } },
    ];

    autoTable(doc, {
      startY: 23,
      head: [[
        { content: 'No.',    styles: { halign: 'center' } },
        { content: 'Nama' },
        { content: 'Kosong', styles: { halign: 'center' } },
        { content: 'Nominal\n(x500)', styles: { halign: 'center' } },
        { content: 'Ket.' },
        { content: 'No.',    styles: { halign: 'center' } },
        { content: 'Nama' },
        { content: 'Kosong', styles: { halign: 'center' } },
        { content: 'Nominal\n(x500)', styles: { halign: 'center' } },
        { content: 'Ket.' },
      ]],
      body: [...tableBody, totalRow],
      headStyles: { fillColor: WHITE, textColor: BLACK, fontStyle: 'bold', fontSize: 7.5, lineWidth: 0.3, lineColor: BLACK },
      bodyStyles: { fontSize: 7, lineWidth: 0.25, lineColor: [160, 160, 160] },
      columnStyles: {
        0: { cellWidth: 9,  halign: 'center' }, 1: { cellWidth: 36 },
        2: { cellWidth: 13, halign: 'center' }, 3: { cellWidth: 17, halign: 'right' }, 4: { cellWidth: 10 },
        5: { cellWidth: 9,  halign: 'center' }, 6: { cellWidth: 36 },
        7: { cellWidth: 13, halign: 'center' }, 8: { cellWidth: 17, halign: 'right' }, 9: { cellWidth: 10 },
      },
      theme: 'plain',
      margin: { left: 10, right: 10 },
    });

    // HALAMAN 2: Batch Input Terakhir
    const batchHistory = getBatchHistory();
    if (batchHistory.length > 0) {
      doc.addPage();
      const lastBatch = batchHistory[0];
      const batchDate = new Date(lastBatch.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('BATCH INPUT TERBARU', pageWidth / 2, 14, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tanggal Input: ${batchDate}`, 14, 21);

      const batchRows = lastBatch.details.map((d, idx) => [
        idx + 1, d.memberName,
        ...(d.dailyUnits || Array(7).fill(0)).map(v => v > 0 ? v : '-'),
        d.units, `Rp ${d.amount.toLocaleString('id-ID')}`
      ]);
      const dayTotals = DAY_NAMES.map((_, i) => lastBatch.details.reduce((sum, d) => sum + (d.dailyUnits?.[i] || 0), 0));

      autoTable(doc, {
        startY: 25,
        head: [['No', 'Nama', ...DAY_NAMES, 'Total', 'Nominal']],
        body: [
          ...batchRows,
          ['', 'TOTAL', ...dayTotals.map(v => v > 0 ? v : '-'), lastBatch.totalUnits, `Rp ${lastBatch.totalAmount.toLocaleString('id-ID')}`]
        ],
        headStyles: { fillColor: [79, 70, 229], textColor: WHITE, fontSize: 7, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 35 },
          2: { cellWidth: 12, halign: 'center' }, 3: { cellWidth: 12, halign: 'center' },
          4: { cellWidth: 12, halign: 'center' }, 5: { cellWidth: 12, halign: 'center' },
          6: { cellWidth: 12, halign: 'center' }, 7: { cellWidth: 12, halign: 'center' },
          8: { cellWidth: 12, halign: 'center' }, 9: { cellWidth: 13, halign: 'center' },
          10: { cellWidth: 22, halign: 'right' },
        },
        theme: 'striped',
        margin: { left: 10, right: 10 },
      });
    }

    const tanggalFile = new Date().toISOString().split('T')[0];
    doc.save(`Rekap_Jimpitan_RT02_${tanggalFile}.pdf`);
    setShowExportModal(false);
  };

  const handleExportTXT = () => {
    const activeMembers = memberStats
      .filter(m => m.status === MemberStatus.ACTIVE)
      .sort((a, b) => a.name.localeCompare(b.name));

    const lines = ['*REKAP TUNGGAKAN JIMPITAN TERBARU*', ''];
    activeMembers.forEach((m, idx) => {
      const nominal = `Rp${m.activeAmountRp.toLocaleString('id-ID')}`;
      if (m.activeAmountRp > 0) {
        lines.push(`${idx + 1}. *Bpk. ${m.name} ${nominal}*`);
      } else {
        lines.push(`${idx + 1}. _Bpk. ${m.name} Rp0_`);
      }
    });
    lines.push('');
    lines.push('Harap dilunasi di pertemuan nanti malam.');
    lines.push('*Uang jimpitan tiap grup jaga dibawa/setorkan.*');
    lines.push('Terimakasih');
    lines.push('');
    lines.push('sie Jimpitan');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_WA_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Rekap Jimpitan</h2>
          <p className="text-slate-500">Ringkasan status iuran warga</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportTXT}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <MessageSquare size={16} />
            Export WA
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <FileDown size={16} />
            Export PDF Rekap
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col xl:flex-row gap-3 items-center justify-between">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama anggota..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nama Anggota</th>
                <th className="px-6 py-4 text-right">Tunggakan Aktif<br/><span className="text-xs font-normal text-slate-500">(Rupiah)</span></th>
                <th className="px-6 py-4 text-center">Tunggakan Aktif<br/><span className="text-xs font-normal text-slate-500">(Item)</span></th>
                <th className="px-6 py-4 text-center bg-orange-50/50">Tunggakan Bln Lalu<br/><span className="text-xs font-normal text-slate-500">(Item)</span></th>
                <th className="px-6 py-4 text-center">Tempat Pembayaran Terakhir<br/><span className="text-xs font-normal text-slate-500">(Lokasi)</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStats.length > 0 ? (
                filteredStats.map((item) => (
                  <tr key={item.id} className={`transition-colors ${item.status === MemberStatus.INACTIVE ? 'bg-slate-50/70' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedMemberStats(item)}
                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors text-left"
                      >
                        {item.name}
                      </button>
                      {item.status === MemberStatus.INACTIVE && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-500 font-bold uppercase">Non-Aktif</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-right font-bold text-slate-800">
                      Rp {item.activeAmountRp.toLocaleString('id-ID')}
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.activeCount > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {item.activeCount}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center bg-orange-50/30">
                      {item.pastArrearsCount > 0 ? (
                        <span className="text-orange-600 font-bold">{item.pastArrearsCount}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center text-slate-500 font-medium text-xs">
                      {item.lastPaymentDate ? getMeetingLocation(item.lastPaymentDate) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Data tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: LUNASI */}
      {payMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
                <Wallet size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Konfirmasi Pelunasan</h3>
              <p className="text-sm text-slate-500">{payMember.member.name}</p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal Pembayaran (Rp)</label>
                <div className="relative">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">Rp</div>
                   <input 
                    type="number" 
                    className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-lg text-slate-800 bg-slate-100"
                    value={payAmount}
                    onChange={handlePayAmountChange}
                    min="0"
                    max={payMember.totalDebt}
                    step="500"
                  />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-slate-500">
                    Maks: Rp {payMember.totalDebt.toLocaleString('id-ID')}
                  </p>
                  {parseInt(payAmount || '0') > payMember.totalDebt && (
                    <span className="text-xs text-red-500 flex items-center gap-1 font-medium">
                      <AlertCircle size={10} /> Melebihi tagihan
                    </span>
                  )}
                </div>
              </div>

              <div>
                {/* MODIFIED LABEL: Warning replaces label text */}
                <label className={`block text-sm font-medium mb-1 ${isPayDateInvalid ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                   {isPayDateInvalid ? `Tanggal tidak valid (Harus > ${formatDate(payMemberLatestDate || '')})` : 'Tanggal Pelunasan'}
                </label>
                <input 
                  type="date" 
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 cursor-pointer ${isPayDateInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-slate-100 border-slate-300 text-slate-700'}`}
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setPayMember(null)}
                className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Batal
              </button>
              <button 
                onClick={confirmBulkPay}
                disabled={isPayButtonDisabled}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Bayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ADD MODAL */}
      {isAddConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
             <h3 className="text-lg font-bold text-slate-800 mb-2">Konfirmasi Tambah Tunggakan</h3>
             <p className="text-sm text-slate-600 mb-4">
                Yakin ingin menambahkan tagihan sebesar <strong>Rp {(parseInt(addCount || '0') * 500).toLocaleString('id-ID')}</strong> ({addCount} item) untuk {selectedMemberStats?.name}?
             </p>
             <div className="flex justify-end gap-2">
                <button onClick={() => setIsAddConfirmOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Batal</button>
                <button onClick={confirmAddArrear} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium">Ya, Tambahkan</button>
             </div>
           </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
             <div className="flex items-center gap-3 text-red-600 mb-3">
               <Trash2 size={24} />
               <h3 className="text-lg font-bold text-slate-800">Hapus Transaksi?</h3>
             </div>
             <p className="text-sm text-slate-600 mb-4">
                Tindakan ini akan menghapus data {deleteItem.type === 'TAGIHAN' ? 'tagihan' : 'pelunasan'} terpilih. Data yang dihapus tidak dapat dikembalikan.
             </p>
             <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteItem(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Batal</button>
                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium">Hapus</button>
             </div>
           </div>
        </div>
      )}

      {/* MODAL: DETAIL / TAMBAH TUNGGAKAN */}
      {selectedMemberStats && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={handleCloseDetail}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50 rounded-t-xl">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">Detail Anggota</label>
                <div className="relative max-w-xs">
                   <select 
                      className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold text-lg text-slate-800 appearance-none bg-white cursor-pointer"
                      value={selectedMemberStats.id}
                      onChange={(e) => handleMemberSwitch(e.target.value)}
                   >
                      {memberStats
                        .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.status === MemberStatus.INACTIVE ? '(Non-Aktif)' : ''}
                        </option>
                      ))}
                   </select>
                   <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={20} />
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                 {/* Pay Button Removed from Header */}
                 <button onClick={handleCloseDetail} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-8">
              
              {/* SECTION: NOTES */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileText size={16} /> Catatan Khusus
                  </h4>
                  <button 
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes || memberNotes === (selectedMemberStats.notes || '')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                      isSavingNotes 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : memberNotes !== (selectedMemberStats.notes || '')
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isSavingNotes ? (
                      <><div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div> Menyimpan...</>
                    ) : (
                      <><Save size={14} /> Simpan Catatan</>
                    )}
                  </button>
                </div>
                <textarea 
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-h-[80px] resize-none placeholder:italic placeholder:text-slate-400"
                  placeholder="Contoh: Sering bayar di akhir bulan, atau catatan lainnya..."
                  value={memberNotes}
                  onChange={(e) => setMemberNotes(e.target.value)}
                />
              </div>

              {/* SECTION 1: ADD ARREAR (Moved to Top) */}
              <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                  <Plus size={16} /> Tambah Tagihan
                </h4>
                <form onSubmit={handleAddButton} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="flex-1 w-full">
                    {/* MODIFIED LABEL: Warning replaces label text */}
                    <label className={`block text-xs font-medium mb-1 ${isAddDateInvalid ? 'text-red-600 animate-pulse' : 'text-indigo-700'}`}>
                       {isAddDateInvalid ? `Harus > ${formatDate(selectedMemberStats.latestTransactionDate)}` : 'Tanggal'}
                    </label>
                    <input 
                      type="date" 
                      className={`w-full px-3 h-10 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer ${isAddDateInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-slate-100 border-indigo-200 text-slate-700'}`}
                      value={addDate}
                      onChange={(e) => setAddDate(e.target.value)}
                      required
                      onClick={(e) => e.currentTarget.showPicker()}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-indigo-700 mb-1">Jumlah Kosong (Kali)</label>
                    <input 
                      type="number" 
                      min="1"
                      placeholder="0"
                      className="w-full px-3 h-10 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-100"
                      value={addCount}
                      onChange={(e) => setAddCount(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-indigo-700 mb-1">Total (Rp)</label>
                    <div className="w-full px-3 h-10 flex items-center bg-white/50 border border-indigo-200 rounded-lg text-sm text-indigo-900 font-medium">
                      Rp {(parseInt(addCount || '0') * 500).toLocaleString('id-ID')}
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={!addCount || parseInt(addCount) <= 0 || isAddDateInvalid}
                    className="w-full sm:w-auto px-4 h-10 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Simpan
                  </button>
                </form>
              </div>

              {/* SECTION 2: STATS & PAY BUTTON (Moved Below Add Arrear) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className={`p-4 rounded-xl flex items-center gap-4 border ${
                   selectedMemberStats.activeCount > 0 
                    ? 'bg-red-50 border-red-100' 
                    : 'bg-emerald-100 border-emerald-200'
                 }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      selectedMemberStats.activeCount > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-200 text-emerald-700'
                    }`}>
                      <Hash size={20} />
                    </div>
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider ${
                        selectedMemberStats.activeCount > 0 ? 'text-red-600' : 'text-emerald-700'
                      }`}>Jml. Tunggakan</p>
                      <p className={`text-xl font-bold ${
                        selectedMemberStats.activeCount > 0 ? 'text-red-800' : 'text-emerald-800'
                      }`}>{selectedMemberStats.activeCount}</p>
                    </div>
                 </div>
                 <div className={`p-4 rounded-xl flex items-center gap-4 border ${
                   selectedMemberStats.activeCount > 0 
                    ? 'bg-red-50 border-red-100' 
                    : 'bg-emerald-100 border-emerald-200'
                 }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      selectedMemberStats.activeCount > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-200 text-emerald-700'
                    }`}>
                      <Coins size={20} />
                    </div>
                    <div>
                      <p className={`text-xs font-medium uppercase tracking-wider ${
                        selectedMemberStats.activeCount > 0 ? 'text-red-600' : 'text-emerald-700'
                      }`}>Total Rupiah</p>
                      <p className={`text-xl font-bold ${
                        selectedMemberStats.activeCount > 0 ? 'text-red-800' : 'text-emerald-800'
                      }`}>Rp {selectedMemberStats.activeAmountRp.toLocaleString('id-ID')}</p>
                    </div>
                 </div>
                 
                 {/* Pay Button moved here to be inline */}
                 <button 
                    onClick={() => openPayModal(selectedMemberStats, selectedMemberStats.activeAmountRp)}
                    disabled={selectedMemberStats.activeCount === 0}
                    className={`flex flex-col items-center justify-center gap-1 p-4 rounded-xl font-medium transition-all shadow-sm border ${
                        selectedMemberStats.activeCount > 0
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                    }`}
                 >
                    {selectedMemberStats.activeCount > 0 ? <Wallet size={24} /> : <CheckCircle size={24} />}
                    <span className="text-sm font-bold">
                       {selectedMemberStats.activeCount > 0 ? "Lunasi Sekarang" : "Tidak Ada Tunggakan"}
                    </span>
                 </button>
              </div>

              {/* SECTION 3: HISTORY */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <History size={16} /> Riwayat
                  </h4>
                  <button 
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 transition-colors"
                  >
                    {isHistoryExpanded ? (
                      <>Sembunyikan <ChevronDown size={14} className="rotate-180 transition-transform" /></>
                    ) : (
                      <>Lihat Semua <ChevronDown size={14} className="transition-transform" /></>
                    )}
                  </button>
                </div>
                
                {isHistoryExpanded && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 bg-slate-50">Tanggal</th>
                          <th className="px-4 py-3 bg-slate-50">Lokasi</th>
                          <th className="px-4 py-3 text-center bg-slate-50">Mutasi</th>
                          <th className="px-4 py-3 text-right bg-slate-50">Nominal</th>
                          <th className="px-4 py-3 text-center bg-slate-50">Status</th>
                          <th className="px-4 py-3 text-center bg-slate-50 w-24">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historyEvents.length > 0 ? (
                          historyEvents.map((hist: any, index: number) => (
                            <tr key={hist.id}>
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(hist.date)}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{hist.location}</td>
                              <td className="px-4 py-3 text-center">
                                <div className={`inline-block px-2 py-1 rounded-md text-xs font-bold border ${hist.mutationClass}`}>
                                  {hist.mutationLabel}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-800">{hist.amountLabel}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-1 ${
                                  hist.type === 'PELUNASAN' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-red-50 text-red-600 border border-red-100'
                                }`}>
                                  {hist.type === 'PELUNASAN' ? (
                                      <><ArrowUpRight size={10} /> LUNAS</>
                                  ) : (
                                      <><ArrowDownLeft size={10} /> TAGIHAN</>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                 <div className="flex items-center justify-center gap-1">
                                    <button 
                                      onClick={() => index === 0 && handleDeleteClick(hist)}
                                      disabled={index !== 0}
                                      className={`p-1.5 rounded transition-colors ${
                                          index === 0 
                                              ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer' 
                                              : 'text-slate-200 cursor-not-allowed'
                                      }`}
                                      title={index === 0 ? "Hapus Transaksi Terakhir" : "Hapus transaksi terbaru terlebih dahulu"}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                 </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-slate-400">Belum ada riwayat transaksi.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export PDF Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                <FileDown size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Export PDF Rekap</h3>
                <p className="text-xs text-slate-500">Isi keterangan untuk header laporan</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">S/D Tanggal</label>
                <input
                  type="text"
                  placeholder="Contoh: Sabtu, 6 Juni 2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                  value={exportTanggal}
                  onChange={(e) => setExportTanggal(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tempat</label>
                <input
                  type="text"
                  placeholder="Contoh: Bpk. M. Hendro"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                  value={exportTempat}
                  onChange={(e) => setExportTempat(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleExportPDF}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
              >
                <FileDown size={16} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Info Icon component for inline use
const InfoIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);
