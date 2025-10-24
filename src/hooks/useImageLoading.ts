// Хук для оптимизированной загрузки изображений
import { useState, useEffect } from 'react';

interface UseImageLoadingOptions {
  lowQuality?: string;
  highQuality: string;
  placeholder?: string;
}

export const useImageLoading = ({ lowQuality, highQuality, placeholder }: UseImageLoadingOptions) => {
  const [currentSrc, setCurrentSrc] = useState(placeholder || lowQuality || highQuality);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Сначала показываем placeholder или low quality
    if (lowQuality && lowQuality !== currentSrc) {
      const lowImg = new Image();
      lowImg.src = lowQuality;
      lowImg.onload = () => {
        setCurrentSrc(lowQuality);
      };
    }

    // Потом загружаем high quality
    const highImg = new Image();
    highImg.src = highQuality;
    highImg.onload = () => {
      setCurrentSrc(highQuality);
      setIsLoading(false);
    };
    highImg.onerror = () => {
      setIsLoading(false);
    };

    return () => {
      highImg.onload = null;
      highImg.onerror = null;
    };
  }, [highQuality, lowQuality, currentSrc]);

  return { src: currentSrc, isLoading };
};

// Утилита для preload важных изображений
export const preloadImages = (urls: string[]): Promise<void[]> => {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Resolve даже при ошибке
          img.src = url;
        })
    )
  );
};

// Утилита для генерации low-quality URL из Unsplash
export const getLowQualityUrl = (url: string, width = 50): string => {
  if (url.includes('unsplash.com')) {
    // Добавляем параметры для low quality
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&q=10&blur=50`;
  }
  return url;
};

// Утилита для оптимизации Unsplash URL
export const optimizeImageUrl = (url: string, width = 800, quality = 80): string => {
  if (url.includes('unsplash.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}w=${width}&q=${quality}&auto=format&fit=crop`;
  }
  return url;
};
