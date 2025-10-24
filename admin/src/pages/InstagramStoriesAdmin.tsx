import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  PhotoIcon,
  SparklesIcon,
  HeartIcon,
  ShareIcon,
  PlayIcon,
  VideoCameraIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
// import { ApiService } from "@/services/apiConfig";
import StoriesService, { Story as ServiceStory } from "@/services/stories";
import { useStoryUpload } from "@/hooks/useStoryUpload";
import StoryStudio from "@/components/StoryStudio";
import InstagramStoriesViewer from "@/components/InstagramStoriesViewer";
import BulkStoriesUploader from "@/components/BulkStoriesUploader";

const COLORS = {
  bg: "#F5F7FB",
  card: "#FFFFFF",
  text: "#0E1A2B",
  sub: "#6B7280",
  primary: "#0E1A2B",
  border: "rgb(226 232 240)",
  gold: "#F5B301",
};

// Simple gradient presets for preview
const GRADIENTS: Record<string, string> = {
  sunset: "linear-gradient(135deg, #ff6b6b, #ffd93d, #ff9f43)",
  ocean: "linear-gradient(135deg, #667eea, #764ba2)",
  forest: "linear-gradient(135deg, #2dd4bf, #065f46)",
  purple: "linear-gradient(135deg, #a855f7, #ec4899)",
};

const MAX_IMAGE_SIZE_MB = 10;
const MAX_VIDEO_SIZE_MB = 100;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "video/mpeg",
  "video/3gpp",
  "video/3gpp2",
];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".avif"];
const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm", ".mpeg", ".mpg", ".3gp", ".3g2"];

interface StoryFormData {
  title: string;
  contentType: "image" | "video";
  mediaUrl?: string;
  duration: number;
  link?: string;
}

