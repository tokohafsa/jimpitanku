import { Arrear, Member, MemberStatus } from './types';

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const CURRENT_YEAR = new Date().getFullYear();

export const INITIAL_MEMBERS: Member[] = [
  { id: '1', name: 'Budi Santoso', joinDate: '2023-01-15', status: MemberStatus.ACTIVE },
  { id: '2', name: 'Siti Aminah', joinDate: '2023-02-01', status: MemberStatus.ACTIVE },
  { id: '3', name: 'Rudi Hermawan', joinDate: '2023-03-10', status: MemberStatus.INACTIVE },
];

// Initialize dummy arrears (some paid, some unpaid)
export const INITIAL_ARREARS: Arrear[] = [
  { 
    id: 'a1', 
    memberId: '1', 
    memberName: 'Budi Santoso', 
    title: 'Iuran Januari 2024', 
    amount: 50000, 
    createdAt: '2024-01-01', 
    status: 'LUNAS', 
    paidAt: '2024-01-05' 
  },
  { 
    id: 'a2', 
    memberId: '1', 
    memberName: 'Budi Santoso', 
    title: 'Iuran Februari 2024', 
    amount: 50000, 
    createdAt: '2024-02-01', 
    status: 'BELUM_LUNAS' 
  },
  { 
    id: 'a3', 
    memberId: '2', 
    memberName: 'Siti Aminah', 
    title: 'Iuran Januari 2024', 
    amount: 50000, 
    createdAt: '2024-01-01', 
    status: 'LUNAS', 
    paidAt: '2024-01-10' 
  },
  { 
    id: 'a4', 
    memberId: '3', 
    memberName: 'Rudi Hermawan', 
    title: 'Denda Kebersihan', 
    amount: 15000, 
    createdAt: '2024-02-15', 
    status: 'BELUM_LUNAS' 
  },
];
