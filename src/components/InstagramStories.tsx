import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  EllipsisHorizontalIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { Heart, Laugh, ThumbsUp, Rocket, X, Smile } from 'lucide-react';

// Интерфейс для Story в контексте Instagram Stories компонента
export interface InstagramStoryItem {
  id: string;
  duration?: number; // длительность в миллисекундах
  title?: string;
  mediaUrl?: string;
  contentType: 'image' | 'video' | 'text';
  textContent?: string;
  background?: {
    type: string;
    value: string;
  };
  link?: string;
  linkText?: string;
  likes?: number;
  views?: number;
  reactions?: Record<string, number>;
}

// Адаптированные типы на основе @birdwingo/react-native-instagram-stories
export interface StoryUser {
  id: string;
  name: string;
  avatarSource: string;
  stories: InstagramStoryItem[];
}

export interface InstagramStoriesProps {
  stories: StoryUser[];
  avatarSize?: number;
  storyAvatarSize?: number;
  animationDuration?: number;
  backgroundColor?: string;
  showName?: boolean;
  closeIconColor?: string;
  isVisible?: boolean;
  onShow?: (id: string) => void;
  onHide?: (id: string) => void;
  onStoryStart?: (userId?: string, storyId?: string) => void;
  onStoryEnd?: (userId?: string, storyId?: string) => void;
}

export interface InstagramStoriesRef {
  setStories: (stories: StoryUser[]) => void;
  hide: () => void;
  show: (id?: string) => void;
  pause: () => void;
  resume: () => void;
  isPaused: () => boolean;
  goToPreviousStory: () => void;
  goToNextStory: () => void;
}

