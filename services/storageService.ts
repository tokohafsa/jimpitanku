import { Member, Arrear, MeetingSchedule, BatchRecord } from '../types';
import { INITIAL_MEMBERS, INITIAL_ARREARS } from '../constants';

const MEMBERS_KEY = 'IURAN_APP_MEMBERS_V2';
const ARREARS_KEY = 'IURAN_APP_ARREARS_V2';
const SCHEDULES_KEY = 'IURAN_APP_SCHEDULES_V1';
const BATCH_HISTORY_KEY = 'IURAN_APP_BATCH_HISTORY_V1';
const LAST_BACKUP_KEY = 'IURAN_APP_LAST_BACKUP_V1';

export const getMembers = (): Member[] => {
  const data = localStorage.getItem(MEMBERS_KEY);
  if (!data) {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(INITIAL_MEMBERS));
    return INITIAL_MEMBERS;
  }
  return JSON.parse(data);
};

export const saveMembers = (members: Member[]) => {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
};

export const getArrears = (): Arrear[] => {
  const data = localStorage.getItem(ARREARS_KEY);
  if (!data) {
    localStorage.setItem(ARREARS_KEY, JSON.stringify(INITIAL_ARREARS));
    return INITIAL_ARREARS;
  }
  return JSON.parse(data);
};

export const saveArrears = (arrears: Arrear[]) => {
  localStorage.setItem(ARREARS_KEY, JSON.stringify(arrears));
};

export const getSchedules = (): MeetingSchedule[] => {
  const data = localStorage.getItem(SCHEDULES_KEY);
  if (!data) {
    return [];
  }
  return JSON.parse(data);
};

export const saveSchedules = (schedules: MeetingSchedule[]) => {
  localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
};

export const getBatchHistory = (): BatchRecord[] => {
  const data = localStorage.getItem(BATCH_HISTORY_KEY);
  if (!data) return [];
  return JSON.parse(data);
};

export const saveBatchHistory = (history: BatchRecord[]) => {
  localStorage.setItem(BATCH_HISTORY_KEY, JSON.stringify(history));
};

export const getLastBackup = (): string | null => {
  return localStorage.getItem(LAST_BACKUP_KEY);
};

export const saveLastBackup = (date: string) => {
  localStorage.setItem(LAST_BACKUP_KEY, date);
};

// --- NEW: BACKUP & RESTORE FUNCTIONS ---

export const getFullDatabase = () => {
  return {
    members: getMembers(),
    arrears: getArrears(),
    schedules: getSchedules(),
    batchHistory: getBatchHistory(),
    exportedAt: new Date().toISOString(),
    appVersion: '1.0'
  };
};

export const restoreFullDatabase = (data: any) => {
  if (!data || !Array.isArray(data.members) || !Array.isArray(data.arrears)) {
    throw new Error('Format file backup tidak valid. Pastikan menggunakan file .json hasil backup aplikasi ini.');
  }

  saveMembers(data.members);
  saveArrears(data.arrears);
  if (data.schedules && Array.isArray(data.schedules)) {
    saveSchedules(data.schedules);
  }
  if (data.batchHistory && Array.isArray(data.batchHistory)) {
    saveBatchHistory(data.batchHistory);
  }
};