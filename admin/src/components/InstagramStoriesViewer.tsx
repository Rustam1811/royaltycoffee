import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  PlayIcon, 
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  HeartIcon,
  ShareIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { ApiService } from '@/services/apiConfig';

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

interface InstagramStoriesViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onStoryComplete?: () => void;
}

/**
 * 📱 Instagram Stories Viewer
 * Полностью функциональный просмотрщик stories как в Instagram
 */
export const InstagramStoriesViewer: React.FC<InstagramStoriesViewerProps> = ({
  stories,
  initialIndex = 0,
  onClose,
  onStoryComplete
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showActions, setShowActions] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout>();
  const hideActionsTimeout = useRef<NodeJS.Timeout>();

  const currentStory = stories[currentIndex];
  const duration = currentStory?.duration || 5;

  // 🎬 Progress Animation
  useEffect(() => {
    if (!currentStory || isPaused) return;

    const startTime = Date.now();
    const interval = 50; // Update every 50ms for smooth animation

    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / (duration * 1000)) * 100, 100);
      
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        handleNextStory();
      }
    }, interval);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, isPaused, currentStory]);

  // 🎥 Video Control
  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentStory?.contentType !== 'video') return;

    const handleVideoEnd = () => {
      handleNextStory();
    };

    const handleVideoLoad = () => {
      if (!isPaused) {
        video.play().catch(console.error);
      }
    };

    video.addEventListener('ended', handleVideoEnd);
    video.addEventListener('loadeddata', handleVideoLoad);
    video.muted = isMuted;

    return () => {
      video.removeEventListener('ended', handleVideoEnd);
      video.removeEventListener('loadeddata', handleVideoLoad);
    };
  }, [currentIndex, isMuted, isPaused]);

  // 📊 Record View
  useEffect(() => {
    if (currentStory) {
      ApiService.stories.recordView(currentStory.id).catch(console.error);
    }
  }, [currentIndex]);

  // 🎭 Auto-hide Actions
  useEffect(() => {
    setShowActions(true);
    
    if (hideActionsTimeout.current) {
      clearTimeout(hideActionsTimeout.current);
    }
    
    hideActionsTimeout.current = setTimeout(() => {
      setShowActions(false);
    }, 3000);

    return () => {
      if (hideActionsTimeout.current) {
        clearTimeout(hideActionsTimeout.current);
      }
    };
  }, [currentIndex]);

  const handleNextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setIsLiked(false);
    } else {
      onStoryComplete?.();
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      setIsLiked(false);
    }
  };

  const handlePauseResume = () => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    
    const video = videoRef.current;
    if (video && currentStory?.contentType === 'video') {
      if (newPaused) {
        video.pause();
      } else {
        video.play().catch(console.error);
      }
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    // TODO: Send like to API
  };

  const handleShare = () => {
    if (navigator.share && currentStory) {
      navigator.share({
        title: currentStory.title,
        text: 'Посмотри эту story от SunFood!',
        url: window.location.href
      }).catch(console.error);
    }
  };

  const handleInteraction = () => {
    setShowActions(true);
    
    if (hideActionsTimeout.current) {
      clearTimeout(hideActionsTimeout.current);
    }
    
    hideActionsTimeout.current = setTimeout(() => {
      setShowActions(false);
    }, 3000);
  };

  if (!currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-50 flex items-center justify-center"
        onClick={handleInteraction}
      >
        {/* Story Container */}
        <div className="relative w-full max-w-sm mx-auto h-full flex flex-col">
          {/* Progress Bars */}
          <div className="absolute top-4 left-4 right-4 z-20 flex space-x-1">
            {stories.map((_, index) => (
              <div
                key={index}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: index < currentIndex ? '100%' : 
                           index === currentIndex ? `${progress}%` : '0%'
                  }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-16 left-4 right-4 z-20 flex items-center justify-between text-white"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">S</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">SunFood Coffee</h3>
                    <p className="text-xs opacity-80">
                      {new Date(currentStory.publishAt || currentStory.createdAt).toLocaleDateString('ru')}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Story Content */}
          <div 
            className="flex-1 relative overflow-hidden"
            style={{
              background: currentStory.background?.value || '#000'
            }}
          >
            {/* Image Story */}
            {currentStory.contentType === 'image' && currentStory.mediaUrl && (
              <img
                src={currentStory.mediaUrl}
                alt={currentStory.title}
                className="w-full h-full object-cover"
                draggable={false}
              />
            )}

            {/* Video Story */}
            {currentStory.contentType === 'video' && currentStory.mediaUrl && (
              <video
                ref={videoRef}
                src={currentStory.mediaUrl}
                className="w-full h-full object-cover"
                playsInline
                muted={isMuted}
                onLoadStart={() => setProgress(0)}
              />
            )}

            {/* Text Story */}
            {currentStory.contentType === 'text' && (
              <div className="w-full h-full flex items-center justify-center p-8">
                <div className="text-center text-white">
                  <motion.h2
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl font-bold mb-6"
                  >
                    {currentStory.title}
                  </motion.h2>
                  {currentStory.textContent && (
                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-lg opacity-90 leading-relaxed"
                    >
                      {currentStory.textContent}
                    </motion.p>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Areas */}
            <div className="absolute inset-0 flex">
              <button
                className="flex-1 bg-transparent"
                onClick={handlePrevStory}
                disabled={currentIndex === 0}
              />
              <button
                className="flex-1 bg-transparent"
                onClick={handlePauseResume}
              />
              <button
                className="flex-1 bg-transparent"
                onClick={handleNextStory}
                disabled={currentIndex === stories.length - 1}
              />
            </div>
          </div>

          {/* Link CTA */}
          {currentStory.link && (
            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-32 left-4 right-4 z-20"
                >
                  <a
                    href={currentStory.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-white/20 backdrop-blur-sm text-white rounded-2xl p-4 text-center font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {currentStory.linkText || 'Узнать больше'}
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Actions */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-8 left-4 right-4 z-20 flex items-center justify-between"
              >
                <div className="flex space-x-4">
                  {/* Video Controls */}
                  {currentStory.contentType === 'video' && (
                    <>
                      <button
                        onClick={handlePauseResume}
                        className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
                      >
                        {isPaused ? (
                          <PlayIcon className="w-5 h-5 ml-0.5" />
                        ) : (
                          <PauseIcon className="w-5 h-5" />
                        )}
                      </button>
                      
                      <button
                        onClick={handleMuteToggle}
                        className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
                      >
                        {isMuted ? (
                          <SpeakerXMarkIcon className="w-5 h-5" />
                        ) : (
                          <SpeakerWaveIcon className="w-5 h-5" />
                        )}
                      </button>
                    </>
                  )}
                </div>

                <div className="flex space-x-4">
                  {/* Like */}
                  <button
                    onClick={handleLike}
                    className="w-10 h-10 flex items-center justify-center text-white"
                  >
                    {isLiked ? (
                      <HeartSolidIcon className="w-6 h-6 text-red-500" />
                    ) : (
                      <HeartIcon className="w-6 h-6" />
                    )}
                  </button>

                  {/* Share */}
                  <button
                    onClick={handleShare}
                    className="w-10 h-10 flex items-center justify-center text-white"
                  >
                    <ShareIcon className="w-6 h-6" />
                  </button>

                  {/* More */}
                  <button className="w-10 h-10 flex items-center justify-center text-white">
                    <EllipsisHorizontalIcon className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Arrows (Desktop) */}
          <div className="hidden md:block">
            {currentIndex > 0 && (
              <button
                onClick={handlePrevStory}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors z-20"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
            )}
            
            {currentIndex < stories.length - 1 && (
              <button
                onClick={handleNextStory}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors z-20"
              >
                <ArrowRightIcon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstagramStoriesViewer;

