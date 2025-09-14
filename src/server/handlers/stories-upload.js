const admin = require('firebase-admin');
const crypto = require('crypto');

function ensureAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin;
}

const db = () => ensureAdmin().firestore();
const bucket = () => ensureAdmin().storage().bucket();

// Config
const EXPIRATION_HOURS = 24;
const IMAGE_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;
const ALLOWED_IMAGE = ['image/jpeg','image/png','image/webp'];
const ALLOWED_VIDEO = ['video/mp4','video/quicktime','video/webm'];
const ADMIN_KEY = process.env.ADMIN_KEY || 'dev-admin-key';

function newId() { return crypto.randomBytes(12).toString('hex'); }
function nowTs() { return Date.now(); }
function tsPlusHours(h) { return nowTs() + h*3600*1000; }

async function handleInit(req,res) {
  try {
    // removed admin check
    const body = await readJson(req);
    const { type, originalName, sizeBytes, width, height, duration } = body || {};

    if (!type || !originalName || !sizeBytes) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    if (type === 'image') {
      if (sizeBytes > IMAGE_MAX) return res.status(400).json({ error: 'Image too large' });
    } else if (type === 'video') {
      if (sizeBytes > VIDEO_MAX) return res.status(400).json({ error: 'Video too large' });
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const storyId = newId();
    const authorId = req.headers['x-author-id'] || 'admin';
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g,'_');
    const ext = safeName.includes('.') ? safeName.split('.').pop() : (type==='image'?'webp':'mp4');
    const filePath = `stories/${storyId}.${ext}`;

    // Signed URL (v4) for direct upload
    const [url] = await bucket().file(filePath).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 10*60*1000, // 10 min
      contentType: type==='image'? 'image/*' : 'video/*'
    });

    const doc = {
      status: 'pending',
      type,
      authorId,
      originalName: safeName,
      filePath,
      createdAt: nowTs(),
      expiresAt: tsPlusHours(EXPIRATION_HOURS),
      sizeBytes,
      width: width||null,
      height: height||null,
      duration: duration||null,
      likeCount: 0,
      reactions: {},
      views: 0
    };

    await db().collection('stories').doc(storyId).set(doc);

    res.json({ storyId, uploadUrl: url, storagePath: filePath, expiresAt: doc.expiresAt });
  } catch (e) {
    if (e.message === 'unauthorized') return res.status(401).json({ error: 'unauthorized'});
    console.error('init error', e);
    res.status(500).json({ error: 'init_failed', details: e.message });
  }
}

async function handleBulkInit(req,res) {
  try {
    // removed admin check
    const body = await readJson(req);
    const { items } = body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'no_items'});
    const results = [];
    for (const it of items) {
      const { type, originalName, sizeBytes, width, height, duration } = it || {};
      if (!type || !originalName || !sizeBytes) continue;
      if (type==='image' && sizeBytes>IMAGE_MAX) continue;
      if (type==='video' && sizeBytes>VIDEO_MAX) continue;
      const storyId = newId();
      const authorId = it.authorId || 'admin';
      const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g,'_');
      const ext = safeName.includes('.') ? safeName.split('.').pop() : (type==='image'?'webp':'mp4');
      const filePath = `stories/${storyId}.${ext}`;
      const [url] = await bucket().file(filePath).getSignedUrl({ version:'v4', action:'write', expires: Date.now()+10*60*1000, contentType: type==='image'?'image/*':'video/*' });
      const doc = { status:'pending', type, authorId, originalName:safeName, filePath, createdAt: nowTs(), expiresAt: tsPlusHours(EXPIRATION_HOURS), sizeBytes, width: width||null, height: height||null, duration: duration||null, likeCount:0, reactions:{}, views:0 };
      await db().collection('stories').doc(storyId).set(doc);
      results.push({ storyId, uploadUrl: url, storagePath: filePath });
    }
    res.json({ items: results });
  } catch (e) {
    if (e.message === 'unauthorized') return res.status(401).json({ error:'unauthorized'});
    console.error('bulk init error', e);
    res.status(500).json({ error:'bulk_init_failed', details:e.message });
  }
}

