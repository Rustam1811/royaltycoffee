import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { WorkshopClient, ClientOutlet } from '@/types';

const CLIENTS_COLLECTION = 'workshop_clients';

// Получить всех клиентов
export async function getAllClients(): Promise<WorkshopClient[]> {
  const snapshot = await getDocs(collection(db, CLIENTS_COLLECTION));
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      outlets: data.outlets || [],
      onboardingCompleted: data.onboardingCompleted ?? false,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
  }) as WorkshopClient[];
}

// Получить клиента по UID
export async function getClientByUid(uid: string): Promise<WorkshopClient | null> {
  const q = query(
    collection(db, CLIENTS_COLLECTION),
    where('uid', '==', uid)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  
  return {
    id: doc.id,
    ...data,
    outlets: data.outlets || [],
    onboardingCompleted: data.onboardingCompleted ?? false,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  } as WorkshopClient;
}

// Получить клиента по ID
export async function getClientById(clientId: string): Promise<WorkshopClient | null> {
  const docSnap = await getDoc(doc(db, CLIENTS_COLLECTION, clientId));
  
  if (!docSnap.exists()) return null;
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    outlets: data.outlets || [],
    onboardingCompleted: data.onboardingCompleted ?? false,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  } as WorkshopClient;
}

// Создать клиента
export async function createClient(
  client: Omit<WorkshopClient, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, CLIENTS_COLLECTION), {
    ...client,
    outlets: client.outlets || [],
    isActive: true,
    onboardingCompleted: client.onboardingCompleted ?? false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

// Обновить клиента
export async function updateClient(
  clientId: string,
  updates: Partial<WorkshopClient>
): Promise<void> {
  await updateDoc(doc(db, CLIENTS_COLLECTION, clientId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

// Добавить точку клиенту
export async function addOutlet(clientId: string, outlet: Omit<ClientOutlet, 'id' | 'createdAt'>): Promise<void> {
  const client = await getClientById(clientId);
  if (!client) throw new Error('Client not found');
  
  const newOutlet: ClientOutlet = {
    id: `outlet_${Date.now()}`,
    ...outlet,
    isActive: true,
    createdAt: new Date(),
  };
  
  const updatedOutlets = [...client.outlets, newOutlet];
  
  await updateDoc(doc(db, CLIENTS_COLLECTION, clientId), {
    outlets: updatedOutlets,
    updatedAt: Timestamp.now(),
  });
}

// Обновить точку
export async function updateOutlet(
  clientId: string,
  outletId: string,
  updates: Partial<ClientOutlet>
): Promise<void> {
  const client = await getClientById(clientId);
  if (!client) throw new Error('Client not found');
  
  const updatedOutlets = client.outlets.map(outlet =>
    outlet.id === outletId ? { ...outlet, ...updates } : outlet
  );
  
  await updateDoc(doc(db, CLIENTS_COLLECTION, clientId), {
    outlets: updatedOutlets,
    updatedAt: Timestamp.now(),
  });
}

// Удалить (деактивировать) точку
export async function deactivateOutlet(clientId: string, outletId: string): Promise<void> {
  await updateOutlet(clientId, outletId, { isActive: false });
}

// Алиас для addOutlet
export const addClientOutlet = addOutlet;