const InstagramStoriesAdmin: React.FC = () => {
  const [stories, setStories] = useState<ServiceStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<ServiceStory | null>(null);
  const [previewStory, setPreviewStory] = useState<ServiceStory | null>(null);
  type FilterType = "all" | "active" | "scheduled" | "expired";
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [formData, setFormData] = useState<StoryFormData>({
    title: "",
    contentType: "image",
    duration: 6,
  });

  const { upload, state: uploadState } = useStoryUpload();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    loadStories();
  }, []);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (formData.mediaUrl) {
      setLocalPreview(formData.mediaUrl);
    }
  }, [formData.mediaUrl]);

  const loadStories = async () => {
    try {
      setLoading(true);
      const data = await StoriesService.getAll();
      setStories(data);
    } finally {
      setLoading(false);
    }
  };

  const buckets = useMemo(() => {
    const now = new Date();
    const all = stories;
    const active = stories.filter((s) => {
      const publishDate = new Date(s.publishAt || s.createdAt || new Date().toISOString());
      const expiryDate = new Date(publishDate.getTime() + s.duration * 1000);
      return s.isActive && expiryDate > now;
    });
    const scheduled = stories.filter((s) => {
      const publishDate = new Date(s.publishAt || s.createdAt || new Date().toISOString());
      return publishDate > now;
    });
    const expired = stories.filter((s) => {
      const publishDate = new Date(s.publishAt || s.createdAt || new Date().toISOString());
      const expiryDate = new Date(publishDate.getTime() + s.duration * 1000);
      return expiryDate <= now;
    });
    return { all, active, scheduled, expired };
  }, [stories]);

  const filteredStories = useMemo(() => {
    switch (filter) {
      case "active":
        return buckets.active;
      case "scheduled":
        return buckets.scheduled;
      case "expired":
        return buckets.expired;
      default:
        return buckets.all;
    }
  }, [filter, buckets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mediaUrl) return;

    const payload: Partial<ServiceStory> = {
      title: formData.title,
      contentType: formData.contentType,
      mediaUrl: formData.mediaUrl,
      duration: Math.min(15, Math.max(1, Number(formData.duration || 6))),
      link: formData.link ?? undefined,
      publishAt: new Date().toISOString(),
      isActive: true,
    } as Partial<ServiceStory>;

    try {
      if (editingStory) await StoriesService.update(editingStory.id, payload);
      else await StoriesService.create(payload);
      await loadStories();
      resetForm();
    } catch {
      alert("Не удалось сохранить сторис");
    }
  };

  const resetForm = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setLocalPreview(null);
    setSelectedFileName(null);
    setUploadError(null);
    setFormData({ title: "", contentType: "image", duration: 6 });
    setShowForm(false);
    setEditingStory(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить эту story?")) return;
    try {
      await StoriesService.remove(id);
      await loadStories();
    } catch {
      alert("Удаление не удалось");
    }
  };

  const clearPreviewObjectUrl = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
  };

  const handleSelectContentType = (type: "image" | "video") => {
    if (type === formData.contentType) return;
    clearPreviewObjectUrl();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUploadError(null);
    setSelectedFileName(null);
    setLocalPreview(null);
    setFormData((prev) => ({
      ...prev,
      contentType: type,
      mediaUrl: undefined,
    }));
  };

  const validateFile = (file: File, isVideo: boolean) => {
    const limit = (isVideo ? MAX_VIDEO_SIZE_MB : MAX_IMAGE_SIZE_MB) * 1024 * 1024;
    if (file.size > limit) {
      setUploadError(
        isVideo
          ? `Видео должно быть не больше ${MAX_VIDEO_SIZE_MB}MB`
          : `Изображение должно быть не больше ${MAX_IMAGE_SIZE_MB}MB`
      );
      return false;
    }

    const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    const allowedExt = isVideo ? ALLOWED_VIDEO_EXTENSIONS : ALLOWED_IMAGE_EXTENSIONS;
    const name = file.name.toLowerCase();
    const isTypeAllowed = allowedTypes.includes(file.type);
    const isExtAllowed = allowedExt.some((ext) => name.endsWith(ext));

    if (!isTypeAllowed && !isExtAllowed) {
      setUploadError(
        isVideo
          ? "Поддерживаются форматы MP4, MOV, WEBM, M4V, MPEG до 100MB"
          : "Поддерживаются изображения JPG, PNG, WEBP, HEIC, AVIF до 10MB"
      );
      return false;
    }

    return true;
  };

  const handleFileUpload = async (file: File) => {
    const isVideo = formData.contentType === "video";
    if (!validateFile(file, isVideo)) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploadError(null);
    setSelectedFileName(file.name);
    const previousMediaUrl = formData.mediaUrl;
    setFormData((prev) => ({ ...prev, mediaUrl: undefined }));

    clearPreviewObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setLocalPreview(objectUrl);

    try {
      const result = await upload(file, isVideo ? "video" : "image");
      setFormData((prev) => ({
        ...prev,
        mediaUrl: result.url,
        contentType: isVideo ? "video" : "image",
      }));
      setLocalPreview(result.url);
      setUploadError(null);
    } catch (error) {
      console.error(error);
      setUploadError(
        error instanceof Error ? error.message : "Не удалось загрузить файл, попробуйте ещё раз"
      );
      if (previousMediaUrl) {
        setFormData((prev) => ({ ...prev, mediaUrl: previousMediaUrl }));
        setLocalPreview(previousMediaUrl);
      } else {
        setLocalPreview(null);
      }
      setSelectedFileName(null);
    } finally {
      clearPreviewObjectUrl();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (uploadState.uploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const openFileDialog = () => {
    if (uploadState.uploading) return;
    fileInputRef.current?.click();
  };

  const isVideoSelected = formData.contentType === "video";
  const acceptAttribute = isVideoSelected ? ALLOWED_VIDEO_TYPES.join(",") : "image/*";
  const uploadHint = isVideoSelected
    ? "MP4, MOV, WEBM, M4V, MPEG до 100MB"
    : "JPG, PNG, WEBP, HEIC, AVIF до 10MB";
  const uploadProgress = Math.round(uploadState.progress || 0);

  const handleUploadAreaKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (uploadState.uploading) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFileDialog();
    }
  };

  const StoryPreview = ({ story }: { story: ServiceStory }) => (
    <motion.div
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="aspect-[9/16] w-72 rounded-3xl overflow-hidden relative"
      style={{ background: story.contentType === 'gradient' ? (GRADIENTS[story.gradient || 'sunset'] || GRADIENTS.sunset) : COLORS.text, boxShadow: "0 12px 32px rgba(16,34,62,.18)" }}
    >
      <div className="absolute inset-0 ring-1" style={{ borderRadius: 24, borderColor: COLORS.border }} />
      <div className="absolute inset-0 flex items-center justify-center p-5">
        {story.contentType === "image" && story.mediaUrl && (
          <img src={story.mediaUrl} alt={story.title} className="w-full h-full object-cover rounded-2xl" />
        )}

        {story.contentType === "video" && story.mediaUrl && (
          <div className="relative w-full h-full">
            <video src={story.mediaUrl} className="w-full h-full object-cover rounded-2xl" muted />
            <div className="absolute inset-0 flex items-center justify-center">
              <PlayIcon className="w-14 h-14 text-white/90" />
            </div>
          </div>
        )}

        {story.contentType === "text/plain" && (
          <div className="text-center text-white w-full h-full flex items-center justify-center" style={{ background: GRADIENTS[story.gradient || 'sunset'] || COLORS.text }}>
            <div className="p-4 max-w-[85%]">
              <h3 className="text-2xl font-semibold mb-3">{story.title}</h3>
              {story.text && <p className="text-base/6 text-white/90">{story.text}</p>}
            </div>
          </div>
        )}

        {story.contentType === "gradient" && (
          <div className="w-full h-full" style={{ background: GRADIENTS[story.gradient || 'sunset'] || GRADIENTS.sunset }} />
        )}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white/95">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">SunFood</span>
        </div>
        <div className="text-xs bg-black/30 px-2 py-1 rounded-full">{story.duration}s</div>
      </div>

      {/* Progress */}
      <div className="absolute top-12 left-4 right-4">
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.18)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: COLORS.gold }}
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: story.duration }}
          />
        </div>
      </div>

      {/* Link */}
      {story.link && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black/45 rounded-2xl p-3 text-white">
            <p className="text-xs opacity-80">Узнать больше</p>
            <p className="text-sm font-medium">{story.linkText || "Перейти"}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="absolute bottom-20 right-4 flex flex-col space-y-3 text-white">
        <div className="text-center">
          <HeartIcon className="w-6 h-6 mx-auto mb-1" />
          <span className="text-xs">{story.likes || 0}</span>
        </div>
        <div className="text-center">
          <EyeIcon className="w-6 h-6 mx-auto mb-1" />
          <span className="text-xs">{story.views || 0}</span>
        </div>
        <div className="text-center">
          <ShareIcon className="w-6 h-6 mx-auto mb-1" />
        </div>
      </div>
    </motion.div>
  );

  // Map service stories to viewer-compatible shape
  type ViewerStory = {
    id: string;
    title: string;
    contentType: 'image'|'video'|'text';
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
  };

  const toViewerStory = (s: ServiceStory): ViewerStory => {
    const isGradient = s.contentType === 'gradient';
    const isText = s.contentType === 'text/plain';
    return {
      id: s.id,
      title: s.title,
      contentType: s.contentType === 'image' || s.contentType === 'video' ? s.contentType : 'text',
      mediaUrl: s.mediaUrl,
      textContent: isText ? s.text || '' : undefined,
      background: isGradient ? { type: 'gradient', value: GRADIENTS[s.gradient || 'sunset'] || GRADIENTS.sunset } : undefined,
      duration: s.duration,
      link: s.link || undefined,
      linkText: s.linkText || undefined,
      publishAt: s.publishAt,
      views: s.views,
      likes: s.likes,
      createdAt: s.createdAt || new Date().toISOString(),
      isActive: !!s.isActive,
    };
  };

  return (
    <div className="min-h-screen p-6 bg-[var(--color-bg-base)]">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto -mx-6 mb-6 px-6 py-4 bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)]/80 backdrop-blur-md shadow-card rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white font-[var(--font-family-heading)]">Stories Manager</h1>
            <p className="mt-1 text-sm text-white/80 font-[var(--font-family-base)]">Управляйте сторис в стиле Instagram</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <motion.button
              onClick={() => setBulkOpen(true)}
              className="px-5 py-3 rounded-2xl text-[var(--color-accent-orange)] bg-white/90 hover:bg-white transition shadow-card"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="inline-flex items-center gap-2 font-semibold">
                <PlusIcon className="w-5 h-5" /> Bulk Upload
              </span>
            </motion.button>
            <motion.button
              onClick={() => setShowForm(true)}
              className="px-5 py-3 rounded-2xl text-[var(--color-accent-orange)] bg-white/90 hover:bg-white transition shadow-card"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="inline-flex items-center gap-2 font-semibold">
                <PlusIcon className="w-5 h-5" /> Создать Story
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {([
            { key: "all" as const, label: "Все", count: buckets.all.length },
            { key: "active" as const, label: "Активные", count: buckets.active.length },
            { key: "scheduled" as const, label: "Запланированные", count: buckets.scheduled.length },
            { key: "expired" as const, label: "Завершённые", count: buckets.expired.length },
          ]).map((tab) => {
            const activeTab = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all font-semibold ${
                  activeTab
                    ? 'bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)] text-white border-transparent shadow-card'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab ? 'bg-white/20 text-white' : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] w-72 rounded-3xl bg-[var(--color-bg-elevated)] animate-pulse shadow-card border border-[var(--color-border)]" />
            ))}
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="text-center py-16 bg-[var(--color-bg-elevated)] rounded-2xl shadow-card border border-[var(--color-border)]">
            <PhotoIcon className="w-14 h-14 mx-auto mb-3 text-[var(--color-text-secondary)]" />
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] font-[var(--font-family-heading)]">Нет stories</h3>
            <p className="text-sm text-[var(--color-text-secondary)] font-[var(--font-family-base)]">Создайте первую story для ваших клиентов</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
            {filteredStories.map((story) => (
              <motion.div key={story.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative group">
                <div className="relative">
                  <StoryPreview story={story} />
                  <div className="absolute inset-0 rounded-3xl bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                    <motion.button
                      onClick={() => {
                        setPreviewStory(story);
                        setViewerOpen(true);
                      }}
                      className="p-3 rounded-full text-white hover:bg-white/25 backdrop-blur-sm transition"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <EyeIcon className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        clearPreviewObjectUrl();
                        setEditingStory(story);
                        setFormData({
                          title: story.title,
                          contentType: story.contentType === "video" ? "video" : "image",
                          mediaUrl: story.mediaUrl,
                          duration: story.duration,
                          link: story.link ?? undefined,
                        });
                        setLocalPreview(story.mediaUrl ?? null);
                        setSelectedFileName(null);
                        setUploadError(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                        setShowForm(true);
                      }}
                      className="p-3 rounded-full text-white hover:bg-white/25 backdrop-blur-sm transition"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <PencilIcon className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleDelete(story.id)}
                      className="p-3 rounded-full text-white bg-red-600/80 hover:bg-red-600 transition"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <h3 className="font-semibold truncate" style={{ color: COLORS.text }}>
                    {story.title}
                  </h3>
                  <div className="mt-1 flex items-center justify-center gap-4 text-sm" style={{ color: COLORS.sub }}>
                    <span className="flex items-center">
                      <EyeIcon className="w-4 h-4 mr-1" />
                      {story.views || 0}
                    </span>
                    <span className="flex items-center">
                      <HeartIcon className="w-4 h-4 mr-1" />
                      {story.likes || 0}
                    </span>
                    <span className="flex items-center">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      {story.duration}s
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && resetForm()}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="rounded-3xl p-7 w-full max-w-2xl max-h-[90vh] overflow-y-auto border"
              style={{ background: COLORS.card, borderColor: COLORS.border }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: COLORS.text }}>
                {editingStory ? "Редактировать Story" : "Создать новую Story"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: COLORS.text }}>
                    Название
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border focus:outline-none"
                    style={{ borderColor: COLORS.border }}
                    placeholder="Введите название story…"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: COLORS.text }}>
                    Формат контента
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectContentType("image")}
                      className={[
                        "flex-1 min-w-[140px] px-4 py-3 rounded-xl border transition font-semibold flex items-center justify-center gap-2",
                        !isVideoSelected
                          ? "border-[var(--color-accent-orange)] bg-[color-mix(in_oklab,var(--color-accent-orange)_12%,white)] text-[var(--color-accent-orange)]"
                          : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-orange)] hover:text-[var(--color-accent-orange)]"
                      ].join(" ")}
                    >
                      <PhotoIcon className="w-5 h-5" />
                      Фото
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectContentType("video")}
                      className={[
                        "flex-1 min-w-[140px] px-4 py-3 rounded-xl border transition font-semibold flex items-center justify-center gap-2",
                        isVideoSelected
                          ? "border-[var(--color-accent-orange)] bg-[color-mix(in_oklab,var(--color-accent-orange)_12%,white)] text-[var(--color-accent-orange)]"
                          : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-orange)] hover:text-[var(--color-accent-orange)]"
                      ].join(" ")}
                    >
                      <VideoCameraIcon className="w-5 h-5" />
                      Видео
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: COLORS.text }}>
                    Медиафайл
                  </label>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={openFileDialog}
                    onKeyDown={handleUploadAreaKeyDown}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={[
                      "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-5 sm:p-6 text-center transition",
                      localPreview
                        ? "border-transparent bg-[var(--color-bg-hover)]/45"
                        : "border-[var(--color-border)] hover:border-[var(--color-accent-orange)] hover:bg-[var(--color-bg-hover)]/40",
                      uploadState.uploading ? "cursor-progress opacity-80" : "cursor-pointer"
                    ].join(" ")}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={acceptAttribute}
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    {localPreview ? (
                      <div className="w-full max-w-[260px] aspect-[9/16] rounded-2xl overflow-hidden bg-black/5">
                        {isVideoSelected ? (
                          <video
                            src={localPreview}
                            className="h-full w-full object-cover"
                            controls
                            playsInline
                            muted
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={localPreview}
                            alt="Story preview"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        <ArrowUpTrayIcon className="w-8 h-8 text-[var(--color-accent-orange)]" />
                        <span className="font-medium">Перетащите или выберите файл</span>
                        <span className="text-xs">{uploadHint}</span>
                      </div>
                    )}

                    {uploadState.uploading && (
                      <div className="absolute inset-0 rounded-2xl bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-full border-4 border-[var(--color-accent-orange)] border-t-transparent animate-spin" />
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                          Загружаем… {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                  {selectedFileName && !uploadState.uploading && (
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)] truncate" title={selectedFileName}>
                      {selectedFileName}
                    </p>
                  )}
                  {uploadError && (
                    <p className="mt-2 text-sm text-red-600">{uploadError}</p>
                  )}
                </div>

                {formData.contentType === "image" ? (
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-hover)]/35 p-6 text-center">
                    <p className="text-lg font-medium mb-3" style={{ color: COLORS.text }}>
                      Создайте сторис в StoryStudio
                    </p>
                    <p className="text-sm mb-5" style={{ color: COLORS.sub }}>
                      Соберите визуал в редакторе: фон, текст и графику. После экспорта мы автоматически загрузим PNG.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStudioOpen(true)}
                      className="px-6 py-3 rounded-xl text-white shadow hover:shadow-md transition disabled:opacity-60"
                      style={{ background: COLORS.primary }}
                      disabled={uploadState.uploading}
                    >
                      Открыть StoryStudio
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-hover)]/35 p-5 flex items-start gap-3 text-left">
                    <VideoCameraIcon className="w-6 h-6 text-[var(--color-accent-orange)] mt-1" />
                    <div className="space-y-2 text-sm" style={{ color: COLORS.sub }}>
                      <p className="font-semibold text-[var(--color-text-primary)]">Загружайте вертикальные видео до 100MB.</p>
                      <p>Поддерживаем MP4, MOV, WEBM, M4V, MPEG. Видео воспроизводится в сторис со звуком.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: COLORS.text }}>
                    Длительность: <span className="font-semibold">{formData.duration}s</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    value={String(formData.duration || '')}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: COLORS.text }}>
                    Ссылка (опционально)
                  </label>
                  <input
                    type="url"
                    value={formData.link || ""}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border focus:outline-none"
                    style={{ borderColor: COLORS.border }}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-6 py-3 rounded-xl border hover:bg-slate-50 transition"
                    style={{ borderColor: COLORS.border, color: COLORS.text }}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.mediaUrl}
                    className="flex-1 px-6 py-3 rounded-xl text-white shadow hover:shadow-md disabled:opacity-60 transition"
                    style={{ background: COLORS.primary }}
                  >
                    {editingStory ? "Сохранить" : "Создать"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Studio Modal */}
      <AnimatePresence>
        {studioOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-2 sm:p-4"
            onClick={(e) => e.target === e.currentTarget && setStudioOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <StoryStudio
                onCancel={() => setStudioOpen(false)}
                onExport={async ({ blob }) => {
                  try {
                    // Загружаем через useStoryUpload → получаем реальный CDN URL
                    const file = new File([blob], `story-${Date.now()}.png`, { type: "image/png" });
                    const res = await upload(file, "image");
                    setFormData((fd) => ({ ...fd, mediaUrl: res.url, contentType: "image" }));
                    setLocalPreview(res.url);
                    setSelectedFileName(null);
                    setUploadError(null);
                    setStudioOpen(false);
                    alert("История создана! Теперь укажите название и опубликуйте.");
                  } catch (e) {
                    console.error(e);
                    alert("Не удалось экспортировать/загрузить изображение");
                  }
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Viewer Preview */}
      <AnimatePresence>
        {viewerOpen && previewStory && (
          <InstagramStoriesViewer
            stories={filteredStories.map(toViewerStory)}
            initialIndex={filteredStories.findIndex((s) => s.id === previewStory.id)}
            onClose={() => {
              setViewerOpen(false);
              setPreviewStory(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {bulkOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setBulkOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="rounded-2xl p-6 w-full max-w-2xl bg-white border shadow-xl"
              style={{ borderColor: COLORS.border }}
              onClick={(e) => e.stopPropagation()}
            >
              <BulkStoriesUploader onClose={()=> setBulkOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InstagramStoriesAdmin;





