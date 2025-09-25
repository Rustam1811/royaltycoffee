import React, { useRef, useState } from 'react';
import useStoryUpload from '@/hooks/useStoryUpload';
import StoriesService, { Story } from '@/services/stories';

interface BulkStoriesUploaderProps {
  onClose: () => void;
}

type ItemStatus = 'pending' | 'uploading' | 'creating' | 'done' | 'error';
interface Item {
  id: string;
  file: File;
  name: string;
  status: ItemStatus;
  progress: number;
  url?: string;
  error?: string;
}

// Simple linear progress bar
const ProgressBar: React.FC<{ value: number; status: ItemStatus }> = ({ value, status }) => {
  const color = status === 'error' ? '#dc2626' : status === 'done' ? '#16a34a' : '#2563eb';
  return (
    <div className="w-full h-2 rounded bg-slate-200 overflow-hidden">
      <div className="h-full transition-all" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
};

const BulkStoriesUploader: React.FC<BulkStoriesUploaderProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const { upload } = useStoryUpload();

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const mapped: Item[] = files.map(f => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file: f, name: f.name, status: 'pending', progress: 0 }));
    setItems(mapped);
  };

  const start = async () => {
    if (!items.length) return;
    setRunning(true);
    const pool = 3;
    const queue = [...items];
    const active: Promise<void>[] = [];

    const runOne = async (it: Item) => {
      try {
        setItems(prev => prev.map(x => x.id===it.id ? { ...x, status:'uploading', progress: 0 } : x));
        const kind: 'image'|'video' = it.file.type.startsWith('video/') ? 'video':'image';
        const up = await upload(it.file, kind);
        setItems(prev => prev.map(x => x.id===it.id ? { ...x, status:'creating', progress: 100, url: up.url } : x));
        const payload: Partial<Story> = {
          title: it.name,
          contentType: kind,
          mediaUrl: up.url,
          duration: 6,
          link: null,
          linkText: null,
          publishAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isActive: true,
          views: 0,
          likes: 0,
        };
        await StoriesService.create(payload);
        setItems(prev => prev.map(x => x.id===it.id ? { ...x, status:'done' } : x));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'error';
        setItems(prev => prev.map(x => x.id===it.id ? { ...x, status:'error', error: msg } : x));
      }
    };

    const pump = async () => {
      while (queue.length) {
        while (active.length < pool && queue.length) {
          const it = queue.shift()!;
          const p = runOne(it).finally(() => {
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
    setRunning(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <h2 className="text-xl font-semibold">Bulk Stories Upload</h2>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium">Файлы (image/video)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={onSelect}
          className="text-sm"
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={start}
          className="px-4 py-2 rounded bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
          disabled={!items.length || running}
        >Старт</button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded bg-slate-200 text-slate-700 text-sm font-medium"
        >Закрыть</button>
      </div>
      <div className="max-h-80 overflow-y-auto pr-1 space-y-3">
        {items.map(it => (
          <div key={it.id} className="border rounded-lg p-3 bg-white shadow-sm">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium truncate max-w-[60%]" title={it.name}>{it.name}</span>
              <span className="text-slate-500">{it.status}</span>
            </div>
            <ProgressBar value={it.progress} status={it.status} />
            {it.error && <div className="text-[10px] text-red-600 mt-1">{it.error}</div>}
            {it.url && <a href={it.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 mt-1 inline-block">open</a>}
          </div>
        ))}
        {!items.length && <div className="text-xs text-slate-500">Файлы не выбраны</div>}
      </div>
    </div>
  );
};

export default BulkStoriesUploader;
