import React, { useState } from 'react';
import { Member, Arrear } from '../types';
import { Check, Search, Calendar, FilePlus, AlertCircle, Wallet, Clock } from 'lucide-react';

interface ArrearViewProps {
  members: Member[];
  arrears: Arrear[];
  onAddArrear: (arrear: Arrear) => void;
  onPayArrear: (id: string, date: string) => void;
}

export const PaymentView: React.FC<ArrearViewProps> = ({ members, arrears, onAddArrear, onPayArrear }) => {
  const [activeTab, setActiveTab] = useState<'ADD' | 'UNPAID' | 'HISTORY'>('UNPAID');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State for Adding Arrear
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number>(50000);
  const [createDate, setCreateDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal State for Payment
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedArrearId, setSelectedArrearId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    const newArrear: Arrear = {
      id: Date.now().toString(),
      memberId: member.id,
      memberName: member.name,
      title: title,
      amount: Number(amount),
      createdAt: createDate,
      status: 'BELUM_LUNAS'
    };

    onAddArrear(newArrear);
    alert('Tunggakan berhasil ditambahkan');
    setTitle('');
    setActiveTab('UNPAID');
  };

  const openPayModal = (id: string) => {
    setSelectedArrearId(id);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayModalOpen(true);
  };

  const confirmPayment = () => {
    if (selectedArrearId) {
      onPayArrear(selectedArrearId, payDate);
      setPayModalOpen(false);
      setSelectedArrearId(null);
    }
  };

  // Filter logic
  const filteredArrears = arrears.filter(a => {
    const matchesSearch = a.memberName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'UNPAID') return matchesSearch && a.status === 'BELUM_LUNAS';
    if (activeTab === 'HISTORY') return matchesSearch && a.status === 'LUNAS';
    return false;
  });

  return (
    <div className="space-y-6">
      
      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('ADD')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'ADD' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
        >
          <FilePlus size={16} /> Tambah Tunggakan
        </button>
        <button 
          onClick={() => setActiveTab('UNPAID')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'UNPAID' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
        >
          <AlertCircle size={16} /> Belum Lunas
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'HISTORY' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-indigo-600'}`}
        >
          <Clock size={16} /> Riwayat Lunas
        </button>
      </div>

      {/* VIEW: ADD ARREAR */}
      {activeTab === 'ADD' && (
        <div className="max-w-xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FilePlus className="text-indigo-600" size={20}/>
              Input Tagihan Manual
            </h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Anggota</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-100"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Anggota --</option>
                  {members.filter(m => m.status === 'Aktif').map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Judul Tagihan</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Iuran Mei, Denda, Sumbangan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-100"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-100"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Tagihan</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-slate-100"
                    value={createDate}
                    onChange={(e) => setCreateDate(e.target.value)}
                    required
                    onClick={(e) => e.currentTarget.showPicker()}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors mt-4"
              >
                Simpan Tagihan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW: LIST (UNPAID / HISTORY) */}
      {(activeTab === 'UNPAID' || activeTab === 'HISTORY') && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200">
             <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari nama atau tagihan..." 
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="text-sm font-medium text-slate-500">
                Total: {filteredArrears.length} item
              </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredArrears.length > 0 ? (
              filteredArrears.map((item) => (
                <div key={item.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800">{item.memberName}</h4>
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      item.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.status === 'LUNAS' ? 'LUNAS' : 'BELUM BAYAR'}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm mb-1">{item.title}</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-xs text-slate-400">Rp</span>
                    <span className="text-xl font-bold text-slate-900">{item.amount.toLocaleString('id-ID')}</span>
                  </div>
                  
                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {item.status === 'LUNAS' 
                        ? `Lunas: ${item.paidAt}` 
                        : `Dibuat: ${item.createdAt}`}
                    </span>
                    
                    {item.status === 'BELUM_LUNAS' && (
                      <button 
                        onClick={() => openPayModal(item.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Wallet size={12} />
                        Lunasi
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <p>Tidak ada data ditemukan.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAY MODAL */}
      {payModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-4 text-slate-800">Konfirmasi Pelunasan</h3>
            <p className="text-sm text-slate-600 mb-4">
              Masukkan tanggal pelunasan untuk tagihan ini.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Bayar</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-slate-100"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setPayModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
              >
                Batal
              </button>
              <button 
                onClick={confirmPayment}
                className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm flex items-center gap-2"
              >
                <Check size={16} /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};