const InstagramStories = React.forwardRef<InstagramStoriesRef, InstagramStoriesProps>(({
  stories: initialStories,
  avatarSize = 60,
  storyAvatarSize = 25,
  animationDuration = 5000,
  backgroundColor = '#000000',
  showName = false,
  closeIconColor = '#FFFFFF',
  isVisible = false,
  onShow,
  onHide,
  onStoryStart,
  onStoryEnd
}, ref) => {
  const [stories, setStories] = useState<StoryUser[]>(initialStories);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(isVisible);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hideElements, setHideElements] = useState(false); // Для скрытия элементов при долгом нажатии
  const [isMuted, setIsMuted] = useState(true); // Состояние звука
  const [sendingReaction, setSendingReaction] = useState(false); // state used to throttle reactions

  const progressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Инициализация прогресса для каждого пользователя
  const [userProgress, setUserProgress] = useState<{[userId: string]: number[]}>({});

  useEffect(() => {
    const initialProgress: {[userId: string]: number[]} = {};
    stories.forEach(user => {
      initialProgress[user.id] = new Array(user.stories.length).fill(0);
    });
    setUserProgress(initialProgress);
  }, [stories]);

  // Управление прогрессом
  const goToNext = React.useCallback(() => {
    const currentUser = stories[currentUserIndex];
    if (!currentUser) return;

    // Отмечаем текущую историю как просмотренную
    setUserProgress(prev => ({
      ...prev,
      [currentUser.id]: prev[currentUser.id]?.map((p, i) => 
        i === currentStoryIndex ? 100 : p
      ) || []
    }));

    if (onStoryEnd) {
      const currentStory = currentUser.stories[currentStoryIndex];
      onStoryEnd(currentUser.id, currentStory?.id);
    }

    if (currentStoryIndex < currentUser.stories.length - 1) {
      // Следующая история того же пользователя
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
      
      if (onStoryStart) {
        const nextStory = currentUser.stories[currentStoryIndex + 1];
        onStoryStart(currentUser.id, nextStory?.id);
      }
    } else if (currentUserIndex < stories.length - 1) {
      // Следующий пользователь
      setCurrentUserIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
      
      if (onStoryStart) {
        const nextUser = stories[currentUserIndex + 1];
        const firstStory = nextUser?.stories[0];
        onStoryStart(nextUser?.id, firstStory?.id);
      }
    } else {
      // Конец всех историй
      setIsModalVisible(false);
      if (onHide) {
        onHide(currentUser.id);
      }
    }
  }, [stories, currentUserIndex, currentStoryIndex, onStoryEnd, onStoryStart, onHide]);

  useEffect(() => {
    if (!isModalVisible || isPaused) return;

    const currentUser = stories[currentUserIndex];
    if (!currentUser) return;

    const currentStory = currentUser.stories[currentStoryIndex];
    if (!currentStory) return;

    const duration = currentStory.duration || animationDuration;
    
    console.log('🎭 Story timer setup:', {
      userId: currentUser.id,
      storyId: currentStory.id,
      storyDuration: currentStory.duration,
      finalDuration: duration,
      animationDuration,
      currentStory
    });
    const interval = 50; // обновление каждые 50мс
    const increment = (interval / duration) * 100;

    progressTimer.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + increment;
        if (newProgress >= 100) {
          goToNext();
          return 0;
        }
        return newProgress;
      });
    }, interval);

    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
    };
  }, [isModalVisible, isPaused, currentUserIndex, currentStoryIndex, animationDuration, goToNext, stories]);

  // Публичные методы через ref
  React.useImperativeHandle(ref, () => ({
    setStories: (newStories: StoryUser[]) => {
      setStories(newStories);
    },
    hide: () => {
      setIsModalVisible(false);
      if (onHide) {
        const currentUser = stories[currentUserIndex];
        onHide(currentUser?.id || '');
      }
    },
    show: (id?: string) => {
      if (id) {
        const userIndex = stories.findIndex(user => user.id === id);
        if (userIndex >= 0) {
          setCurrentUserIndex(userIndex);
          setCurrentStoryIndex(0);
        }
      }
      setIsModalVisible(true);
      if (onShow) {
        const currentUser = stories[currentUserIndex];
        onShow(currentUser?.id || '');
      }
    },
    pause: () => setIsPaused(true),
    resume: () => setIsPaused(false),
    isPaused: () => isPaused,
    goToPreviousStory: () => goToPrevious(),
    goToNextStory: () => goToNext()
  }));

  const goToPrevious = () => {
    if (currentStoryIndex > 0) {
      // Предыдущая история того же пользователя
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    } else if (currentUserIndex > 0) {
      // Предыдущий пользователь (последняя история)
      const prevUserIndex = currentUserIndex - 1;
      const prevUser = stories[prevUserIndex];
      setCurrentUserIndex(prevUserIndex);
      setCurrentStoryIndex(prevUser.stories.length - 1);
      setProgress(0);
    }
  };

  const handleMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      setIsPaused(true);
      setHideElements(true); // Скрываем элементы при долгом нажатии
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setIsPaused(false);
    setHideElements(false); // Показываем элементы при отпускании
  };

  const sendReaction = async (reaction: string) => {
    if (!currentStory || sendingReaction) return; // guard uses sendingReaction
    setSendingReaction(true);
    try {
      await fetch(`/api/register?endpoint=stories&id=${currentStory.id}&action=reaction`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ reaction }) });
    } catch(e) { console.warn('reaction failed', e); } finally { setTimeout(()=>setSendingReaction(false),400); }
  };

  const sendLike = async () => {
    if (!currentStory) return;
    try {
            await fetch(`/api/stories-unified?action=like&id=${currentStory.id}`, { method: 'POST', headers: { 'Content-Type':'application/json' } });
    } catch (e) { console.warn('like failed', e); }
  };

  const currentUser = stories[currentUserIndex];
  const currentStory = currentUser?.stories[currentStoryIndex];

  if (!isModalVisible || !currentUser || !currentStory) {
    return (
      <div className="flex space-x-4 p-4 overflow-x-auto">
        {stories.map((user, index) => {
          const hasUnseenStories = user.stories.some((_, storyIndex) => 
            !userProgress[user.id]?.[storyIndex] || userProgress[user.id][storyIndex] < 100
          );
          
          return (
            <div key={user.id} className="flex flex-col items-center space-y-2">
              <button
                onClick={() => {
                  setCurrentUserIndex(index);
                  setCurrentStoryIndex(0);
                  setIsModalVisible(true);
                  if (onShow) onShow(user.id);
                }}
                className={`rounded-full p-1 ${
                  hasUnseenStories 
                    ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' 
                    : 'bg-gray-300'
                }`}
                style={{ width: avatarSize + 8, height: avatarSize + 8 }}
              >
                <div className="bg-white rounded-full p-1">
                  <img
                    src={user.avatarSource}
                    alt={user.name}
                    className="rounded-full object-cover"
                    style={{ width: avatarSize, height: avatarSize }}
                  />
                </div>
              </button>
              {showName && (
                <span className="text-xs text-center w-16 truncate">
                  {user.name}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div 
      className="fixed story-modal transition-opacity duration-300" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor,
        opacity: isModalVisible ? 1 : 0,
        visibility: isModalVisible ? 'visible' : 'hidden',
        zIndex: 9999, // Высокий z-index для отображения поверх всего
        margin: 0,
        padding: 0
      }}
    >
      {/* Прогресс бары - точно как в Instagram */}
      <div className={`absolute top-3 left-3 right-3 flex space-x-1 z-50 transition-opacity duration-300 ${hideElements ? 'opacity-0' : 'opacity-100'}`}>
        {currentUser.stories.map((_, index) => {
          const isActive = index === currentStoryIndex;
          const isPast = index < currentStoryIndex;
          const localProgress = isActive ? progress : (isPast ? 100 : 0);
          return (
            <div key={index} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden relative">
              <div 
                className="h-full bg-white transition-all ease-linear" 
                style={{ 
                  width: `${localProgress}%`,
                  transition: isActive ? 'width 0.1s linear' : 'none'
                }} 
              />
            </div>
          );
        })}
      </div>

      {/* Заголовок - точно как в Instagram */}
      <div 
        className={`absolute top-6 left-3 right-3 flex items-center justify-between z-50 transition-opacity duration-300 ${
          hideElements ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex items-center space-x-3">
          <img
            src={currentUser.avatarSource}
            alt={currentUser.name}
            className="rounded-full object-cover border-2 border-white"
            style={{ width: storyAvatarSize, height: storyAvatarSize }}
          />
          <span className="text-white font-medium text-sm drop-shadow-lg">{currentUser.name}</span>
          <span className="text-white text-xs opacity-70 drop-shadow-lg">2ч</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Кнопка звука */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="text-white hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-white/10"
          >
            {isMuted ? (
              <SpeakerXMarkIcon className="w-6 h-6 drop-shadow-lg" />
            ) : (
              <SpeakerWaveIcon className="w-6 h-6 drop-shadow-lg" />
            )}
          </button>
          
          {/* Кнопка меню */}
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-white hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-white/10"
          >
            <EllipsisHorizontalIcon className="w-6 h-6 drop-shadow-lg" />
          </button>
          
          {/* Кнопка закрытия - точно как в Instagram */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsModalVisible(false); 
              if (onHide) onHide(currentUser.id); 
            }} 
            className="text-white hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-white/10"
            style={{ color: closeIconColor }}
          >
            <X className="w-7 h-7 drop-shadow-lg" />
          </button>
        </div>
      </div>

      {/* Контейнер истории - весь экран как в Instagram */}
      <div
        className="story-content"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#000',
          overflow: 'hidden',
          margin: 0,
          padding: 0
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Зоны для навигации - невидимые, но функциональные */}
        <button
          className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            cursor: 'pointer'
          }}
          onClick={goToPrevious}
        />
        <button
          className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            cursor: 'pointer'
          }}
          onClick={goToNext}
        />

        {/* Контент */}
        {currentStory.contentType === 'image' && currentStory.mediaUrl && (
          <img
            src={currentStory.mediaUrl}
            alt={currentStory.title}
            className="story-media"
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%', 
              height: '100%',
              objectFit: 'cover', 
              background: '#000', 
              display: 'block',
              zIndex: 1
            }}
          />
        )}

        {currentStory.contentType === 'video' && currentStory.mediaUrl && (
          <video
            src={currentStory.mediaUrl}
            autoPlay
            muted={isMuted}
            className="story-media"
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%', 
              height: '100%',
              objectFit: 'cover', 
              background: '#000', 
              display: 'block',
              zIndex: 1
            }}
          />
        )}

        {/* Центральная иконка паузы/воспроизведения */}
        {isPaused && !hideElements && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-black bg-opacity-50 rounded-full p-4">
              {isPaused ? (
                <PlayIcon className="w-12 h-12 text-white" />
              ) : (
                <PauseIcon className="w-12 h-12 text-white" />
              )}
            </div>
          </div>
        )}

        {currentStory.contentType === 'text' && (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={
              currentStory.background?.type === 'gradient'
                ? { background: currentStory.background.value }
                : { backgroundColor: currentStory.background?.value || '#FF6B6B' }
            }
          >
            <div className="text-center">
              <h2 className="text-white text-2xl font-bold mb-4">
                {currentStory.title}
              </h2>
              {currentStory.textContent && (
                <p className="text-white text-lg leading-relaxed">
                  {currentStory.textContent}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Ссылка действия */}
        {currentStory.link && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <a
              href={currentStory.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors"
            >
              {currentStory.linkText || 'Узнать больше'}
            </a>
          </div>
        )}

        {/* Индикатор Swipe Up */}
        {currentStory.link && !hideElements && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex flex-col items-center animate-bounce">
            <ChevronUpIcon className="w-6 h-6 text-white opacity-70" />
            <span className="text-white text-xs mt-1 opacity-70">Свайп вверх</span>
          </div>
        )}

        {/* Панель реакций - точно как в Instagram */}
        {!hideElements && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center space-x-3 bg-black/20 backdrop-blur-sm rounded-full px-4 py-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  sendLike();
                }} 
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 hover:scale-105"
              >
                <Heart className="w-6 h-6" fill="currentColor" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  sendReaction('smile');
                }} 
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 hover:scale-105"
              >
                <Smile className="w-6 h-6" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  sendReaction('laugh');
                }} 
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 hover:scale-105"
              >
                <Laugh className="w-6 h-6" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  sendReaction('thumbsup');
                }} 
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 hover:scale-105"
              >
                <ThumbsUp className="w-6 h-6" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  sendReaction('rocket');
                }} 
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-95 hover:scale-105"
              >
                <Rocket className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Индикатор для тапов - как в Instagram */}
        {!hideElements && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
            <div className="flex items-center space-x-2 text-white/70 text-xs">
              <span>👆 Тап для реакции</span>
              <span>•</span>
              <span>❤️ {currentStory.likes || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Навигационные стрелки для десктопа */}
      <div className="hidden md:flex absolute left-4 top-1/2 transform -translate-y-1/2">
        {(currentUserIndex > 0 || currentStoryIndex > 0) && (
          <button
            onClick={goToPrevious}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <ChevronLeftIcon className="w-8 h-8" />
          </button>
        )}
      </div>
      <div className="hidden md:flex absolute right-4 top-1/2 transform -translate-y-1/2">
        {(currentUserIndex < stories.length - 1 || currentStoryIndex < currentUser.stories.length - 1) && (
          <button
            onClick={goToNext}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <ChevronRightIcon className="w-8 h-8" />
          </button>
        )}
      </div>
    </div>
  );
});

InstagramStories.displayName = 'InstagramStories';

export default InstagramStories;
