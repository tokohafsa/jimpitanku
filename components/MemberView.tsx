
import React, { useState, useRef } from 'react';
import { Member, MemberStatus, Arrear } from '../types';
import { Plus, Trash2, Search, User, Hash, Calculator, AlertTriangle, Upload, Download, UserCheck, UserX, Info } from 'lucide-react';

interface MemberViewProps {
  members: Member[];
  arrears: Arrear[]; // Needed for calculating stats for export
  onAddMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  onAddArrear: (arrear: Arrear) => void;
  // New props for bulk operations
  onBulkAddMembers: (members: Member[]) => void;
  onBulkAddArrears: (arrears: Arrear[]) => void;
  onToggleStatus: (id: string) => void;
}

export const MemberView: React.FC<MemberViewProps> = ({ 
  members, 
  arrears, 
  onAddMember, 
  onDeleteMember, 
  onAddArrear,
  onBulkAddMembers,
  onBulkAddArrears,
  onToggleStatus
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // CSV Ref
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // Delete Modal State
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);

  // Status Confirmation State
  const [statusConfirmMember, setStatusConfirmMember] = useState<Member | null>(null);

  // Detail Member State
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [emptyCount, setEmptyCount] = useState<string>(''); // Input jumlah kosong

  // -- CSV Logic --
  const handleExportCSV = () => {
    // Calculate stats for export
    const memberStats = members.map(member => {
      const memberArrears = arrears.filter(a => a.memberId === member.id && a.status === 'BELUM_LUNAS');
      const activeAmountRp = memberArrears.reduce((sum, item) => sum + item.amount, 0);
      const activeCount = activeAmountRp / 500;
      return { name: member.name, activeCount };
    });

    const rows = [
      ['nama', 'jumlah'], 
      ...memberStats.map(m => [m.name, m.activeCount.toString()])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_tunggakan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSVClick = () => {
    csvInputRef.current?.click();
  };

  const handleCSVFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const lines = content.split('\n');
      
      // Temporary arrays to hold bulk data
      const newMembersList: Member[] = [];
      const newArrearsList: Arrear[] = [];
      let importedCount = 0;

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;
        const parts = trimmedLine.split(',');
        if (parts.length < 2) return;

        const rawName = parts[0].trim().replace(/^"|"$/g, '');
        const rawCount = parts[1].trim().replace(/^"|"$/g, '');
        
        // Skip header
        if (rawName.toLowerCase() === 'nama' && rawCount.toLowerCase() === 'jumlah') return;

        const count = parseInt(rawCount);
        if (!rawName || isNaN(count)) {
          return;
        }

        const newMemberId = `imp-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
        
        const newMember: Member = {
          id: newMemberId,
          name: rawName,
          joinDate: new Date().toISOString().split('T')[0],
          status: MemberStatus.ACTIVE
        };
        
        // Add to temp list instead of calling state update directly
        newMembersList.push(newMember);

        if (count > 0) {
          const newArrear: Arrear = {
            id: `imp-arr-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
            memberId: newMemberId,
            memberName: rawName,
            title: `Import Awal (${count} Kosong)`,
            amount: count * 500,
            createdAt: new Date().toISOString().split('T')[0],
            status: 'BELUM_LUNAS'
          };
          newArrearsList.push(newArrear);
        }
        importedCount++;
      });

      // Execute Bulk Updates
      if (newMembersList.length > 0) {
        onBulkAddMembers(newMembersList);
      }
      
      if (newArrearsList.length > 0) {
        onBulkAddArrears(newArrearsList);
      }

      if (importedCount > 0) {
        alert(`Berhasil mengimpor ${importedCount} anggota.`);
      } else {
        alert('Gagal mengimpor data CSV atau format salah.');
      }
      
      if (csvInputRef.current) csvInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Create Member
    const newMemberId = Date.now().toString();
    const newMember: Member = {
      id: newMemberId,
      name: newName,
      joinDate: new Date().toISOString().split('T')[0],
      status: MemberStatus.ACTIVE
    };
    onAddMember(newMember);

    // 2. Create Initial Arrear based on "Jumlah Kosong * 500"
    const count = parseInt(emptyCount || '0');
    const totalArrear = count * 500;

    if (totalArrear > 0) {
      const newArrear: Arrear = {
        id: `init-${Date.now()}`,
        memberId: newMemberId,
        memberName: newName,
        title: `Tunggakan Awal (${count} Kosong)`,
        amount: totalArrear,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'BELUM_LUNAS'
      };
      onAddArrear(newArrear);
    }

    setNewName('');
    setEmptyCount('');
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    if (deleteMemberId) {
      onDeleteMember(deleteMemberId);
      setDeleteMemberId(null);
    }
  };

  const confirmStatusChange = () => {
    if (statusConfirmMember) {
      onToggleStatus(statusConfirmMember.id);
      setStatusConfirmMember(null);
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
       {/* Hidden File Input */}
       <input 
        type="file" 
        accept=".csv" 
        ref={csvInputRef} 
        onChange={handleCSVFileChange} 
        className="hidden" 
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Daftar Anggota</h2>
           <p className="text-slate-500">Kelola data anggota dan import/export data.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleImportCSVClick}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              title="Import Anggota dari CSV"
            >
              <Upload size={16} /> Import CSV
            </button>
            <button 
              onClick={handleExportCSV}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              title="Download Laporan CSV"
            >
              <Download size={16} /> Export CSV
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm ml-2"
            >
              <Plus size={18} /> Tambah Anggota
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama anggota..." 
            className="bg-transparent border-none outline-none text-sm w-full text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <User size={14} />
                      </div>
                      <button
                        onClick={() => setDetailMember(member)}
                        className="text-left font-medium text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                      >
                        {member.name}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                         {/* Toggle Status Button - Triggers Confirmation */}
                         <button 
                          onClick={() => setStatusConfirmMember(member)}
                          className={`p-2 rounded-lg transition-colors ${
                            member.status === 'Aktif' 
                              ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50' 
                              : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={member.status === 'Aktif' ? "Non-aktifkan Anggota" : "Aktifkan Anggota"}
                         >
                            {member.status === 'Aktif' ? <UserX size={16} /> : <UserCheck size={16} />}
                         </button>

                         {/* Delete Button */}
                         <button 
                          onClick={() => setDeleteMemberId(member.id)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Hapus Anggota"
                         >
                          <Trash2 size={16} />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                    Tidak ada data anggota ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-slate-800">Anggota Baru</h3>
            </div>
            
            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    required 
                    placeholder="Masukkan nama"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-100"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Kosong</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-100"
                      value={emptyCount}
                      onChange={(e) => setEmptyCount(e.target.value)}
                      min="0"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Kali Rp 500</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Tunggakan</label>
                  <div className="relative">
                    <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                      type="text" 
                      readOnly
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-600 font-medium"
                      value={`Rp ${(Number(emptyCount || 0) * 500).toLocaleString('id-ID')}`}
                    />
                  </div>
                   <p className="text-xs text-slate-400 mt-1">Hasil kalkulasi</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium shadow-sm"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteMemberId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
             <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Hapus Anggota?</h3>
            </div>
            
            <p className="text-center text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus anggota ini? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setDeleteMemberId(null)}
                className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium shadow-sm"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Member Modal */}
      {detailMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600">
                <User size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{detailMember.name}</h3>
              <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium ${detailMember.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {detailMember.status}
              </span>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">ID Anggota</span>
                <span className="font-mono text-xs text-slate-700">{detailMember.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Tunggakan Aktif</span>
                <span className="font-bold text-red-600">
                  {arrears.filter(a => a.memberId === detailMember.id && a.status === 'BELUM_LUNAS').length} item
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Nominal Tunggakan</span>
                <span className="font-bold text-red-600">
                  Rp {arrears.filter(a => a.memberId === detailMember.id && a.status === 'BELUM_LUNAS').reduce((sum, a) => sum + a.amount, 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Sudah Lunas</span>
                <span className="font-bold text-emerald-600">
                  {arrears.filter(a => a.memberId === detailMember.id && a.status === 'LUNAS').length} item
                </span>
              </div>
            </div>

            <button
              onClick={() => setDetailMember(null)}
              className="w-full px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Status Toggle Confirmation Modal */}
      {statusConfirmMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
             <div className="text-center mb-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${statusConfirmMember.status === 'Aktif' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {statusConfirmMember.status === 'Aktif' ? <UserX size={24} /> : <UserCheck size={24} />}
              </div>
              <h3 className="text-lg font-bold text-slate-800">Ubah Status Anggota?</h3>
            </div>
            
            <p className="text-center text-slate-600 mb-6">
              Apakah Anda yakin ingin mengubah status <strong>{statusConfirmMember.name}</strong> menjadi 
              <strong>{statusConfirmMember.status === 'Aktif' ? ' Non-Aktif' : ' Aktif'}</strong>?
            </p>

            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setStatusConfirmMember(null)}
                className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Batal
              </button>
              <button 
                onClick={confirmStatusChange}
                className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium shadow-sm ${
                    statusConfirmMember.status === 'Aktif' 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Ya, Ubah Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
