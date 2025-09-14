import React, { useState, useRef, useEffect } from "react";
import { CloudArrowUpIcon, XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { STORY_LIMITS } from "../types/story";
import { useStoryUpload } from "../hooks/useStoryUpload";
import { getAuth, onAuthStateChanged } from "firebase/auth";

interface StoryFileUploaderProps {
  onUpload: (file: File, url: string) => void;
  onRemove: () => void;
  contentType: "image" | "video" | null;
  currentFile?: { url: string; name: string };
  className?: string;
}

function formatBytes(n: number) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"], i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed( i ? 1 : 0)} ${u[i]}`;
}

export const StoryFileUploader: React.FC<StoryFileUploaderProps> = ({
  onUpload,
  onRemove,
  contentType,
  currentFile,
  className = "",
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [authReady, setAuthReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload: performUpload, cancel } = useStoryUpload({
    onProgress: (p) => {
      if (p.state === "running") setProgress(p.percent);
      if (p.state === "success") { setProgress(100); setUploading(false); }
      if (p.state === "canceled") { setUploading(false); setError("Загрузка отменена"); }
      if (p.state === "error") { setUploading(false); setError("Ошибка загрузки"); }
    },
  });

  // Ждём инициализацию auth (единожды)
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, () => setAuthReady(true));
    return () => unsub();
  }, []);

  const validateFile = (file: File) => {
    if (!contentType) throw new Error("Сначала выберите тип контента");

    if (contentType === "image") {
      if (!STORY_LIMITS.IMAGE.FORMATS.includes(file.type)) {
        throw new Error("Поддерживаются только JPG, PNG, WebP");
      }
      if (file.size > STORY_LIMITS.IMAGE.MAX_SIZE) {
        throw new Error(`Изображение > ${formatBytes(STORY_LIMITS.IMAGE.MAX_SIZE)}`);
      }
    } else {
      if (!STORY_LIMITS.VIDEO.FORMATS.includes(file.type)) {
        throw new Error("Поддерживаются только MP4, WebM");
      }
      if (file.size > STORY_LIMITS.VIDEO.MAX_SIZE) {
        throw new Error(`Видео > ${formatBytes(STORY_LIMITS.VIDEO.MAX_SIZE)}`);
      }
    }
  };

  const uploadToFirebaseClient = async (file: File): Promise<string> => {
    const auth = getAuth();
    if (!auth.currentUser) throw new Error("Не авторизовано");
    const type = contentType === "video" ? "video" : "image";
    const result = await performUpload(file, type);
    return result.url;
  };

  const processFile = async (file: File) => {
    try {
      setError("");
      setProgress(0);

      // ждём authInit
      if (!authReady) {
        await new Promise<void>((res) => {
          const auth = getAuth();
          const stop = onAuthStateChanged(auth, () => { setAuthReady(true); stop(); res(); });
        });
      }

      validateFile(file);
      setUploading(true);
      const finalUrl = await uploadToFirebaseClient(file);
      onUpload(file, finalUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Неизвестная ошибка";
      setError(msg);
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (uploading) return;
    if (files && files.length > 0) processFile(files[0]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (uploading) return;
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (uploading) return;
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileSelect = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setError(""); setProgress(0);
    onRemove();
  };

  const getAcceptedTypes = () => {
    if (contentType === "image") {
      const mimes = STORY_LIMITS.IMAGE.FORMATS.join(",");
      const exts = ".jpg,.jpeg,.png,.webp";
      return `${mimes},${exts}`;
    } else if (contentType === "video") {
      const mimes = STORY_LIMITS.VIDEO.FORMATS.join(",");
      const exts = ".mp4,.webm";
      return `${mimes},${exts}`;
    }
    return "";
  };

  const getMaxHint = () =>
    contentType === "image"
      ? `${formatBytes(STORY_LIMITS.IMAGE.MAX_SIZE)}`
      : contentType === "video"
      ? `${formatBytes(STORY_LIMITS.VIDEO.MAX_SIZE)}, до ${STORY_LIMITS.VIDEO.MAX_DURATION} сек`
      : "";

  return (
    <div className={`w-full ${className}`}>
      {currentFile ? (
        <div className="relative bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
              <div>
                <p className="font-medium text-gray-900">{currentFile.name}</p>
                <p className="text-sm text-gray-500">Файл загружен</p>
              </div>
            </div>
            <button onClick={handleRemove} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 flex justify-center">
            {contentType === "image" ? (
              <img src={currentFile.url} alt="Preview" className="max-h-40 rounded-lg object-cover" />
            ) : (
              <video src={currentFile.url} className="max-h-40 rounded-lg" controls muted />
            )}
          </div>
        </div>
      ) : (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          } ${!contentType || uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={contentType && !uploading ? handleFileSelect : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={getAcceptedTypes()}
            onChange={(e) => handleFiles(e.target.files)}
            disabled={!contentType || uploading}
          />

          <div className="space-y-4">
            <CloudArrowUpIcon className={`mx-auto w-12 h-12 ${dragActive ? "text-blue-500" : "text-gray-400"}`} />
            <div>
              <p className="text-lg font-medium text-gray-900">{uploading ? "Загрузка..." : "Загрузите файл"}</p>
              <p className="text-sm text-gray-500 mt-1">
                {contentType ? (
                  <>
                    Перетащите файл сюда или нажмите для выбора
                    <br />
                    Максимальный размер: {getMaxHint()}
                  </>
                ) : (
                  "Сначала выберите тип контента"
                )}
              </p>
            </div>
          </div>

          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-lg space-y-3">
              <div className="w-40 h-2 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: progress + "%" }} />
              </div>
              <div className="text-sm text-gray-700">{Math.round(progress)}%</div>
              <button
                type="button"
                onClick={() => { cancel(); }}
                className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
              >
                Отменить
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};
