import { useCallback, useRef, useState } from 'react';

export interface StoryUploadResult {
  url: string; path: string; contentType: string;
}
export interface UseStoryUploadState {
  uploading: boolean;
  progress: number; // 0..100 (best effort; uploadBytes has no incremental progress so stays 0/100)
  error: string | null;
}

// New: lightweight progress event shape to support optional callbacks
export type UploadProgress = { state: 'running'|'success'|'error'|'canceled'; percent: number };

// Optional callbacks config
type UseStoryUploadOptions = {
  onProgress?: (p: UploadProgress) => void;
};

export function useStoryUpload(options?: UseStoryUploadOptions) {
  const [state, setState] = useState<UseStoryUploadState>({ uploading:false, progress:0, error:null });
  const abortRef = useRef<() => void>(()=>{}); // placeholder (uploadBytes not abortable)

  const upload = useCallback(async (file: File, _kind: string) => {
    setState({ uploading:true, progress:0, error:null });
    options?.onProgress?.({ state: 'running', percent: 0 });
    try {
      // Конвертируем файл в base64
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1]; // Убираем data:mime/type;base64,
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setState({ uploading: true, progress: 50, error: null });
      options?.onProgress?.({ state: 'running', percent: 50 });

      // Загружаем через API endpoint (обходит CORS)
      const response = await fetch('/api/upload-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData,
          fileName: file.name,
          mimeType: file.type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      setState({ uploading:false, progress:100, error:null });
      options?.onProgress?.({ state: 'success', percent: 100 });
      return { 
        url: result.url, 
        path: result.path, 
        contentType: result.contentType || file.type 
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'upload_failed';
      setState({ uploading:false, progress:0, error: msg });
      options?.onProgress?.({ state: 'error', percent: 0 });
      throw e;
    }
  }, [options]);

  const cancel = useCallback(() => {
    // No true cancel support with uploadBytes; emit canceled state for UI
    setState(prev => ({ ...prev, uploading: false }));
    options?.onProgress?.({ state: 'canceled', percent: state.progress || 0 });
    abortRef.current?.();
  }, [options, state.progress]);

  return { upload, state, cancel };
}

export default useStoryUpload;

