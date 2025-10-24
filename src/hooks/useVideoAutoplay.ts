/**
 * Хук для управления автоплеем видео со звуком
 * Использует умную стратегию для обхода ограничений браузера
 */

import { useEffect, useState, useCallback } from 'react';

interface UseVideoAutoplayOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  shouldPlay: boolean;
  onPlaybackFailed?: () => void;
}

interface UseVideoAutoplayReturn {
  isMuted: boolean;
  toggleMute: () => Promise<void>;
  isPlaying: boolean;
  playbackError: string | null;
}

export const useVideoAutoplay = ({
  videoRef,
  shouldPlay,
  onPlaybackFailed,
}: UseVideoAutoplayOptions): UseVideoAutoplayReturn => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  /**
   * Умная стратегия автоплея:
   * 1. Пытаемся играть со звуком
   * 2. Если не получается - играем без звука и показываем кнопку включения
   * 3. Пользователь может включить звук в любой момент
   */
  const attemptAutoplay = useCallback(async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    setPlaybackError(null);

    try {
      // Стратегия 1: Пытаемся играть со звуком
      video.muted = false;
      setIsMuted(false);
      await video.play();
      setIsPlaying(true);
      console.log('✅ Video autoplay with sound: SUCCESS');
    } catch (soundError) {
      console.warn('⚠️ Video autoplay with sound: BLOCKED by browser', soundError);
      
      try {
        // Стратегия 2: Играем без звука
        video.muted = true;
        setIsMuted(true);
        await video.play();
        setIsPlaying(true);
        console.log('✅ Video autoplay muted: SUCCESS');
      } catch (mutedError) {
        // Стратегия 3: Полный фейл - требуется взаимодействие пользователя
        console.error('❌ Video autoplay failed completely:', mutedError);
        setPlaybackError('Требуется взаимодействие пользователя');
        setIsPlaying(false);
        onPlaybackFailed?.();
      }
    }
  }, [videoRef, onPlaybackFailed]);

  /**
   * Переключение звука
   */
  const toggleMute = useCallback(async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const newMutedState = !video.muted;
    
    video.muted = newMutedState;
    setIsMuted(newMutedState);

    // Если видео было на паузе, пытаемся запустить
    if (video.paused && !newMutedState) {
      try {
        await video.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('❌ Failed to play after unmute:', error);
        // Откатываемся к muted если не получилось
        video.muted = true;
        setIsMuted(true);
      }
    }
  }, [videoRef]);

  /**
   * Автоплей при монтировании или изменении shouldPlay
   */
  useEffect(() => {
    if (shouldPlay) {
      attemptAutoplay();
    }
  }, [shouldPlay, attemptAutoplay]);

  /**
   * Синхронизация состояния с реальным состоянием видео
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVolumeChange = () => {
      setIsMuted(video.muted);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoRef]);

  return {
    isMuted,
    toggleMute,
    isPlaying,
    playbackError,
  };
};
