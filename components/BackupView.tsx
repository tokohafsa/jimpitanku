
import React, { useRef, useState, useEffect } from 'react';
import { getFullDatabase, restoreFullDatabase, getLastBackup, saveLastBackup } from '../services/storageService';
import { Save, FolderOpen, Database, AlertCircle, CheckCircle, Info, FileText, ArrowRight } from 'lucide-react';

export const BackupView: React.FC<{ onDatabaseLoaded?: () => void }> = ({ onDatabaseLoaded }) => {
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // State untuk Preview Restore
  const [restorePreview, setRestorePreview] = useState<{
    membersCount: number;
    arrearsCount: number;
    lastDate: string;
    rawData: any;
  } | null>(null);

  const handleBackupJSON = () => {
    try {
      const data = getFullDatabase();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_jimpitanku_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setNotification({
        type: 'success',
        message: 'Database berhasil di-download! Simpan file ini di tempat yang aman.'
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Gagal melakukan backup data.'
      });
    }
  };

  const handleFileSelect = () => {
    backupInputRef.current?.click();
  };

  const handleBackupFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Validasi struktur mendalam
        if (!data || typeof data !== 'object') throw new Error("File bukan JSON yang valid.");
        if (!Array.isArray(data.members)) throw new Error("Data 'members' tidak ditemukan.");
        if (!Array.isArray(data.arrears)) throw new Error("Data 'arrears' tidak ditemukan.");
        
        // Validasi minimal isi data
        if (data.members.length > 0) {
          const firstMember = data.members[0];
          if (!firstMember.id || !firstMember.name) throw new Error("Format data anggota tidak valid.");
        }

        // Set Preview
        setRestorePreview({
          membersCount: data.members.length,
          arrearsCount: data.arrears.length,
          lastDate: data.exportedAt ? new Date(data.exportedAt).toLocaleDateString('id-ID') : 'Tidak diketahui',
          rawData: data
        });

      } catch (err) {
        console.error(err);
        setNotification({
          type: 'error',
          message: 'Gagal membaca file. Pastikan file .json backup yang valid.'
        });
      }
      // Reset input agar bisa pilih file yang sama lagi jika perlu
      if (backupInputRef.current) backupInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const executeRestore = () => {
    if (!restorePreview) return;

    try {
      restoreFullDatabase(restorePreview.rawData);
      setNotification({
        type: 'success',
        message: 'Database berhasil dipulihkan!'
      });
      setRestorePreview(null);
      setTimeout(() => {
        if (onDatabaseLoaded) onDatabaseLoaded();
      }, 1000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Terjadi kesalahan saat memulihkan data.'
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <input 
        type="file" 
        accept=".json" 
        ref={backupInputRef} 
        onChange={handleBackupFileChange} 
        className="hidden" 
      />

      {/* Notification Popup */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-lg shadow-lg max-w-md animate-in slide-in-from-top-2 duration-300 flex items-start gap-3 border ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="mt-0.5" size={20} /> : <AlertCircle className="mt-0.5" size={20} />}
          <div>
            <h4 className="font-bold text-sm mb-1">{notification.type === 'success' ? 'Berhasil' : 'Gagal'}</h4>
            <p className="text-sm">{notification.message}</p>
          </div>
          <button onClick={() => setNotification(null)} className="ml-auto text-slate-400 hover:text-slate-600">
            <span className="sr-only">Tutup</span>
            &times;
          </button>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-slate-800">Backup & Restore</h2>
        <p className="text-slate-500">Amankan data Anda dengan menyimpannya ke file lokal.</p>
      </div>

      {/* PREVIEW MODAL / SECTION */}
      {restorePreview && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shrink-0">
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Konfirmasi Pemulihan Data</h3>
              <p className="text-slate-600 text-sm">
                Anda akan menimpa data saat ini dengan data dari file backup.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-orange-100 p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-2">
              <p className="text-xs text-slate-500 uppercase font-bold">Anggota</p>
              <p className="text-2xl font-bold text-slate-800">{restorePreview.membersCount}</p>
            </div>
            <div className="text-center p-2 border-t sm:border-t-0 sm:border-l border-slate-100">
              <p className="text-xs text-slate-500 uppercase font-bold">Transaksi</p>
              <p className="text-2xl font-bold text-slate-800">{restorePreview.arrearsCount}</p>
            </div>
            <div className="text-center p-2 border-t sm:border-t-0 sm:border-l border-slate-100">
              <p className="text-xs text-slate-500 uppercase font-bold">Tgl Backup</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{restorePreview.lastDate}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button 
              onClick={() => setRestorePreview(null)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50"
            >
              Batal
            </button>
            <button 
              onClick={executeRestore}
              className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 shadow-sm flex items-center gap-2"
            >
              <CheckCircle size={18} /> Ya, Muat Database
            </button>
          </div>
        </div>
      )}

      {/* GRID CONTAINER */}
      <div className="flex flex-col gap-6">

        {/* Gunakan Data Tersimpan Card */}
        {onDatabaseLoaded && (
          <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4">
              <Database size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Gunakan Data Tersimpan</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md">
              Data dari sesi sebelumnya masih tersimpan di browser. Klik untuk langsung menggunakannya tanpa perlu upload file.
            </p>
            <button
              onClick={onDatabaseLoaded}
              className="w-full md:w-auto px-8 bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} /> Gunakan Data Ini
            </button>
          </div>
        )}
        
        {/* Restore Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center hover:border-orange-300 transition-colors w-full">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 mb-4">
            <FolderOpen size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Pilih Database</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-md">
            Pilih file backup (.json) untuk mengembalikan data Anda.
          </p>
          <button 
            onClick={handleFileSelect}
            className="w-full md:w-auto px-8 bg-emerald-600 text-white font-medium py-2.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <FolderOpen size={18} /> Pilih File Database
          </button>
        </div>

        {/* Backup Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center hover:border-indigo-300 transition-colors w-full">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4">
            <Save size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Simpan Database</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-md">
            Simpan seluruh data anggota, tunggakan, dan jadwal ke dalam satu file (.json) di komputer Anda.
          </p>
          <button 
            onClick={handleBackupJSON}
            className="w-full md:w-auto px-8 bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Save size={18} /> Simpan Database
          </button>
        </div>

      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 items-start">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <div>
           <h4 className="text-sm font-bold text-blue-800 mb-1">Informasi Penting</h4>
           <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
             <li>Aplikasi ini menyimpan data secara otomatis di browser Anda.</li>
             <li>Lakukan Backup Database secara berkala untuk keamanan data maksimal.</li>
           </ul>
        </div>
      </div>
    </div>
  );
};
