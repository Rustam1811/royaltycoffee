import React, { useEffect, useMemo, useState } from 'react';
import Stories from 'react-insta-stories';
import { apiUrl } from '../config/api';

interface StoryItem {
  id: string;
  mediaUrl: string;
  type: 'image'|'video';
  duration?: number;
  createdAt?: number;
  expiresAt?: number;
}

interface FeedResponseItem {
  id: string; mediaUrl: string; type: 'image'|'video'; duration?: number; createdAt?: number; expiresAt?: number;
}

interface StoriesViewerProps {
  open: boolean;
  onClose: () => void;
}

// Преобразуем backend items к формату react-insta-stories
function mapToStories(items: StoryItem[]) {
  return items.map(it => ({
    url: it.mediaUrl,
    type: it.type === 'video' ? 'video' : 'image',
    duration: it.duration ? it.duration * 1000 : undefined,
    header: {
      heading: 'Story',
      subheading: new Date(it.createdAt || Date.now()).toLocaleString(),
      profileImage: '/coffeeaddict.jpg'
    }
  }));
}

export const StoriesViewer: React.FC<StoriesViewerProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StoryItem[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch(apiUrl('register', { endpoint: 'stories-upload/feed' }))
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setItems((data.items || []).map((d: FeedResponseItem) => ({
          id: d.id,
            mediaUrl: d.mediaUrl,
            type: d.type,
            duration: d.duration,
            createdAt: d.createdAt,
            expiresAt: d.expiresAt
        }))
        );
      })
      .catch(err => console.error('feed load error', err))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [open]);

  const stories = useMemo(() => mapToStories(items), [items]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background:'rgba(255,255,255,0.1)', color:'#fff', border:'none', padding:'8px 14px', borderRadius:6, cursor:'pointer' }}>Закрыть</button>
      {loading && <div style={{ color:'#fff' }}>Загрузка...</div>}
      {!loading && stories.length === 0 && <div style={{ color:'#aaa' }}>Нет историй</div>}
      {!loading && stories.length > 0 && (
        <div style={{ width: 360, maxWidth: '90vw', height: 640, maxHeight: '90vh' }}>
          <Stories
            stories={stories}
            defaultInterval={5000}
            width={360}
            height={640}
            storyStyles={{ objectFit: 'cover' }}
            onAllStoriesEnd={onClose}
          />
        </div>
      )}
    </div>
  );
};

export default StoriesViewer;
