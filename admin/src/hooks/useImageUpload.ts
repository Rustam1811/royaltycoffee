import { useState, useCallback } from 'react';

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
}

interface UploadResult {
  url: string;
  path: string;
  contentType: string;
}

/**
 * Хук для загрузки изображений акций/достижений через API
 */
export function useImageUpload() {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null
  });

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setState({ uploading: true, progress: 0, error: null });

    try {
      // Валидация файла
      if (!file.type.startsWith('image/')) {
        throw new Error('Можно загружать только изображения');
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB
        throw new Error('Размер файла не должен превышать 5MB');
      }

      setState(s => ({ ...s, progress: 10 }));

      // Конвертируем в base64
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setState(s => ({ ...s, progress: 50 }));

      // Загружаем через API (используем тот же endpoint что и для stories)
      const response = await fetch('/api/upload-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData,
          fileName: file.name,
          mimeType: file.type
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ошибка загрузки: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Ошибка загрузки');
      }

      setState({ uploading: false, progress: 100, error: null });

      return {
        url: result.url,
        path: result.path,
        contentType: result.contentType || file.type
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки';
      setState({ uploading: false, progress: 0, error: errorMessage });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ uploading: false, progress: 0, error: null });
  }, []);

  return {
    ...state,
    upload,
    reset
  };
}
