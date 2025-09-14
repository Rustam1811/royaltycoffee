import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiUrl } from '../config/api';

interface FeedGroupDTO { authorId: string; stories: FeedStoryDTO[]; }
interface FeedStoryDTO { id: string; mediaUrl: string; type: 'image'|'video'; duration?: number; likeCount?: number; reactions?: Record<string, number>; views?: number; createdAt?: number; }

interface StoryEntity {
  id: string;
  mediaUrl: string;
  type: 'image'|'video';
  duration?: number; // seconds (fallback for image default 5)
  likeCount?: number;
  reactions?: Record<string, number>;
  views?: number;
  createdAt?: number;
}
interface StoryGroup {
  authorId: string;
  stories: StoryEntity[];
}
interface StoriesPlayerProps {
  open: boolean;
  onClose: () => void;
  autoPlay?: boolean;
  imageDurationSec?: number;
  reactionEmojis?: string[];
}

const DEFAULT_IMG_SEC = 5;

export const StoriesPlayer: React.FC<StoriesPlayerProps> = ({ open, onClose, autoPlay = true, imageDurationSec = DEFAULT_IMG_SEC, reactionEmojis = ['🔥','😍','👍','😁','😮','❤️'] }) => {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [gIndex, setGIndex] = useState(0);
  const [sIndex, setSIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 for current story
  const timerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch feed
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(apiUrl('register', { endpoint: 'stories-upload/feed' }))
      .then(r => r.json())
      .then(data => {
        const raw: FeedGroupDTO[] = Array.isArray(data.groups) ? data.groups : [];
        const g: StoryGroup[] = raw.map(gr => ({
          authorId: gr.authorId,
          stories: (gr.stories||[]).map(s => ({
            id: s.id,
            mediaUrl: s.mediaUrl,
            type: s.type,
            duration: s.duration,
            likeCount: s.likeCount,
            reactions: s.reactions,
            views: s.views,
            createdAt: s.createdAt
          }))
        }));
        setGroups(g);
        setGIndex(0); setSIndex(0); setProgress(0);
      })
      .catch(err => console.error('feed error', err))
      .finally(()=> setLoading(false));
  }, [open]);

  const currentGroup = groups[gIndex];
  const currentStory = currentGroup?.stories[sIndex];

  const goNextGroup = useCallback(() => {
    if (gIndex < groups.length - 1) {
      setGIndex(prev => prev + 1); setSIndex(0); setProgress(0);
    } else { onClose(); }
  }, [gIndex, groups.length, onClose]);
  const goPrevGroup = useCallback((toLast?: boolean) => {
    if (gIndex > 0) {
      setGIndex(prev => {
        const prevIdx = prev - 1;
        const last = groups[prevIdx].stories.length - 1;
        setSIndex(toLast ? last : 0); setProgress(0); return prevIdx;
      });
    }
  }, [gIndex, groups]);
  const goNextStory = useCallback(() => {
    if (!currentGroup) return;
    if (sIndex < currentGroup.stories.length - 1) { setSIndex(idx => idx + 1); setProgress(0); }
    else { goNextGroup(); }
  }, [sIndex, currentGroup, goNextGroup]);
  const goPrevStory = useCallback(() => {
    if (!currentGroup) return;
    if (sIndex > 0) { setSIndex(idx => idx - 1); setProgress(0); }
    else { goPrevGroup(true); }
  }, [sIndex, currentGroup, goPrevGroup]);

  // Auto progress (images)
  useEffect(() => {
    if (!autoPlay || !currentStory || paused || currentStory.type === 'video') return;
    const totalMs = (currentStory.duration || imageDurationSec) * 1000;
    const start = performance.now();
    const loop = (t: number) => {
      const d = t - start;
      const p = Math.min(1, d / totalMs);
      setProgress(p);
      if (p < 1) {
        timerRef.current = requestAnimationFrame(loop);
      } else {
        goNextStory();
      }
    };
    timerRef.current = requestAnimationFrame(loop);
    return () => { if (timerRef.current) cancelAnimationFrame(timerRef.current); };
  }, [currentStory, autoPlay, paused, imageDurationSec, goNextStory]);

  // Video progress listener
  useEffect(() => {
    if (currentStory?.type === 'video' && videoRef.current) {
      const v = videoRef.current;
      const onTime = () => { if (v.duration) setProgress(v.currentTime / v.duration); };
      v.addEventListener('timeupdate', onTime);
      v.addEventListener('ended', goNextStory);
      return () => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('ended', goNextStory); };
    }
  }, [currentStory?.id, currentStory?.type, goNextStory]);

  // View increment once per story display
  useEffect(() => {
    if (!currentStory) return;
    fetch(apiUrl('register', { endpoint: 'stories-upload/view' }), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId: currentStory.id }) }).catch(()=>{});
  }, [currentStory?.id]);

  const like = useCallback(() => {
    if (!currentStory) return;
    // optimistic local update
    setGroups(gs => gs.map((gr, gi) => {
      if (gi !== gIndex) return gr;
      return {
        ...gr,
        stories: gr.stories.map((st, si) => si === sIndex ? { ...st, likeCount: (st.likeCount||0)+1 } : st)
      };
    }));
    fetch(apiUrl('register', { endpoint: 'stories-upload/like' }), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ storyId: currentStory.id }) }).catch(()=>{});
  }, [currentStory, gIndex, sIndex]);
  const react = useCallback((emoji: string) => {
    if (!currentStory) return;
    setGroups(gs => gs.map((gr, gi) => {
      if (gi !== gIndex) return gr;
      return {
        ...gr,
        stories: gr.stories.map((st, si) => si === sIndex ? { ...st, reactions: { ...(st.reactions||{}), [emoji]: (st.reactions?.[emoji]||0)+1 } } : st)
      };
    }));
    fetch(apiUrl('register', { endpoint: 'stories-upload/react' }), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ storyId: currentStory.id, emoji }) }).catch(()=>{});
  }, [currentStory, gIndex, sIndex]);

  const onTap = useCallback((e: React.MouseEvent) => {
    if (!currentStory) return;
    const mid = window.innerWidth / 2;
    if (e.clientX < mid) goPrevStory(); else goNextStory();
  }, [goPrevStory, goNextStory, currentStory]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) {
      if (dx < 0) goNextGroup(); else goPrevGroup();
    }
    touchStartX.current = null;
  };

  const progressBars = useMemo(() => {
    if (!currentGroup) return null;
    return (
      <div style={{ position:'absolute', top:8, left:8, right:8, display:'flex', gap:4 }}>
        {currentGroup.stories.map((_, idx) => (
          <div key={idx} style={{ flex:1, background:'rgba(255,255,255,0.2)', height:4, borderRadius:2, overflow:'hidden' }}>
            <div style={{ width: idx < sIndex ? '100%' : idx === sIndex ? (progress*100)+'%' : '0%', height:'100%', background:'#fff', transition:'width 120ms linear' }} />
          </div>
        ))}
      </div>
    );
  }, [currentGroup, sIndex, progress]);

  if (!open) return null;
  return (
    <div onClick={onTap} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ position:'fixed', inset:0, background:'#000', color:'#fff', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center', userSelect:'none' }}>
      <button onClick={(e)=>{ e.stopPropagation(); onClose(); }} style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,0.5)', color:'#fff', border:'none', padding:'6px 10px', borderRadius:6, cursor:'pointer' }}>×</button>
      {progressBars}
      {loading && <div>Загрузка...</div>}
      {!loading && !currentStory && <div>Нет сторис</div>}
      {!loading && currentStory && (
        <div style={{ width:'min(420px,90vw)', height:'min(740px,90vh)', position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {currentStory.type==='image' && (
            <img src={currentStory.mediaUrl} alt="story" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'cover' }} />
          )}
          {currentStory.type==='video' && (
            <video ref={videoRef} src={currentStory.mediaUrl} autoPlay muted playsInline style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'cover' }} />
          )}
          <div style={{ position:'absolute', bottom:12, left:12, right:12, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={(e)=>{ e.stopPropagation(); like(); }} style={btnStyle}>❤️ {currentStory.likeCount||0}</button>
              {reactionEmojis.map(em => (
                <button key={em} onClick={(e)=>{ e.stopPropagation(); react(em); }} style={btnStyle}>{em} {(currentStory.reactions?.[em]||0) > 0 ? currentStory.reactions?.[em] : ''}</button>
              ))}
            </div>
            <button onClick={(e)=>{ e.stopPropagation(); setPaused(p=>!p); }} style={btnStyle}>{paused? '▶' : '⏸'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  background:'rgba(255,255,255,0.15)',
  border:'none',
  color:'#fff',
  padding:'6px 10px',
  borderRadius:20,
  cursor:'pointer'
};

export default StoriesPlayer;
