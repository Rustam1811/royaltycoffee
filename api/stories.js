import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';
import { applyCors } from './_lib/cors.js';

if (!getApps().length) {
  initializeApp({
    credential: credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n')
    })
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const { action } = req.query;
  switch (action) {
    case 'get':
      return getStories(req, res);
    case 'create':
      return createStory(req, res);
    case 'update':
      return updateStory(req, res);
    case 'delete':
      return deleteStory(req, res);
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function getStories(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const snap = await db.collection('stories').orderBy('createdAt', 'desc').get();
    const stories = [];
    snap.forEach(doc => stories.push({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ stories });
  } catch (e) {
    console.error('Get stories error:', e);
    return res.status(500).json({ error: 'Failed to get stories' });
  }
}

async function createStory(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { title, author, duration, contentType, mediaUrl, text, gradient } = req.body || {};
  if (!title || !author || !contentType) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const story = {
      title,
      author,
      duration: duration || 5,
      contentType,
      mediaUrl: mediaUrl || '',
      text: text || '',
      gradient: gradient || 'sunset',
      likes: 0,
      views: 0,
      reactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const ref = await db.collection('stories').add(story);
    return res.status(201).json({ success: true, storyId: ref.id, story: { id: ref.id, ...story } });
  } catch (e) {
    console.error('Create story error:', e);
    return res.status(500).json({ error: 'Failed to create story' });
  }
}

async function updateStory(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Story ID is required' });
  try {
    const patch = { ...req.body, updatedAt: new Date().toISOString() };
    delete patch.id;
    await db.collection('stories').doc(String(id)).update(patch);
    return res.status(200).json({ success: true, message: 'Story updated successfully' });
  } catch (e) {
    console.error('Update story error:', e);
    return res.status(500).json({ error: 'Failed to update story' });
  }
}

async function deleteStory(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Story ID is required' });
  try {
    await db.collection('stories').doc(String(id)).delete();
    return res.status(200).json({ success: true, message: 'Story deleted successfully' });
  } catch (e) {
    console.error('Delete story error:', e);
    return res.status(500).json({ error: 'Failed to delete story' });
  }
}
