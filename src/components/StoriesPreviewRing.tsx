import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlayIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ApiService } from '../services/apiConfig';
import InstagramStoriesViewer from './InstagramStoriesViewer';

interface Story {
  id: string;
  title: string;
  contentType: 'image' | 'video' | 'text';
  mediaUrl?: string;
  textContent?: string;
  background?: { type: 'color' | 'gradient'; value: string };
  duration: number;
  link?: string;
  linkText?: string;
  publishAt?: string;
  views?: number;
  likes?: number;
  createdAt: string;
  isActive: boolean;
}

/**
 * 📱 Instagram Stories Preview Ring
 * Компонент для отображения превью stories на главной странице
 */
export const StoriesPreviewRing: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      setLoading(true);
      const data = await ApiService.stories.getAll();
      
      // Фильтруем только активные stories
      const activeStories = (Array.isArray(data) ? data : []).filter(story => {
        const now = new Date();
        const publishDate = new Date(story.publishAt || story.createdAt);
        const expiryDate = new Date(publishDate.getTime() + (story.duration * 1000 * 3600)); // Умножаем на часы для демо
        
        return story.isActive && publishDate <= now && expiryDate > now;
      });
      
      setStories(activeStories);
    } catch (error) {
      console.error('Ошибка загрузки stories:', error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = (index: number) => {
    setSelectedStoryIndex(index);
    setShowViewer(true);
  };

  const StoryPreview = ({ story, index }: { story: Story; index: number }) => (
    <motion.button
      onClick={() => handleStoryClick(index)}
      className="relative flex-shrink-0 group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Story Ring */}
      <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-purple-500 via-pink-500 to-yellow-500">
        <div 
          className="w-full h-full rounded-full overflow-hidden border-2 border-white relative"
          style={{
            background: story.contentType === 'text' 
              ? story.background?.value || '#000'
              : undefined
          }}
        >
          {/* Image/Video Thumbnail */}
          {story.contentType === 'image' && story.mediaUrl ? (
            <img
              src={story.mediaUrl}
              alt={story.title}
              className="w-full h-full object-cover"
            />
          ) : story.contentType === 'video' && story.mediaUrl ? (
            <div className="relative w-full h-full">
              <img
                src={story.mediaUrl} // Можно добавить thumbnail extraction
                alt={story.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <PlayIcon className="w-6 h-6 text-white opacity-80" />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white text-xs font-bold text-center px-1">
                {story.title.slice(0, 10)}
              </span>
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        </div>
      </div>

      {/* Story Title */}
      <p className="text-xs text-gray-600 mt-2 text-center max-w-[80px] truncate">
        {story.title}
      </p>

      {/* New Indicator */}
      {new Date(story.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000 && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
          N
        </div>
      )}
    </motion.button>
  );

  if (loading) {
    return (
      <div className="px-4 py-4">
        <div className="flex space-x-4 overflow-x-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-16 h-3 bg-gray-200 rounded mt-2 mx-auto animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (stories.length === 0) {
    return null; // Не показываем секцию если нет stories
  }

  return (
    <>
      <div className="px-4 py-4 bg-white">
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
          {/* Add Story Button (для админов) */}
          <motion.div
            className="flex-shrink-0 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 group-hover:border-gray-400 transition-colors">
              <PlusIcon className="w-8 h-8 text-gray-400 group-hover:text-gray-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">Добавить</p>
          </motion.div>

          {/* Stories */}
          {stories.map((story, index) => (
            <StoryPreview key={story.id} story={story} index={index} />
          ))}
        </div>
      </div>

      {/* Stories Viewer */}
      {showViewer && (
        <InstagramStoriesViewer
          stories={stories}
          initialIndex={selectedStoryIndex}
          onClose={() => setShowViewer(false)}
          onStoryComplete={() => setShowViewer(false)}
        />
      )}
    </>
  );
};

export default StoriesPreviewRing;
