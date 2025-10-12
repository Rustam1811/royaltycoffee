import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  _serverCreatedAt?: FirestoreTs; // Firestore timestamp
  audience?: 'everyone' | 'close-friends'; // Для кого видна сторис
}

export interface FirestoreTs { seconds: number; nanoseconds: number; toDate?: () => Date }

const storiesCol = collection(db, 'stories');

interface RawStory { [k:string]: unknown }
function asString(v: unknown, fallback = ''): string { return typeof v === 'string' ? v : fallback; }
function asNum(v: unknown, fallback = 0): number { const n = typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : NaN); return Number.isFinite(n) ? n : fallback; }
function asTs(v: unknown): FirestoreTs | undefined { if (v && typeof v === 'object' && 'seconds' in v && 'nanoseconds' in v) return v as FirestoreTs; }
const normalize = (raw: RawStory): Story => ({
  id: asString(raw.id),
  title: asString(raw.title),
  author: asString(raw.author),
  contentType: (asString(raw.contentType,'image') as StoryContentType),
  mediaUrl: raw.mediaUrl ? asString(raw.mediaUrl) : undefined,
  text: raw.text ? asString(raw.text) : undefined,
  gradient: raw.gradient ? asString(raw.gradient) : undefined,
  duration: asNum(raw.duration,5),
  link: raw.link ? asString(raw.link) : null,
  linkText: raw.linkText ? asString(raw.linkText) : null,
  publishAt: asString(raw.publishAt) || asString(raw.createdAt) || new Date().toISOString(),
  createdAt: asString(raw.createdAt) || new Date().toISOString(),
  updatedAt: asString(raw.updatedAt),
  isActive: !!raw.isActive,
  views: asNum(raw.views,0),
  likes: asNum(raw.likes,0),
  reactions: Array.isArray(raw.reactions) ? raw.reactions as string[] : [],
  _serverCreatedAt: asTs(raw._serverCreatedAt),
  audience: asString(raw.audience) as 'everyone' | 'close-friends' || 'everyone', // ДОБАВЛЕНО!
});

export async function getAll(): Promise<Story[]> {
  const q = query(storiesCol, orderBy('publishAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => normalize({ id: d.id, ...d.data() }));
}

export async function create(payload: Partial<Story>): Promise<string> {
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

export async function update(id: string, payload: Partial<Story>): Promise<void> {
  const ref = doc(db, 'stories', id);
  await updateDoc(ref, { ...payload });
}

export async function remove(id: string): Promise<void> {
  const ref = doc(db, 'stories', id);
  await deleteDoc(ref);
}

export const StoriesService = { getAll, create, update, remove };
export default StoriesService;
