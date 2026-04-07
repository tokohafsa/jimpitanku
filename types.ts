
export interface Member {
  id: string;
  name: string;
  joinDate: string; // Internal use only
  status: MemberStatus;
  notes?: string;
}

export enum MemberStatus {
  ACTIVE = 'Aktif',
  INACTIVE = 'Non-Aktif'
}

export type ArrearStatus = 'BELUM_LUNAS' | 'LUNAS';

export interface Arrear {
  id: string;
  memberId: string;
  memberName: string;
  title: string; // e.g., "Iuran Januari 2024", "Denda Keterlambatan"
  amount: number;
  createdAt: string; // Tanggal tunggakan dibuat
  status: ArrearStatus;
  paidAt?: string; // Tanggal pelunasan (optional, ada jika lunas)
  paymentId?: string; // ID transaksi pembayaran (untuk grouping history)
}

export interface MeetingSchedule {
  id: string;
  monthIndex: number; // 0 = Januari, 11 = Desember
  year: number;
  hostMemberId: string; // ID anggota yang dipilih
}

export interface MonthlyStats {
  month: string;
  totalCollected: number;
  totalOutstanding: number;
}

export type ViewState = 'DASHBOARD' | 'MEMBERS' | 'ARREARS' | 'SCHEDULE' | 'HISTORY' | 'BACKUP' | 'AI_INSIGHTS' | 'BATCH_INPUT';

export interface BatchRecord {
  id: string;
  date: string;
  totalAmount: number;
  totalUnits: number;
  memberCount: number;
  details: {
    memberId: string;
    memberName: string;
    units: number;
    amount: number;
    dailyUnits: number[]; // Array of 7 numbers for Minggu-Sabtu
  }[];
}
