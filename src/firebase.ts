import app from './lib/firebase';
import { addDoc, collection, getDocs, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Reuse the Firebase app initialized in src/lib/firebase to avoid duplicate-app errors
export { app };
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export async function bookTable(data: { name: string; time: string }) {
  const docRef = await addDoc(collection(db, 'bookings'), data);
  return docRef.id;
}

export async function getBookings() {
  const querySnapshot = await getDocs(collection(db, 'bookings'));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