async function handleCommit(req,res) {
  try {
    // removed admin check
    const body = await readJson(req);
    const { storyId, hash } = body || {};
    if (!storyId) return res.status(400).json({ error: 'Missing storyId' });

    const ref = db().collection('stories').doc(storyId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Not found' });
    const data = snap.data();
    if (data.status !== 'pending') return res.status(400).json({ error: 'Invalid status' });

    // Verify object exists
    const fileRef = bucket().file(data.filePath);
    const [exists] = await fileRef.exists();
    if (!exists) return res.status(400).json({ error: 'Object not uploaded' });

    const [meta] = await fileRef.getMetadata();
    const size = parseInt(meta.size || '0',10);
    if (size !== data.sizeBytes) {
      await ref.update({ status: 'failed', failReason: 'size_mismatch' });
      return res.status(400).json({ error: 'size_mismatch' });
    }

    // Make public
    await fileRef.makePublic();
    const mediaUrl = `https://storage.googleapis.com/${fileRef.bucket.name}/${data.filePath}`;

    await ref.update({ status: 'active', mediaUrl, hash: hash||null, activatedAt: nowTs() });

    res.json({ storyId, mediaUrl });
  } catch (e) {
    if (e.message === 'unauthorized') return res.status(401).json({ error:'unauthorized'});
    console.error('commit error', e);
    res.status(500).json({ error: 'commit_failed', details: e.message });
  }
}

async function handleLike(req,res) {
  try {
    const body = await readJson(req); const { storyId } = body||{};
    if (!storyId) return res.status(400).json({ error:'missing_storyId'});
    const ref = db().collection('stories').doc(storyId);
    await db().runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('nf');
      const data = snap.data();
      if (data.status!=='active') throw new Error('inactive');
      const likeCount = (data.likeCount||0)+1;
      tx.update(ref,{ likeCount });
    });
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ error:'like_failed', details:e.message });
  }
}
async function handleReact(req,res) {
  try {
    const body = await readJson(req); const { storyId, emoji } = body||{};
    if (!storyId || !emoji) return res.status(400).json({ error:'missing_fields'});
    const ref = db().collection('stories').doc(storyId);
    await db().runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('nf');
      const data = snap.data();
      if (data.status!=='active') throw new Error('inactive');
      const reactions = data.reactions || {};
      reactions[emoji] = (reactions[emoji]||0)+1;
      tx.update(ref,{ reactions });
    });
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ error:'react_failed', details:e.message });
  }
}

async function handleView(req,res) {
  try {
    const body = await readJson(req); const { storyId } = body||{};
    if (!storyId) return res.status(400).json({ error:'missing_storyId'});
    const ref = db().collection('stories').doc(storyId);
    await db().runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('nf');
      const data = snap.data();
      if (data.status!=='active') throw new Error('inactive');
      const views = (data.views||0)+1;
      tx.update(ref,{ views });
    });
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ error:'view_failed', details:e instanceof Error? e.message : 'err' });
  }
}

async function handleFeed(req,res) {
  try {
    const limit = 200;
    const now = nowTs();
    const snap = await db().collection('stories')
      .where('status','==','active')
      .where('expiresAt','>', now)
      .orderBy('expiresAt','desc')
      .limit(limit)
      .get();
    const byAuthor = {};
    snap.docs.forEach(d=>{
      const data = d.data();
      const authorId = data.authorId || 'admin';
      (byAuthor[authorId] ||= []).push({ id:d.id, ...data });
    });
    const groups = Object.entries(byAuthor).map(([authorId, stories]) => ({ authorId, stories: stories.sort((a,b)=>a.createdAt-b.createdAt) }));
    res.json({ groups });
  } catch (e) {
    console.error('feed error', e);
    res.status(500).json({ error: 'feed_failed', details: e.message });
  }
}

const CLEANUP_BATCH = 50;
async function cleanupExpired() {
  const now = nowTs();
  const snap = await db().collection('stories').where('expiresAt','<=', now).limit(CLEANUP_BATCH).get();
  if (snap.empty) return { deleted:0 };
  let deleted = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    try { if (data.filePath) await bucket().file(data.filePath).delete({ ignoreNotFound:true }); } catch(e) { /* ignore */ }
    await doc.ref.delete();
    deleted++;
  }
  return { deleted };
}
async function handleCleanup(req,res) {
  try {
    // removed admin check
    const result = await cleanupExpired();
    res.json({ ok:true, ...result });
  } catch (e) {
    res.status(500).json({ error:'cleanup_failed', details: e.message });
  }
}

function readJson(req) {
  return new Promise((resolve,reject)=>{
    const chunks=[]; req.on('data',c=>chunks.push(c)); req.on('end',()=>{ try { resolve(chunks.length? JSON.parse(Buffer.concat(chunks).toString('utf8')):{}); } catch(e){ reject(e);} }); req.on('error',reject);
  });
}

module.exports = async function storiesUploadDispatcher(req,res) {
  const url = req.url.split('?')[0];
  if (url.endsWith('/stories-upload/init')) return handleInit(req,res);
  if (url.endsWith('/stories-upload/commit')) return handleCommit(req,res);
  if (url.endsWith('/stories-upload/feed')) return handleFeed(req,res);
  if (url.endsWith('/stories-upload/like')) return handleLike(req,res);
  if (url.endsWith('/stories-upload/react')) return handleReact(req,res);
  if (url.endsWith('/stories-upload/view')) return handleView(req,res);
  if (url.endsWith('/stories-upload/cleanup')) return handleCleanup(req,res);
  return res.status(404).json({ error: 'stories-upload endpoint not found' });
};

module.exports.handleInit = handleInit;
module.exports.handleBulkInit = handleBulkInit;
module.exports.handleCommit = handleCommit;
module.exports.handleLike = handleLike;
module.exports.handleReact = handleReact;
module.exports.handleView = handleView;
module.exports.handleFeed = handleFeed;
module.exports.handleCleanup = handleCleanup;
