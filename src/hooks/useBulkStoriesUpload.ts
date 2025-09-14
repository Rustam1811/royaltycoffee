import { apiUrl } from '@/config/api';
import { useCallback, useRef, useState } from 'react';

/**
 * Bulk stories uploader (admin only)
 * Flow per file:
 *  1) Collect metadata (type, size, width/height or duration)
 *  2) Bulk init (signed URLs)
 *  3) Direct PUT upload (parallel, limited concurrency)
 *  4) Commit each story (hash verify)
 */

export interface RawStoryFile {
  file: File;
  type: 'image' | 'video';
}

export interface BulkInitItemRequest {
  type: 'image' | 'video';
  originalName: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  duration?: number;
  authorId?: string;
}

export interface BulkInitItemResponse {
  storyId: string;
  uploadUrl: string;
  storagePath: string;
}

export interface UploadedStoryResult {
  storyId: string;
  storagePath: string;
  mediaUrl?: string; // after commit
  status: 'pending' | 'uploading' | 'uploaded' | 'committing' | 'active' | 'error';
  error?: string;
  progress: number; // 0-100 per file
  type: 'image' | 'video';
  fileName: string;
}

export interface UseBulkStoriesUploadOptions {
  adminKey: string;            // x-admin-key header
  authorId?: string;           // who is uploading
  maxConcurrency?: number;     // default 3
  onOverallProgress?: (p: { percent: number; transferred: number; total: number; active: number; completed: number }) => void;
  onFileUpdate?: (u: UploadedStoryResult) => void;
}

interface InternalMap { [storyId: string]: UploadedStoryResult }

const IMAGE_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;

async function getImageMeta(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.width, height: img.height }); URL.revokeObjectURL(url); };
    img.onerror = e => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
async function getVideoMeta(file: File) {
  return new Promise<{ duration: number; width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight }); URL.revokeObjectURL(url); };
    v.onerror = e => { URL.revokeObjectURL(url); reject(e); };
    v.src = url;
  });
}

async function sha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,64);
}

