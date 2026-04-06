import React, { useState, useMemo, useEffect } from 'react';
import { Member, Arrear, BatchRecord } from '../types';
import { TableIcon, Save, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, CalendarDays, Lock, Unlock, FileDown, History, Trash2 } from 'lucide-react';
import { getBatchHistory, saveBatchHistory } from '../services/storageService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BatchInputViewProps {
  members: Member[];
  onBulkAddArrears: (arrears: Arrear[]) => void;
  onDeleteBatchArrears: (date: string) => void;
  onMemberClick?: (memberId: string) => void;
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const RATE_PER_UNIT = 500;

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatDisplayDate = (date: Date): string => {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

export const BatchInputView: React.FC<BatchInputViewProps> = ({ members, onBulkAddArrears, onDeleteBatchArrears, onMemberClick }) => {
  const [activeTab, setActiveTab] = useState<'input' | 'history'>('input');
  const [batchDate, setBatchDate] = useState<Date>(new Date());
  const [inputValues, setInputValues] = useState<Record<string, Record<number, string>>>({}); // memberId -> dayIndex -> value
  const [isLocked, setIsLocked] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [batchHistory, setBatchHistory] = useState<BatchRecord[]>([]);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [lockedDays, setLockedDays] = useState<Record<number, boolean>>({
    0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true
  });
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    setBatchHistory(getBatchHistory());
  }, []);

  const activeMembers = useMemo(() => 
    members
      .filter(m => m.status === 'Aktif'), 
    [members]
  );

  const dateLabel = useMemo(() => {
    return formatDisplayDate(batchDate);
  }, [batchDate]);

  const handlePrevDay = () => {
    const d = new Date(batchDate);
    d.setDate(d.getDate() - 1);
    setBatchDate(d);
    setSavedSuccess(false);
  };

  const handleNextDay = () => {
    const d = new Date(batchDate);
    d.setDate(d.getDate() + 1);
    setBatchDate(d);
    setSavedSuccess(false);
  };

  const handleChange = (memberId: string, dayIndex: number, value: string) => {
    if (lockedDays[dayIndex]) return;
    
    // Hanya angka, max 2 digit
    const cleaned = value.replace(/\D/g, '').slice(0, 2);
    setInputValues(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || {}),
        [dayIndex]: cleaned,
      },
    }));
    setSavedSuccess(false);
  };

  const getMemberDayValue = (memberId: string, dayIndex: number): number => {
    const raw = inputValues[memberId]?.[dayIndex];
    return raw ? parseInt(raw, 10) : 0;
  };

  const getMemberTotal = (memberId: string): number => {
    return Array.from({ length: 7 }, (_, i) => getMemberDayValue(memberId, i)).reduce((a, b) => a + b, 0);
  };

  const getMemberTotalRupiah = (memberId: string): number => {
    return getMemberTotal(memberId) * RATE_PER_UNIT;
  };

  const getDayTotal = (dayIndex: number): number => {
    return activeMembers.reduce((sum, m) => sum + getMemberDayValue(m.id, dayIndex), 0);
  };

  const getGrandTotal = (): number => {
    return activeMembers.reduce((sum, m) => sum + getMemberTotalRupiah(m.id), 0);
  };

  const hasAnyInput = useMemo(() => {
    return activeMembers.some(m => getMemberTotal(m.id) > 0);
  }, [inputValues, activeMembers]);

  const toggleDayLock = (dayIndex: number) => {
    setLockedDays(prev => ({
      ...prev,
      [dayIndex]: !prev[dayIndex]
    }));
  };

  const handleSave = () => {
    setShowSaveConfirm(false);
    const dateStr = formatDate(batchDate);
    
    // Rule: tidak bisa input 2 batch di tanggal yang sama
    const isDuplicate = batchHistory.some(h => h.date === dateStr);
    if (isDuplicate) {
      alert(`Sudah ada input batch untuk tanggal ${formatDisplayDate(batchDate)}. Silakan pilih tanggal lain atau hapus riwayat batch tersebut terlebih dahulu.`);
      return;
    }

    const newArrears: Arrear[] = [];
    const batchDetails: BatchRecord['details'] = [];
    let totalBatchAmount = 0;
    let totalBatchUnits = 0;

    activeMembers.forEach(member => {
      const totalUnits = getMemberTotal(member.id);
      if (totalUnits === 0) return;

      const dailyUnits = Array.from({ length: 7 }, (_, i) => getMemberDayValue(member.id, i));
      const amount = totalUnits * RATE_PER_UNIT;
      totalBatchAmount += amount;
      totalBatchUnits += totalUnits;

      batchDetails.push({
        memberId: member.id,
        memberName: member.name,
        units: totalUnits,
        amount,
        dailyUnits,
      });

      newArrears.push({
        id: `batch-${Date.now()}-${member.id}-${Math.random().toString(36).substr(2, 5)}`,
        memberId: member.id,
        memberName: member.name,
        title: `Batch Input (${totalUnits} Kosong)`,
        amount,
        createdAt: dateStr,
        status: 'BELUM_LUNAS',
      });
    });

    if (newArrears.length === 0) return;

    // Save to Batch History
    const newBatchRecord: BatchRecord = {
      id: `batch-rec-${Date.now()}`,
      date: dateStr,
      totalAmount: totalBatchAmount,
      totalUnits: totalBatchUnits,
      memberCount: batchDetails.length,
      details: batchDetails,
    };

    const updatedHistory = [newBatchRecord, ...batchHistory];
    setBatchHistory(updatedHistory);
    saveBatchHistory(updatedHistory);

    onBulkAddArrears(newArrears);
    setInputValues({});
    setIsLocked(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const exportRecordToPDF = (record: BatchRecord) => {
    const doc = new jsPDF();
    const dateLabel = formatDisplayDate(new Date(record.date));
    const title = `Laporan Batch Input Tunggakan - ${dateLabel}`;
    
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 22);

    const tableData = record.details.map(d => [
      d.memberName,
      ...(d.dailyUnits || Array.from({ length: 7 }, () => 0)).map(val => val || '-'),
      d.units,
      formatRupiah(d.amount)
    ]);

    const footerData = [
      'TOTAL',
      ...Array.from({ length: 7 }, (_, i) => 
        record.details.reduce((sum, d) => sum + (d.dailyUnits?.[i] || 0), 0)
      ),
      record.totalUnits,
      formatRupiah(record.totalAmount)
    ];

    autoTable(doc, {
      startY: 30,
      head: [['Nama Anggota', ...DAY_NAMES, 'Total', 'Nominal']],
      body: [...tableData, footerData],
      headStyles: { fillColor: [79, 70, 229] },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      theme: 'striped',
    });

    doc.save(`Batch_Input_${record.date}.pdf`);
  };

  const deleteHistoryItem = (id: string) => {
    const record = batchHistory.find(h => h.id === id);
    if (record) {
      onDeleteBatchArrears(record.date);
    }
    const updated = batchHistory.filter(h => h.id !== id);
    setBatchHistory(updated);
    saveBatchHistory(updated);
    setRecordToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow">
            <TableIcon className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Batch Input Tunggakan</h1>
            <p className="text-sm text-slate-500">Input jimpitan harian per anggota. 1 kotak = Rp500</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'input' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <TableIcon size={16} />
            Input Baru
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History size={16} />
            Riwayat
          </button>
        </div>
      </div>

      {activeTab === 'input' ? (
        <>
          {/* Date Picker */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <CalendarDays size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tanggal Input Batch</p>
              <p className="text-sm font-semibold text-slate-700">{dateLabel}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors border border-slate-200"
              title="Hari Sebelumnya"
            >
              <ChevronLeft size={20} />
            </button>
            
            <input 
              type="date"
              value={formatDate(batchDate)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) {
                  setBatchDate(d);
                  setSavedSuccess(false);
                }
              }}
              className="flex-1 sm:w-40 px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer bg-slate-50"
            />

            <button
              onClick={handleNextDay}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors border border-slate-200"
              title="Hari Selanjutnya"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Success Alert */}
      {savedSuccess && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">
          <CheckCircle size={18} />
          Tunggakan berhasil disimpan ke daftar Tunggakan!
        </div>
      )}

      {/* No members warning */}
      {activeMembers.length === 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={18} />
          Belum ada anggota aktif. Tambahkan anggota di menu Anggota terlebih dahulu.
        </div>
      )}

      {/* Table */}
      {activeMembers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-auto max-h-[calc(100vh-350px)] min-h-[400px]">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-30">
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 sticky left-0 top-0 bg-slate-50 z-40 border-b border-r border-slate-200 min-w-[160px]">
                    Nama Anggota
                  </th>
                  {DAY_NAMES.map((day, i) => (
                    <th key={i} className="px-2 py-3 font-semibold text-slate-600 text-center min-w-[70px] bg-slate-50 border-b border-slate-200">
                      {day}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-semibold text-indigo-600 text-center min-w-[60px] bg-slate-50 border-b border-slate-200">
                    Total
                  </th>
                  <th className="px-4 py-3 font-semibold text-indigo-600 text-right min-w-[110px] bg-slate-50 border-b border-slate-200">
                    Nominal
                  </th>
                </tr>
              </thead>
              <tbody className="relative z-10">
                {activeMembers.map((member, rowIdx) => {
                  const totalUnits = getMemberTotal(member.id);
                  const totalRupiah = getMemberTotalRupiah(member.id);
                  return (
                    <tr
                      key={member.id}
                      className={`${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      <td className={`px-4 py-2.5 sticky left-0 z-20 border-b border-r border-slate-100 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <button
                          onClick={() => onMemberClick?.(member.id)}
                          className="text-left font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors truncate max-w-[140px] block"
                        >
                          {member.name}
                        </button>
                      </td>
                      {Array.from({ length: 7 }, (_, dayIndex) => (
                        <td key={dayIndex} className="px-2 py-2 text-center border-b border-slate-100">
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={inputValues[member.id]?.[dayIndex] ?? ''}
                            onChange={e => handleChange(member.id, dayIndex, e.target.value)}
                            disabled={isLocked || lockedDays[dayIndex]}
                            placeholder="0"
                            className={`w-14 text-center border border-slate-200 rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition ${
                              getMemberDayValue(member.id, dayIndex) > 0 
                                ? 'bg-amber-50 border-amber-200 text-amber-700 font-bold' 
                                : isLocked || lockedDays[dayIndex]
                                  ? 'bg-slate-100 text-slate-500' 
                                  : 'bg-white'
                            }`}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center border-b border-slate-100">
                        <span className={`font-bold text-sm ${totalUnits > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                          {totalUnits > 0 ? totalUnits : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right border-b border-slate-100">
                        <span className={`font-semibold text-sm ${totalRupiah > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                          {totalRupiah > 0 ? formatRupiah(totalRupiah) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Total per hari (footer row) */}
                <tr className="bg-indigo-50 border-t-2 border-indigo-200 sticky bottom-[44px] z-30">
                  <td className="px-4 py-3 font-bold text-slate-700 sticky left-0 bg-indigo-50 z-40 border-r border-indigo-200">
                    Total per Hari
                  </td>
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const dayTotal = getDayTotal(dayIndex);
                    return (
                      <td key={dayIndex} className="px-2 py-3 text-center">
                        <span className={`text-sm font-bold ${dayTotal > 0 ? 'text-indigo-700' : 'text-slate-300'}`}>
                          {dayTotal > 0 ? `${dayTotal}×` : '—'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center">
                    <span className="font-bold text-indigo-700 text-sm">
                      {activeMembers.reduce((sum, m) => sum + getMemberTotal(m.id), 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-indigo-700 text-sm">
                      {formatRupiah(getGrandTotal())}
                    </span>
                  </td>
                </tr>

                {/* Lock Controls Row */}
                <tr className="bg-slate-50 border-t border-slate-200 sticky bottom-0 z-30">
                  <td className="px-4 py-2.5 font-medium text-slate-500 sticky left-0 bg-slate-50 z-40 border-r border-slate-200 flex items-center gap-2">
                    <Lock size={14} className="text-slate-400" />
                    <span className="text-[10px] uppercase tracking-wider">Kunci Kolom</span>
                  </td>
                  {Array.from({ length: 7 }, (_, dayIndex) => (
                    <td key={dayIndex} className="px-2 py-2.5 text-center bg-slate-50">
                      <button
                        onClick={() => toggleDayLock(dayIndex)}
                        disabled={isLocked}
                        className={`group relative p-1.5 rounded-lg transition-all ${
                          lockedDays[dayIndex]
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-slate-400 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200'
                        } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={lockedDays[dayIndex] ? 'Buka Kunci Kolom' : 'Kunci Kolom Ini'}
                      >
                        {lockedDays[dayIndex] ? <Lock size={14} /> : <Unlock size={14} />}
                        
                        {/* Tooltip-like label for mobile/clarity */}
                        {!lockedDays[dayIndex] && (
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20">
                            Kunci {DAY_NAMES[dayIndex]}
                          </span>
                        )}
                      </button>
                    </td>
                  ))}
                  <td colSpan={2} className="bg-slate-50"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {activeMembers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="text-sm text-slate-500 italic">
            * Pastikan semua data sudah benar sebelum mengunci dan menyimpan.
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isLocked ? (
              <button
                onClick={() => setShowLockConfirm(true)}
                disabled={!hasAnyInput}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm ${
                  hasAnyInput 
                    ? 'bg-amber-500 text-white hover:bg-amber-600' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Lock size={18} />
                Kunci & Review
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsLocked(false)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Unlock size={18} />
                  Buka Kunci
                </button>
                <button
                  onClick={() => setShowSaveConfirm(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md"
                >
                  <Save size={18} />
                  Simpan Tunggakan
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {showLockConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Kunci & Review?</h3>
              <p className="text-slate-600">
                Data akan dikunci untuk ditinjau sebelum disimpan. Anda masih bisa membuka kunci jika ada yang perlu diperbaiki.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowLockConfirm(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setIsLocked(true);
                  setShowLockConfirm(false);
                }}
                className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
              >
                Ya, Kunci
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Save size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Simpan Tunggakan?</h3>
              <p className="text-slate-600">
                Data tunggakan akan disimpan secara permanen ke tiap anggota. Pastikan semua nominal sudah sesuai.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSaveConfirm(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Ya, Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-semibold mb-1">📌 Cara penggunaan</p>
        <ul className="space-y-1 text-blue-600 list-disc list-inside">
          <li>Isi angka di tiap kotak = jumlah poin jimpitan hari itu</li>
          <li>Setiap 1 poin = <strong>Rp500</strong>, total otomatis dihitung</li>
          <li>Klik <strong>Kunci & Review</strong> untuk meninjau kembali sebelum menyimpan</li>
          <li>Klik <strong>Simpan</strong> → tunggakan dicatat sebagai satu entri pada tanggal batch</li>
          <li>Gunakan <strong>Export PDF</strong> untuk mencetak tabel input saat ini</li>
        </ul>
      </div>
    </>
  ) : (
    /* HISTORY TAB - REDESIGNED TABLE MODEL */
    <div className="space-y-4">
      {batchHistory.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">Belum ada riwayat</h3>
          <p className="text-slate-500">Riwayat batch input akan muncul di sini setelah Anda menyimpan data.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="px-6 py-4 w-10"></th>
                  <th className="px-6 py-4">Tanggal Batch</th>
                  <th className="px-6 py-4 text-center">Jml Anggota</th>
                  <th className="px-6 py-4 text-center">Total Poin</th>
                  <th className="px-6 py-4 text-right">Total Nominal</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchHistory.map((record) => (
                  <HistoryRow 
                    key={record.id} 
                    record={record} 
                    onDelete={() => setRecordToDelete(record.id)} 
                    onExport={() => exportRecordToPDF(record)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Hapus Riwayat?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus riwayat batch ini? 
              <span className="block mt-2 font-medium text-slate-500 italic text-xs">
                *Tunggakan yang sudah masuk ke saldo anggota tidak akan terhapus.
              </span>
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setRecordToDelete(null)}
                className="flex-1 px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => deleteHistoryItem(recordToDelete)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl text-sm font-semibold shadow-md transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )}
</div>
  );
};

interface HistoryRowProps {
  record: BatchRecord;
  onDelete: () => void;
  onExport: () => void;
}

const HistoryRow: React.FC<HistoryRowProps> = ({ record, onDelete, onExport }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
        <td className="px-6 py-4">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white rounded transition-colors text-slate-400 hover:text-indigo-600"
          >
            <ChevronRight size={18} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90 text-indigo-600' : ''}`} />
          </button>
        </td>
        <td className="px-6 py-4 font-bold text-slate-700">
          {formatDisplayDate(new Date(record.date))}
        </td>
        <td className="px-6 py-4 text-center">
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
            {record.memberCount}
          </span>
        </td>
        <td className="px-6 py-4 text-center font-medium text-slate-600">
          {record.totalUnits}×
        </td>
        <td className="px-6 py-4 text-right font-bold text-indigo-600">
          {formatRupiah(record.totalAmount)}
        </td>
        <td className="px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <button 
              onClick={onExport}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Export PDF"
            >
              <FileDown size={18} />
            </button>
            <button 
              onClick={onDelete}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Hapus Riwayat"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50/50">
          <td colSpan={6} className="px-12 py-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-[10px] sm:text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                  <tr>
                    <th className="px-3 py-2 text-left">Nama Anggota</th>
                    {DAY_NAMES.map((day, i) => (
                      <th key={i} className="px-1 py-2 text-center">{day.substring(0, 3)}</th>
                    ))}
                    <th className="px-3 py-2 text-center">Total</th>
                    <th className="px-3 py-2 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {record.details.map((detail, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-medium text-slate-700">{detail.memberName}</td>
                      {detail.dailyUnits?.map((val, i) => (
                        <td key={i} className={`px-1 py-2 text-center ${val > 0 ? 'text-amber-600 font-bold' : 'text-slate-300'}`}>
                          {val > 0 ? val : '—'}
                        </td>
                      )) || Array.from({ length: 7 }).map((_, i) => (
                        <td key={i} className="px-1 py-2 text-center text-slate-300">—</td>
                      ))}
                      <td className="px-3 py-2 text-center font-bold text-slate-700">{detail.units}×</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-800">{formatRupiah(detail.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
