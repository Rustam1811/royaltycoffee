import { useCallback, useRef, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export interface StoryUploadResult {
  url: string; path: string; contentType: string;
}
export interface UseStoryUploadState {
  uploading: boolean;
  progress: number; // 0..100
  error: string | null;
}

export type UploadProgress = { state: 'running'|'success'|'error'|'canceled'; percent: number };

type UseStoryUploadOptions = {
  onProgress?: (p: UploadProgress) => void;
};

export function useStoryUpload(options?: UseStoryUploadOptions) {
  const [state, setState] = useState<UseStoryUploadState>({ uploading: false, progress: 0, error: null });
  const taskRef = useRef<ReturnType<typeof uploadBytesResumable> | null>(null);

  const upload = useCallback(async (file: File, _kind: string): Promise<StoryUploadResult> => {
    setState({ uploading: true, progress: 0, error: null });
    options?.onProgress?.({ state: 'running', percent: 0 });

    try {
      // Генерируем уникальный путь
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const storagePath = `stories/${timestamp}_${sanitizedName}`;
      const contentType = file.type || 'image/jpeg';

      const storageRef = ref(storage, storagePath);
      
      // Загружаем напрямую через Firebase Client SDK с progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType,
        customMetadata: { uploadedAt: new Date().toISOString() },
      });
      taskRef.current = uploadTask;

      // Ждём завершения с реальным progress
      const url = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setState({ uploading: true, progress: percent, error: null });
            options?.onProgress?.({ state: 'running', percent });
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      taskRef.current = null;
      setState({ uploading: false, progress: 100, error: null });
      options?.onProgress?.({ state: 'success', percent: 100 });

      return { url, path: storagePath, contentType };
    } catch (e) {
      taskRef.current = null;
      const msg = e instanceof Error ? e.message : 'upload_failed';
      setState({ uploading: false, progress: 0, error: msg });
      options?.onProgress?.({ state: 'error', percent: 0 });
      throw e;
    }
  }, [options]);

  const cancel = useCallback(() => {
    if (taskRef.current) {
      taskRef.current.cancel();
      taskRef.current = null;
    }
    setState(prev => ({ ...prev, uploading: false }));
    options?.onProgress?.({ state: 'canceled', percent: state.progress || 0 });
  }, [options, state.progress]);

  return { upload, state, cancel };
}

export default useStoryUpload;

