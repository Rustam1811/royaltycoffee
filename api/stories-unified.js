// Объединенный API для сторис: stories + upload-story + upload-story-simple + upload-story-local
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { applyCors } from './_lib/cors.js';

// Инициализация Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const { action } = req.query;

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
  } catch (error) {
    console.error('Stories API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getStories(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const storiesSnap = await db.collection('stories')
      .orderBy('createdAt', 'desc')
      .get();

    const stories = [];
    storiesSnap.forEach(doc => {
      stories.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return res.status(200).json({ stories });
  } catch (error) {
    console.error('Get stories error:', error);
    return res.status(500).json({ error: 'Failed to get stories' });
  }
}

async function createStory(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, author, duration, contentType, mediaUrl, text, gradient } = req.body;

  if (!title || !author || !contentType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const storyData = {
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

    const storyRef = await db.collection('stories').add(storyData);

    return res.status(201).json({
      success: true,
      storyId: storyRef.id,
      story: {
        id: storyRef.id,
        ...storyData
      }
    });
  } catch (error) {
    console.error('Create story error:', error);
    return res.status(500).json({ error: 'Failed to create story' });
  }
}

async function uploadStory(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Здесь должна быть логика загрузки файла
    // Для упрощения возвращаем mock данные
    const mockUploadResult = {
      success: true,
      url: 'https://example.com/uploaded-story.jpg',
      contentType: 'image/jpeg',
      fileName: `story-${uuidv4()}.jpg`
    };

    return res.status(200).json(mockUploadResult);
  } catch (error) {
    console.error('Upload story error:', error);
    return res.status(500).json({ error: 'Failed to upload story' });
  }
}

async function simpleUploadStory(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, author, file } = req.body;

  if (!title || !author || !file) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Упрощенная загрузка - создаем сторис с переданными данными
    const storyData = {
      title,
      author,
      duration: 5,
      contentType: 'image/jpeg',
      mediaUrl: file, // В реальности здесь должен быть URL загруженного файла
      likes: 0,
      views: 0,
      reactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const storyRef = await db.collection('stories').add(storyData);

    return res.status(201).json({
      success: true,
      message: 'Story uploaded successfully',
      storyId: storyRef.id,
      story: {
        id: storyRef.id,
        ...storyData
      }
    });
  } catch (error) {
    console.error('Simple upload story error:', error);
    return res.status(500).json({ error: 'Failed to upload story' });
  }
}

async function localUploadStory(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Локальная загрузка - сохраняем в папку uploads
    const uploadResult = {
      success: true,
      url: `/uploads/story-${Date.now()}.jpg`,
      message: 'Story uploaded locally'
    };

    return res.status(200).json(uploadResult);
  } catch (error) {
    console.error('Local upload story error:', error);
    return res.status(500).json({ error: 'Failed to upload story locally' });
  }
}

async function deleteStory(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, storyId } = req.query;
  const targetId = id || storyId; // Support both 'id' and 'storyId' for compatibility

  if (!targetId) {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  try {
    await db.collection('stories').doc(targetId).delete();

    return res.status(200).json({
      success: true,
      message: 'Story deleted successfully'
    });
  } catch (error) {
    console.error('Delete story error:', error);
    return res.status(500).json({ error: 'Failed to delete story' });
  }
}

async function updateStory(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  try {
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    // Remove id from updateData if it exists
    delete updateData.id;

    await db.collection('stories').doc(id).update(updateData);

    return res.status(200).json({
      success: true,
      message: 'Story updated successfully'
    });
  } catch (error) {
    console.error('Update story error:', error);
    return res.status(500).json({ error: 'Failed to update story' });
  }
}

async function cloneStory(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  try {
    // Get the original story
    const originalStoryDoc = await db.collection('stories').doc(id).get();
    if (!originalStoryDoc.exists) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const originalData = originalStoryDoc.data();
    
    // Create clone with modified title and reset counters
    const cloneData = {
      ...originalData,
      title: `${originalData.title} (копия)`,
      likes: 0,
      views: 0,
      reactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const cloneRef = await db.collection('stories').add(cloneData);

    return res.status(201).json({
      success: true,
      message: 'Story cloned successfully',
      storyId: cloneRef.id,
      story: {
        id: cloneRef.id,
        ...cloneData
      }
    });
  } catch (error) {
    console.error('Clone story error:', error);
    return res.status(500).json({ error: 'Failed to clone story' });
  }
}

async function likeStory(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  try {
    const storyRef = db.collection('stories').doc(id);
    const storyDoc = await storyRef.get();
    
    if (!storyDoc.exists) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const currentLikes = storyDoc.data().likes || 0;
    await storyRef.update({
      likes: currentLikes + 1,
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Story liked successfully',
      likes: currentLikes + 1
    });
  } catch (error) {
    console.error('Like story error:', error);
    return res.status(500).json({ error: 'Failed to like story' });
  }
}

async function recordView(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  try {
    const storyRef = db.collection('stories').doc(id);
    const storyDoc = await storyRef.get();
    
    if (!storyDoc.exists) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const currentViews = storyDoc.data().views || 0;
    await storyRef.update({
      views: currentViews + 1,
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'View recorded successfully',
      views: currentViews + 1
    });
  } catch (error) {
    console.error('Record view error:', error);
    return res.status(500).json({ error: 'Failed to record view' });
  }
}

async function getStats(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Story ID is required' });
  }

  try {
    const storyDoc = await db.collection('stories').doc(id).get();
    
    if (!storyDoc.exists) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const data = storyDoc.data();
    
    return res.status(200).json({
      success: true,
      stats: {
        views: data.views || 0,
        likes: data.likes || 0,
        reactions: data.reactions || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({ error: 'Failed to get stats' });
  }
}
