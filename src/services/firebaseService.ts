
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  query,
  orderBy,
  setDoc
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Member, Arrear, MeetingSchedule } from "../types";

// Collection References
const membersRef = collection(db, "members");
const arrearsRef = collection(db, "arrears");
const schedulesRef = collection(db, "schedules");

// --- MEMBERS ---
export const fetchMembers = async (): Promise<Member[]> => {
  const q = query(membersRef, orderBy("name"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
};

export const addMemberToDB = async (member: Member) => {
  // Use setDoc if we generated ID locally, or addDoc if we want Firebase ID
  // Since our app generates ID based on Date.now() or 'imp-', let's use setDoc to keep that ID
  await setDoc(doc(db, "members", member.id), member);
};

export const deleteMemberFromDB = async (id: string) => {
  await deleteDoc(doc(db, "members", id));
};

// --- ARREARS ---
export const fetchArrears = async (): Promise<Arrear[]> => {
  const q = query(arrearsRef);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Arrear));
};

export const addArrearToDB = async (arrear: Arrear) => {
  await setDoc(doc(db, "arrears", arrear.id), arrear);
};

export const payArrearInDB = async (id: string, date: string) => {
  const docRef = doc(db, "arrears", id);
  await updateDoc(docRef, { status: 'LUNAS', paidAt: date });
};

// Complex Transaction: Bulk Payment (Algorithm from App.tsx moved here for consistency)
export const batchPayMemberDebtInDB = async (
  memberId: string, 
  date: string, 
  amount: number, 
  allArrears: Arrear[]
) => {
  const batch = writeBatch(db);
  let remainingPayment = amount;

  // Filter and sort locally first (since we need sequential logic)
  const memberActiveArrears = allArrears
    .filter(a => a.memberId === memberId && a.status === 'BELUM_LUNAS')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const item of memberActiveArrears) {
    if (remainingPayment <= 0) break;

    const itemRef = doc(db, "arrears", item.id);

    if (remainingPayment >= item.amount) {
      // Full payment for this item
      batch.update(itemRef, { status: 'LUNAS', paidAt: date });
      remainingPayment -= item.amount;
    } else {
      // Partial payment
      // 1. Update existing to reduced amount
      batch.update(itemRef, { amount: item.amount - remainingPayment });

      // 2. Create new PAID item for the partial amount
      const newPaidId = `${item.id}-paid-${Date.now()}`;
      const paidPortion: Arrear = {
        ...item,
        id: newPaidId,
        title: `${item.title} (Parsial)`,
        amount: remainingPayment,
        status: 'LUNAS',
        paidAt: date,
      };
      const newDocRef = doc(db, "arrears", newPaidId);
      batch.set(newDocRef, paidPortion);

      remainingPayment = 0;
    }
  }

  await batch.commit();
};

// --- SCHEDULES ---
export const fetchSchedules = async (): Promise<MeetingSchedule[]> => {
  const snapshot = await getDocs(schedulesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingSchedule));
};

export const addScheduleToDB = async (schedule: MeetingSchedule) => {
  await setDoc(doc(db, "schedules", schedule.id), schedule);
};

export const updateScheduleHostInDB = async (id: string, hostMemberId: string) => {
  const docRef = doc(db, "schedules", id);
  await updateDoc(docRef, { hostMemberId });
};