export function useBulkStoriesUpload(opts: UseBulkStoriesUploadOptions) {
  const { adminKey, authorId = 'admin', maxConcurrency = 3, onOverallProgress, onFileUpdate } = opts;

  const [filesState, setFilesState] = useState<UploadedStoryResult[]>([]);
  const totalBytesRef = useRef(0);
  const uploadedBytesRef = useRef(0);
  const abortRef = useRef<boolean>(false);
  const internalMapRef = useRef<InternalMap>({});

  const updateFile = useCallback((storyId: string, patch: Partial<UploadedStoryResult>) => {
    internalMapRef.current[storyId] = { ...internalMapRef.current[storyId], ...patch };
    setFilesState(Object.values(internalMapRef.current));
    if (onFileUpdate) onFileUpdate(internalMapRef.current[storyId]);
  }, [onFileUpdate]);

  const computeOverall = useCallback(() => {
    const items = Object.values(internalMapRef.current);
    const percent = totalBytesRef.current ? (uploadedBytesRef.current / totalBytesRef.current) * 100 : 0;
    if (onOverallProgress) onOverallProgress({ percent, transferred: uploadedBytesRef.current, total: totalBytesRef.current, active: items.filter(i=>i.status==='uploading').length, completed: items.filter(i=>i.status==='active').length });
  }, [onOverallProgress]);

  const prepare = useCallback(async (files: File[]) => {
    abortRef.current = false;
    uploadedBytesRef.current = 0;
    totalBytesRef.current = files.reduce((a,f)=>a+f.size,0);

    // Build draft states
    const draft: InternalMap = {};
    for (const f of files) {
      const type: 'image' | 'video' = f.type.startsWith('image/') ? 'image' : (f.type.startsWith('video/') ? 'video' : 'image');
      draft['pending-'+f.name+'-'+Math.random().toString(36).slice(2)] = {
        storyId: '',
        storagePath: '',
        mediaUrl: undefined,
        status: 'pending',
        error: undefined,
        progress: 0,
        type,
        fileName: f.name
      };
    }
    internalMapRef.current = draft;
    setFilesState(Object.values(draft));
  }, []);

  const upload = useCallback(async (files: File[]) => {
    await prepare(files);

    // Collect metadata
    const initPayload: BulkInitItemRequest[] = [];
    const fileMeta: { file: File; meta: BulkInitItemRequest }[] = [];
    for (const file of files) {
      if (abortRef.current) return [];
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) continue;
      if (isImage && file.size > IMAGE_MAX) continue;
      if (isVideo && file.size > VIDEO_MAX) continue;
      if (isImage) {
        const { width, height } = await getImageMeta(file);
        const meta: BulkInitItemRequest = { type:'image', originalName:file.name, sizeBytes:file.size, width, height, authorId };
        initPayload.push(meta); fileMeta.push({ file, meta });
      } else {
        const { duration, width, height } = await getVideoMeta(file);
        const meta: BulkInitItemRequest = { type:'video', originalName:file.name, sizeBytes:file.size, width, height, duration, authorId };
        initPayload.push(meta); fileMeta.push({ file, meta });
      }
    }

    if (!initPayload.length) return [];

    // Bulk init
    const initResp = await fetch(apiUrl('register', { endpoint: 'stories-upload/bulk-init' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ items: initPayload })
    });
    if (!initResp.ok) throw new Error('bulk_init_failed');
    const initData = await initResp.json();
    const mapByOriginal = new Map<string, BulkInitItemResponse>();
    (initData.items||[]).forEach((it: BulkInitItemResponse) => {
      mapByOriginal.set(it.storagePath, it);
    });

    // We must match by order: init returns in same order we sent
    const responses: BulkInitItemResponse[] = initData.items || [];

    // Build relation array
    const tasks: { file: File; init: BulkInitItemResponse; meta: BulkInitItemRequest }[] = [];
    for (let i=0;i<responses.length;i++) {
      const init = responses[i];
      const fm = fileMeta[i];
      if (!fm) continue;
      // Create entry state
      internalMapRef.current[init.storyId] = {
        storyId: init.storyId,
        storagePath: init.storagePath,
        mediaUrl: undefined,
        status: 'uploading',
        error: undefined,
        progress: 0,
        type: fm.meta.type,
        fileName: fm.meta.originalName
      };
      tasks.push({ file: fm.file, init, meta: fm.meta });
    }
    setFilesState(Object.values(internalMapRef.current));

    // Concurrency control
    const queue = [...tasks];
    const active: Promise<void>[] = [];

    const runOne = async (task: { file: File; init: BulkInitItemResponse; meta: BulkInitItemRequest }) => {
      const { file, init } = task;
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', init.uploadUrl, true);
          xhr.setRequestHeader('Content-Type', file.type || (task.meta.type==='image' ? 'image/webp':'video/mp4'));
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = (e.loaded / e.total) * 100;
              updateFile(init.storyId, { progress: percent, status: 'uploading' });
              // update overall bytes (only delta)
              // approximate: add loaded each event delta (not stored) – simplified: when done add size
            }
          };
          xhr.onerror = () => { updateFile(init.storyId, { status:'error', error:'upload_error' }); reject(new Error('upload_error')); };
          xhr.onload = () => {
            if (xhr.status>=200 && xhr.status<300) {
              updateFile(init.storyId, { progress: 100, status: 'uploaded' });
              uploadedBytesRef.current += file.size;
              computeOverall();
              resolve();
            } else {
              updateFile(init.storyId, { status:'error', error:'upload_failed_'+xhr.status });
              reject(new Error('upload_failed'));
            }
          };
          xhr.send(file);
        });
        // Commit
        updateFile(init.storyId, { status:'committing' });
        const hash = await sha256(file);
        const commitResp = await fetch(apiUrl('register', { endpoint: 'stories-upload/commit' }), {
          method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
          body: JSON.stringify({ storyId: init.storyId, hash })
        });
        if (!commitResp.ok) throw new Error('commit_failed');
        const commitData = await commitResp.json();
        updateFile(init.storyId, { status:'active', mediaUrl: commitData.mediaUrl });
        computeOverall();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown_error';
        updateFile(init.storyId, { status:'error', error: msg });
      }
    };

    const pump = async () => {
      while (queue.length && !abortRef.current) {
        while (active.length < maxConcurrency && queue.length) {
          const task = queue.shift()!;
          const p = runOne(task).finally(() => {
            const idx = active.indexOf(p);
            if (idx>=0) active.splice(idx,1);
          });
          active.push(p);
        }
        await Promise.race(active);
      }
      await Promise.all(active);
    };

    await pump();

    computeOverall();

    return Object.values(internalMapRef.current);
  }, [adminKey, authorId, maxConcurrency, prepare, updateFile, computeOverall]);

  const cancelAll = useCallback(() => { abortRef.current = true; }, []);

  return {
    files: filesState,
    upload,
    cancelAll
  };
}
