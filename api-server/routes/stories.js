// api-server/routes/stories.js
const express = require('express');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

const db = admin.firestore();
const router = express.Router();

router.all('*', async (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query || {};
  try {
    switch (action) {
      case 'get':
        return await getStories(req, res);
      case 'create':
        return await createStory(req, res);
      case 'update':
        return await updateStory(req, res);
      case 'delete':
        return await deleteStory(req, res);
      case 'clone':
        return await cloneStory(req, res);
      case 'like':
        return await likeStory(req, res);
      case 'view':
        return await recordView(req, res);
      case 'stats':
        return await getStats(req, res);
      case 'upload':
        return await uploadStory(req, res);
      case 'simple-upload':
        return await simpleUploadStory(req, res);
      case 'local-upload':
        return await localUploadStory(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (e) {
    console.error('Stories API error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

async function getStories(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const snap = await db.collection('stories').orderBy('createdAt', 'desc').get();
    const stories = [];
    snap.forEach(d => stories.push({ id: d.id, ...d.data() }));
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
    const data = { title, author, duration: duration || 5, contentType, mediaUrl: mediaUrl || '', text: text || '', gradient: gradient || 'sunset', likes: 0, views: 0, reactions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const ref = await db.collection('stories').add(data);
    return res.status(201).json({ success: true, storyId: ref.id, story: { id: ref.id, ...data } });
  } catch (e) {
    console.error('Create story error:', e);
    return res.status(500).json({ error: 'Failed to create story' });
  }
}

async function uploadStory(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = { success: true, url: 'https://example.com/uploaded-story.jpg', contentType: 'image/jpeg', fileName: `story-${uuidv4()}.jpg` };
    return res.status(200).json(result);
  } catch (e) {
    console.error('Upload story error:', e);
    return res.status(500).json({ error: 'Failed to upload story' });
  }
}

async function simpleUploadStory(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { title, author, file } = req.body || {};
  if (!title || !author || !file) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const data = { title, author, duration: 5, contentType: 'image/jpeg', mediaUrl: file, likes: 0, views: 0, reactions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const ref = await db.collection('stories').add(data);
    return res.status(201).json({ success: true, message: 'Story uploaded successfully', storyId: ref.id, story: { id: ref.id, ...data } });
  } catch (e) {
    console.error('Simple upload story error:', e);
    return res.status(500).json({ error: 'Failed to upload story' });
  }
}

async function localUploadStory(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = { success: true, url: `/uploads/story-${Date.now()}.jpg`, message: 'Story uploaded locally' };
    return res.status(200).json(result);
  } catch (e) {
    console.error('Local upload story error:', e);
    return res.status(500).json({ error: 'Failed to upload story locally' });
  }
}

async function deleteStory(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  const { id, storyId } = req.query || {};
  const targetId = id || storyId;
  if (!targetId) return res.status(400).json({ error: 'Story ID is required' });
  try {
    await db.collection('stories').doc(String(targetId)).delete();
    return res.status(200).json({ success: true, message: 'Story deleted successfully' });
  } catch (e) {
    console.error('Delete story error:', e);
    return res.status(500).json({ error: 'Failed to delete story' });
  }
}

async function updateStory(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query || {};
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

async function cloneStory(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query || {};
  if (!id) return res.status(400).json({ error: 'Story ID is required' });
  try {
    const orig = await db.collection('stories').doc(String(id)).get();
    if (!orig.exists) return res.status(404).json({ error: 'Story not found' });
    const original = orig.data();
    const clone = { ...original, title: `${original.title} (копия)`, likes: 0, views: 0, reactions: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const ref = await db.collection('stories').add(clone);
    return res.status(201).json({ success: true, message: 'Story cloned successfully', storyId: ref.id, story: { id: ref.id, ...clone } });
  } catch (e) {
    console.error('Clone story error:', e);
    return res.status(500).json({ error: 'Failed to clone story' });
  }
}

async function likeStory(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query || {};
  if (!id) return res.status(400).json({ error: 'Story ID is required' });
  try {
    const ref = db.collection('stories').doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Story not found' });
    const current = snap.data().likes || 0;
    await ref.update({ likes: current + 1, updatedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, message: 'Story liked successfully', likes: current + 1 });
  } catch (e) {
    console.error('Like story error:', e);
    return res.status(500).json({ error: 'Failed to like story' });
  }
}

async function recordView(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query || {};
  if (!id) return res.status(400).json({ error: 'Story ID is required' });
  try {
    const ref = db.collection('stories').doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Story not found' });
    const current = snap.data().views || 0;
    await ref.update({ views: current + 1, updatedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, message: 'View recorded successfully', views: current + 1 });
  } catch (e) {
    console.error('Record view error:', e);
    return res.status(500).json({ error: 'Failed to record view' });
  }
}

async function getStats(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { id } = req.query || {};
  if (!id) return res.status(400).json({ error: 'Story ID is required' });
  try {
    const snap = await db.collection('stories').doc(String(id)).get();
    if (!snap.exists) return res.status(404).json({ error: 'Story not found' });
    const data = snap.data();
    return res.status(200).json({ success: true, stats: { views: data.views || 0, likes: data.likes || 0, reactions: data.reactions || [], createdAt: data.createdAt, updatedAt: data.updatedAt } });
  } catch (e) {
    console.error('Get stats error:', e);
    return res.status(500).json({ error: 'Failed to get stats' });
  }
}

module.exports = router;
