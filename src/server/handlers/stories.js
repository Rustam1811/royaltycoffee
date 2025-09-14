const { initFirebaseAdmin } = require('../firebaseAdmin');
const Busboy = require('busboy');

// Hard limits (defense in depth, mirror client STORY_LIMITS)
const IMAGE_MAX = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX = 30 * 1024 * 1024; // 30MB
const ALLOWED_IMAGE = new Set(['image/jpeg','image/png','image/webp']);
const ALLOWED_VIDEO = new Set(['video/mp4','video/webm']);

async function handleStories(req, res) {
  console.log('🎬 Stories Handler Called:', { method: req.method, url: req.url, query: req.query });
  try {
    const { admin, db, storageBucket } = initFirebaseAdmin();
    const { id, action } = req.query || {};

    // Upload
    if (req.method === 'POST' && action === 'upload') {
      console.log('📤 Story upload init. Bucket name:', storageBucket && storageBucket.name);
      // Optional ability to disable server upload via env for emergency
      if (process.env.DISABLE_STORY_SERVER_UPLOAD === 'true') {
        return res.status(503).json({ error: 'Server upload disabled', fallback: 'client' });
      }
      // Verify bucket exists (once per request)
      try {
        const [exists] = await storageBucket.exists();
        if (!exists) {
          return res.status(500).json({ error: 'Bucket does not exist', bucket: storageBucket.name, action: 'create_bucket_in_firebase_console', hint: 'Open Firebase Console > Storage and finish initialization.' });
        }
      } catch (be) {
        console.error('Bucket existence check failed:', be.message);
      }

      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('multipart/form-data')) {
        return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
      }
      const uploaderUid = req.headers['x-user-uid'] || 'unknown';
      const bb = Busboy({ headers: req.headers });
      let fileBuffer = Buffer.alloc(0);
      let filename = '';
      let mimeType = '';
      await new Promise((resolve, reject) => {
        bb.on('file', (_name, file, info) => {
          filename = info.filename || `upload_${Date.now()}`;
          mimeType = info.mimeType || 'application/octet-stream';
          file.on('data', d => fileBuffer = Buffer.concat([fileBuffer, d]));
          file.on('error', reject);
        });
        bb.on('field', (name, val) => { if (name === 'filename' && val) filename = val; });
        bb.on('finish', resolve);
        bb.on('error', reject);
        req.pipe(bb);
      });
      if (!fileBuffer.length) return res.status(400).json({ error: 'No file received' });

      // Server-side validation
      const size = fileBuffer.length;
      const isImage = ALLOWED_IMAGE.has(mimeType);
      const isVideo = ALLOWED_VIDEO.has(mimeType);
      if (!isImage && !isVideo) {
        return res.status(400).json({ error: 'Unsupported mime type', mimeType });
      }
      if (isImage && size > IMAGE_MAX) return res.status(400).json({ error: 'Image too large', limit: IMAGE_MAX });
      if (isVideo && size > VIDEO_MAX) return res.status(400).json({ error: 'Video too large', limit: VIDEO_MAX });

      const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const destPath = `uploads/${safeName}`;
      const fileRef = storageBucket.file(destPath);
      console.log('➡️ Uploading to path:', destPath, 'bucket:', storageBucket.name, 'mime:', mimeType, 'size:', size, 'uid:', uploaderUid);
      try {
        await fileRef.save(fileBuffer, {
          metadata: {
            contentType: mimeType,
            cacheControl: 'public,max-age=31536000',
            metadata: { uploadedBy: String(uploaderUid) }
          }
        });
      } catch (err) {
        console.error('🚫 GCS save error:', err?.message);
        return res.status(500).json({ error: 'Upload failed', bucket: storageBucket && storageBucket.name, hint: 'Verify bucket exists and VITE_FIREBASE_STORAGE_BUCKET matches projectId.appspot.com', details: err.message });
      }
      let publicUrl = `https://storage.googleapis.com/${storageBucket.name}/${destPath}`;
      try { await fileRef.getMetadata(); } catch { const [signed] = await fileRef.getSignedUrl({ action:'read', expires: Date.now()+7*864e5 }); publicUrl = signed; }
      return res.json({ success: true, url: publicUrl, path: destPath, contentType: mimeType, size, uploadedBy: uploaderUid });
    }

    // GET list
    if (req.method === 'GET') {
      const snap = await db.collection('stories').orderBy('createdAt','desc').get();
      const stories = snap.docs.map(doc => {
        const data = doc.data();
        const ts = f => data[f]?.toDate?.()?.toISOString() || null;
        const publishAtIso = ts('publishAt') || new Date().toISOString();
        const expiresAtIso = ts('expiresAt') || new Date(Date.now()+24*60*60*1000).toISOString();
        return { id: doc.id, ...data, createdAt: ts('createdAt') || publishAtIso, publishAt: publishAtIso, expiresAt: expiresAtIso, reactions: data.reactions || {} };
      });
      return res.json({ stories });
    }

    if (req.method === 'POST') {
      // track view
      if (action === 'view' && id) {
        const { userId, sessionId } = req.body || {};
        await db.collection('storyViews').add({ storyId: id, userId: userId||null, sessionId: sessionId||null, viewedAt: admin.firestore.Timestamp.now() });
        await db.collection('stories').doc(id).update({ views: admin.firestore.FieldValue.increment(1) });
        return res.json({ success: true });
      }
      // like
      if (action === 'like' && id) {
        const ref = db.collection('stories').doc(id);
        await ref.update({ likes: admin.firestore.FieldValue.increment(1) });
        const snap = await ref.get();
        return res.json({ success: true, likes: snap.data()?.likes || 0 });
      }
      // reaction
      if (action === 'reaction' && id) {
        const { reaction } = req.body || {};
        const safe = String(reaction||'').toLowerCase().replace(/[^a-z0-9_]/g,'');
        if (!safe) return res.status(400).json({ error: 'reaction required' });
        const ref = db.collection('stories').doc(id);
        await ref.update({ [`reactions.${safe}`]: admin.firestore.FieldValue.increment(1) });
        const snap = await ref.get();
        return res.json({ success: true, reactions: snap.data()?.reactions || {} });
      }
      // create story
      const { title, contentType, mediaUrl, textContent, background, duration = 5, link, linkText, publishAt } = req.body || {};
      if (!title) return res.status(400).json({ error: 'title required' });
      const publishDate = publishAt ? new Date(publishAt) : new Date();
      const expiresDate = new Date(publishDate.getTime()+24*60*60*1000);
      const storyData = {
        title,
        contentType: contentType || 'text',
        mediaUrl: mediaUrl || null,
        textContent: textContent || null,
        background: background || { type:'gradient', value:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' },
        duration: Number(duration) || 5,
        link: link || null,
        linkText: linkText || null,
        publishAt: admin.firestore.Timestamp.fromDate(publishDate),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresDate),
        isActive: true,
        views: 0,
        likes: 0,
        reactions: {},
        createdAt: admin.firestore.Timestamp.now()
      };
      const docRef = await db.collection('stories').add(storyData);
      return res.json({ success: true, id: docRef.id, data: storyData });
    }

    if (req.method === 'PUT' && id) {
      const update = { ...req.body, updatedAt: admin.firestore.Timestamp.now() };
      delete update.id;
      await db.collection('stories').doc(id).update(update);
      return res.json({ success: true });
    }

    if (req.method === 'DELETE' && id) {
      await db.collection('stories').doc(id).delete();
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('❌ Stories handler error:', e);
    return res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}

module.exports = handleStories;
