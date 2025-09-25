import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type StoryContentType = 'image' | 'video' | 'text/plain' | 'gradient';
export interface Story {
  id: string;
  title: string;
  author: string;
  contentType: StoryContentType;
  mediaUrl?: string;
  text?: string;
  gradient?: string;
  duration: number;
  link?: string | null;
  linkText?: string | null;
  publishAt?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  views: number;
  likes: number;
  reactions: string[];
}

const storiesCol = collection(db, 'stories');

export async function getAll() {
  const q = query(storiesCol, orderBy('publishAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

export async function create(payload: Partial<Story>) {
  const nowIso = new Date().toISOString();
  const docRef = await addDoc(storiesCol, {
    title: payload.title || 'Story',
    author: payload.author || 'Anonymous',
    contentType: payload.contentType || 'image',
    mediaUrl: payload.mediaUrl || null,
    text: payload.text || null,
    gradient: payload.gradient || null,
    duration: Math.min(15, Math.max(1, Number(payload.duration ?? 5))),
    link: payload.link || null,
    linkText: payload.linkText || null,
    publishAt: payload.publishAt || nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
    isActive: payload.isActive ?? true,
    views: 0,
    likes: 0,
    reactions: [],
    _serverCreatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function update(id: string, payload: Partial<Story>) {
  const ref = doc(db, 'stories', id);
  await updateDoc(ref, { ...payload });
}

export async function remove(id: string) {
  const ref = doc(db, 'stories', id);
  await deleteDoc(ref);
}

export const StoriesService = { getAll, create, update, remove };
export default StoriesService;
