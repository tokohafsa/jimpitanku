
import React, { useState } from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Users, CreditCard, Menu, X, CalendarDays, Database, Sparkles, History, BookOpen, Lock, Table } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  children: React.ReactNode;
  isDatabaseLoaded: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, setView, children, isDatabaseLoaded }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLockedAlert, setShowLockedAlert] = useState(false);

  // Fungsi saat NavItem diklik
  const handleNavClick = (view: ViewState, isDisabled: boolean) => {
    if (isDisabled) {
      setShowLockedAlert(true);
      // Sembunyikan alert setelah 3 detik
      setTimeout(() => setShowLockedAlert(false), 3000);
      return;
    }
    setView(view);
    setIsMobileMenuOpen(false);
  };

  const NavItem = ({ view, icon: Icon, label, isBold = false }: { view: ViewState; icon: any; label: string; isBold?: boolean }) => {
    // Menu selain BACKUP akan disabled jika database belum diload
    const isDisabled = !isDatabaseLoaded && view !== 'BACKUP';

    return (
      <button
        onClick={() => handleNavClick(view, isDisabled)}
        title={isDisabled ? "Muat database dulu" : label}
        className={`flex items-center w-full px-4 py-3 text-sm transition-colors rounded-lg mb-1 relative group ${
          isDisabled 
            ? 'text-slate-400 cursor-not-allowed bg-slate-50' 
            : currentView === view
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600'
        } ${isBold ? 'font-bold' : 'font-medium'}`}
      >
        <Icon size={20} className="mr-3" />
        <span className="flex-1 text-left">{label}</span>
        {isDisabled && <Lock size={14} className="text-slate-300" />}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      
      {/* Toast Notification (Balon) */}
      {showLockedAlert && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <Lock size={14} />
          Muat database dulu
        </div>
      )}

      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <CreditCard className="text-white" size={18} />
            </div>
            <h1 className="text-xl font-bold text-slate-800">JimpitanKu</h1>
          </div>
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Backup Moved to Top & Bold */}
          <NavItem view="BACKUP" icon={Database} label="Backup & Restore" isBold={true} />
          
          <div className="my-2 border-t border-slate-100"></div>
          
          <NavItem view="DASHBOARD" icon={BookOpen} label="Rekap Jimpitan" />
          <NavItem view="BATCH_INPUT" icon={Table} label="Batch Input Tunggakan" />
          <NavItem view="MEMBERS" icon={Users} label="Anggota" />
          <NavItem view="HISTORY" icon={History} label="Riwayat Pembayaran" />
          <NavItem view="SCHEDULE" icon={CalendarDays} label="Jadwal Pertemuan" />
          {/* AI Insights hidden per user request */}
          {/* <NavItem view="AI_INSIGHTS" icon={Sparkles} label="Asisten AI" /> */}
        </nav>
        <div className="p-4 border-t border-slate-100 text-xs text-slate-400 text-center">
          &copy; {new Date().getFullYear()} JimpitanKu App
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 z-20">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <CreditCard className="text-white" size={18} />
            </div>
            <h1 className="text-lg font-bold text-slate-800">JimpitanKu</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 w-full h-[calc(100%-4rem)] bg-white z-10 p-4 flex flex-col md:hidden">
            {/* Backup Moved to Top & Bold */}
            <NavItem view="BACKUP" icon={Database} label="Backup & Restore" isBold={true} />
            
            <div className="my-2 border-t border-slate-100"></div>

            <NavItem view="DASHBOARD" icon={BookOpen} label="Rekap Jimpitan" />
            <NavItem view="BATCH_INPUT" icon={Table} label="Batch Input Tunggakan" />
            <NavItem view="MEMBERS" icon={Users} label="Anggota" />
            <NavItem view="HISTORY" icon={History} label="Riwayat Pembayaran" />
            <NavItem view="SCHEDULE" icon={CalendarDays} label="Jadwal Pertemuan" />
            {/* AI Insights hidden per user request */}
            {/* <NavItem view="AI_INSIGHTS" icon={Sparkles} label="Asisten AI" /> */}
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
