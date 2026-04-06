import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// TODO: Ganti dengan konfigurasi Firebase Anda sendiri dari Console Firebase
// Cara dapat config: Buka Firebase Console -> Project Settings -> General -> Your Apps
const firebaseConfig = {
  apiKey: "GANTI_DENGAN_API_KEY_ANDA",
  authDomain: "project-id.firebaseapp.com",
  projectId: "project-id",
  storageBucket: "project-id.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Aktifkan Offline Persistence
// Data akan tersimpan di cache browser dan disinkronkan saat online
enableIndexedDbPersistence(db, { forceOwnership: true })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.warn('Persistence failed: Browser not supported');
    }
  });