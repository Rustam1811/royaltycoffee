import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Eye, Heart, Calendar, Upload, Play } from 'lucide-react';
import { StoriesService, Story } from '@/services/stories';
import { useStoryUpload } from '@/hooks/useStoryUpload';

interface StoryFormData {
  type: 'image' | 'video' | 'text' | 'gradient';
  title: string;
  author: string;
  duration: number;
  text?: string;
  gradient?: string;
  file?: File | null;
  files?: File[]; // ÃÂ´ÃÂ»Ã‘Â ÃÂ¼ÃÂ½ÃÂ¾ÃÂ¶ÃÂµÃ‘ÂÃ‘â€šÃÂ²ÃÂµÃÂ½ÃÂ½ÃÂ¾ÃÂ¹ ÃÂ·ÃÂ°ÃÂ³Ã‘â‚¬Ã‘Æ’ÃÂ·ÃÂºÃÂ¸
  audience?: 'everyone' | 'close-friends'; // Ãâ€ÃÂ»Ã‘Â ÃÂºÃÂ¾ÃÂ³ÃÂ¾ ÃÂ²ÃÂ¸ÃÂ´ÃÂ½ÃÂ° Ã‘ÂÃ‘â€šÃÂ¾Ã‘â‚¬ÃÂ¸Ã‘Â
}

const gradientOptions = {
  sunset: { name: 'Sunset', style: 'linear-gradient(135deg, #ff6b6b, #ffd93d, #ff9f43)' },
  ocean: { name: 'Ocean', style: 'linear-gradient(135deg, #667eea, #764ba2)' },
  forest: { name: 'Forest', style: 'linear-gradient(135deg, #2dd4bf, #065f46)' },
  purple: { name: 'Purple Dream', style: 'linear-gradient(135deg, #a855f7, #ec4899)' }
};

const MAX_IMAGE_SIZE_MB = 10;
const MAX_VIDEO_SIZE_MB = 100;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/mpeg', 'video/3gpp', 'video/3gpp2'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif'];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.mpeg', '.mpg', '.3gp', '.3g2'];

export const InstagramStoriesAdminNew: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<StoryFormData>({
    type: 'image',
    title: '',
    author: '',
    duration: 5,
    files: [], // ÃÂ¸ÃÂ½ÃÂ¸Ã‘â€ ÃÂ¸ÃÂ°ÃÂ»ÃÂ¸ÃÂ·ÃÂ¸Ã‘â‚¬Ã‘Æ’ÃÂµÃÂ¼ ÃÂ¼ÃÂ°Ã‘ÂÃ‘ÂÃÂ¸ÃÂ² Ã‘â€žÃÂ°ÃÂ¹ÃÂ»ÃÂ¾ÃÂ²
    file: null,
    audience: 'everyone' // ÃÅ¸ÃÂ¾ Ã‘Æ’ÃÂ¼ÃÂ¾ÃÂ»Ã‘â€¡ÃÂ°ÃÂ½ÃÂ¸Ã‘Å½ ÃÂ²Ã‘ÂÃÂµÃÂ¼
  });
  const [isCreating, setIsCreating] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]); // ÃÂ´ÃÂ»Ã‘Â ÃÂ¼ÃÂ½ÃÂ¾ÃÂ¶ÃÂµÃ‘ÂÃ‘â€šÃÂ²ÃÂµÃÂ½ÃÂ½ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ¿Ã‘â‚¬ÃÂµÃÂ²Ã‘Å’Ã‘Å½
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const videoPreviewUrlRef = useRef<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { upload, state: uploadState } = useStoryUpload();

  const loadStories = useCallback(async () => {
    try {
      setLoading(true);
      const allStories = await StoriesService.getAll();
      setStories(allStories);
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrlRef.current) {
        URL.revokeObjectURL(videoPreviewUrlRef.current);
      }
    };
  }, []);

  const handleInputChange = (field: keyof StoryFormData, value: string | number | File | null) => {
    if (field === 'type') {
      const nextType = value as StoryFormData['type'];
      setFormData(prev => ({
        ...prev,
        type: nextType,
        files: [],
        file: null,
        text: nextType === 'text' ? (prev.text ?? '') : undefined,
        gradient: nextType === 'text' || nextType === 'gradient' ? (prev.gradient || 'sunset') : undefined
      }));
      setPreviewImages([]);
      if (videoPreviewUrlRef.current) {
        URL.revokeObjectURL(videoPreviewUrlRef.current);
        videoPreviewUrlRef.current = null;
      }
      setVideoPreview(null);
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (formData.type === 'video') {
      const file = files[0];
      if (!file) {
        e.target.value = '';
        return;
      }

      const lowerName = file.name.toLowerCase();
      const isTypeAllowed =
        ALLOWED_VIDEO_TYPES.includes(file.type) ||
        ALLOWED_VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

      if (!isTypeAllowed) {
        alert('Please choose a video in MP4, MOV, WEBM, M4V or MPEG format.');
        e.target.value = '';
        return;
      }

      if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        alert(`Video must be ${MAX_VIDEO_SIZE_MB}MB or smaller.`);
        e.target.value = '';
        return;
      }

      if (videoPreviewUrlRef.current) {
        URL.revokeObjectURL(videoPreviewUrlRef.current);
        videoPreviewUrlRef.current = null;
      }

      const objectUrl = URL.createObjectURL(file);
      videoPreviewUrlRef.current = objectUrl;
      setVideoPreview(objectUrl);
      setPreviewImages([]);
      setFormData((prev) => ({ ...prev, file, files: [] }));
      e.target.value = '';
      return;
    }

    if (!files.length) {
      e.target.value = '';
      return;
    }

    if (videoPreviewUrlRef.current) {
      URL.revokeObjectURL(videoPreviewUrlRef.current);
      videoPreviewUrlRef.current = null;
    }
    setVideoPreview(null);

    const validFiles = files.filter((file) => {
      const lowerName = file.name.toLowerCase();
      const isTypeAllowed =
        ALLOWED_IMAGE_TYPES.includes(file.type) ||
        ALLOWED_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
      const isSizeAllowed = file.size <= MAX_IMAGE_SIZE_MB * 1024 * 1024;

      if (!isTypeAllowed) {
        console.warn('Skipping unsupported image file:', file.name);
      }
      if (!isSizeAllowed) {
        console.warn('Skipping oversized image file:', file.name);
      }
      return isTypeAllowed && isSizeAllowed;
    });

    if (!validFiles.length) {
      alert('Please choose images up to 10MB in JPG, PNG, WEBP, HEIC or AVIF formats.');
      e.target.value = '';
      return;
    }

    if (e.target.multiple && validFiles.length > 1) {
      setFormData((prev) => ({ ...prev, files: validFiles, file: null }));

      const previews: string[] = [];
      let loadedCount = 0;

      validFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          previews[index] = event.target?.result as string;
          loadedCount++;

          if (loadedCount === validFiles.length) {
            setPreviewImages([...previews]);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      const file = validFiles[0];
      setFormData((prev) => ({ ...prev, file, files: [] }));
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImages([event.target?.result as string]);
      };
      reader.readAsDataURL(file);
    }

    e.target.value = '';
  };

  const clearForm = () => {
    setFormData({
      type: 'image',
      title: '',
      author: '',
      duration: 5,
      files: [],
      file: null,
      audience: 'everyone'
    });
    setPreviewImages([]);
    if (videoPreviewUrlRef.current) {
      URL.revokeObjectURL(videoPreviewUrlRef.current);
      videoPreviewUrlRef.current = null;
    }
    setVideoPreview(null);
  };

  const createStory = async () => {
    try {
      setIsCreating(true);

      if (!formData.title.trim() || !formData.author.trim()) {
        alert('Please fill in all required fields');
        return;
      }

      if (formData.type === 'image') {
        // ÃÅ¸Ã‘â‚¬ÃÂ¾ÃÂ²ÃÂµÃ‘â‚¬Ã‘ÂÃÂµÃÂ¼ ÃÂµÃ‘ÂÃ‘â€šÃ‘Å’ ÃÂ»ÃÂ¸ Ã‘â€žÃÂ°ÃÂ¹ÃÂ»Ã‘â€¹ ÃÂ´ÃÂ»Ã‘Â ÃÂ·ÃÂ°ÃÂ³Ã‘â‚¬Ã‘Æ’ÃÂ·ÃÂºÃÂ¸
        const filesToUpload = formData.files && formData.files.length > 0 ? formData.files : 
                            formData.file ? [formData.file] : [];
        
        if (filesToUpload.length === 0) {
          alert('Please select at least one image file');
          return;
        }

        // Ãâ€”ÃÂ°ÃÂ³Ã‘â‚¬Ã‘Æ’ÃÂ¶ÃÂ°ÃÂµÃÂ¼ ÃÂ²Ã‘ÂÃÂµ Ã‘â€žÃÂ°ÃÂ¹ÃÂ»Ã‘â€¹ ÃÂ¸ Ã‘ÂÃÂ¾ÃÂ·ÃÂ´ÃÂ°ÃÂµÃÂ¼ Ã‘ÂÃ‘â€šÃÂ¾Ã‘â‚¬ÃÂ¸Ã‘Â ÃÂ´ÃÂ»Ã‘Â ÃÂºÃÂ°ÃÂ¶ÃÂ´ÃÂ¾ÃÂ³ÃÂ¾
        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i];
          const uploadResult = await upload(file, 'image');
          
          const storyTitle = filesToUpload.length > 1 ? 
            `${formData.title} ${i + 1}` : formData.title;

          const newStory: Omit<Story, 'id' | 'createdAt' | 'updatedAt'> = {
            title: storyTitle,
            author: formData.author,
            duration: formData.duration,
            contentType: 'image',
            mediaUrl: uploadResult.url,
            likes: 0,
            views: 0,
            reactions: [],
            audience: formData.audience || 'everyone'
          };

          await StoriesService.create(newStory);
        }
        
        alert(`${filesToUpload.length} ${filesToUpload.length === 1 ? 'story' : 'stories'} created successfully!`);
      } else if (formData.type === 'video') {
        const file = formData.file;
        if (!file) {
          alert('Please select a video file');
          return;
        }

        const lowerName = file.name.toLowerCase();
        const isTypeAllowed =
          ALLOWED_VIDEO_TYPES.includes(file.type) ||
          ALLOWED_VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

        if (!isTypeAllowed) {
          alert('Video must be in MP4, MOV, WEBM, M4V or MPEG format.');
          return;
        }

        if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
          alert(`Video must be ${MAX_VIDEO_SIZE_MB}MB or smaller.`);
          return;
        }

        const uploadResult = await upload(file, 'video');

        const newStory: Omit<Story, 'id' | 'createdAt' | 'updatedAt'> = {
          title: formData.title,
          author: formData.author,
          duration: formData.duration,
          contentType: 'video',
          mediaUrl: uploadResult.url,
          likes: 0,
          views: 0,
          reactions: [],
          audience: formData.audience || 'everyone'
        };

        await StoriesService.create(newStory);
        alert('Video story created successfully!');
      } else {
        // Ãâ€ÃÂ»Ã‘Â Ã‘â€šÃÂµÃÂºÃ‘ÂÃ‘â€šÃÂ¾ÃÂ²Ã‘â€¹Ã‘â€¦ ÃÂ¸ ÃÂ³Ã‘â‚¬ÃÂ°ÃÂ´ÃÂ¸ÃÂµÃÂ½Ã‘â€šÃÂ½Ã‘â€¹Ã‘â€¦ Ã‘ÂÃ‘â€šÃÂ¾Ã‘â‚¬ÃÂ¸Ã‘Â Ã‘ÂÃÂ¾ÃÂ·ÃÂ´ÃÂ°ÃÂµÃÂ¼ ÃÂ¾ÃÂ´ÃÂ½Ã‘Æ’ ÃÂ¸Ã‘ÂÃ‘â€šÃÂ¾Ã‘â‚¬ÃÂ¸Ã‘Å½
        let contentType: Story['contentType'];
        
        if (formData.type === 'text') {
          if (!formData.text?.trim()) {
            alert('Please enter story text');
            return;
          }
          contentType = 'text/plain';
        } else {
          contentType = 'gradient';
        }

        const newStory: Omit<Story, 'id' | 'createdAt' | 'updatedAt'> = {
          title: formData.title,
          author: formData.author,
          duration: formData.duration,
          contentType,
          mediaUrl: undefined,
          text: formData.text,
          gradient: formData.gradient || 'sunset',
          likes: 0,
          views: 0,
          reactions: [],
          audience: formData.audience || 'everyone'
        };

        await StoriesService.create(newStory);
        alert('Story created successfully!');
      }

      await loadStories();
      clearForm();
    } catch (error) {
      console.error('Failed to create story:', error);
      alert('Failed to create story. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteStory = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      await StoriesService.remove(storyId);
      await loadStories();
    } catch (error) {
      console.error('Failed to delete story:', error);
      alert('Failed to delete story. Please try again.');
    }
  };

  const renderPreview = () => {
    if (formData.type === 'image' && previewImages.length > 0) {
      if (previewImages.length === 1) {
        return (
          <div 
            className="w-full h-full bg-cover bg-center rounded-2xl"
            style={{ backgroundImage: `url(${previewImages[0]})` }}
          />
        );
      }
      return (
        <div className="w-full h-full flex flex-col">
          <p className="text-sm text-gray-600 text-center mb-2">
            {previewImages.length} изображений выбрано
          </p>
          <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto">
            {previewImages.map((preview, index) => (
              <div 
                key={index}
                className="w-full h-24 bg-cover bg-center rounded-lg border-2 border-gray-200"
                style={{ backgroundImage: `url(${preview})` }}
                title={`Image ${index + 1}`}
              />
            ))}
          </div>
        </div>
      );
    }

    if (formData.type === 'video') {
      if (videoPreview) {
        return (
          <div className="w-full h-full rounded-2xl overflow-hidden bg-black flex items-center justify-center">
            <video
              src={videoPreview}
              className="w-full h-full object-cover"
              controls
              playsInline
              muted
              preload="metadata"
            />
          </div>
        );
      }

      return (
        <div className="w-full h-full bg-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-500 gap-2">
          <span>Video preview will appear here</span>
          <span className="text-xs">MP4, MOV, WEBM, M4V, MPEG up to {MAX_VIDEO_SIZE_MB}MB</span>
        </div>
      );
    } else if (formData.type === 'text' && formData.text) {
      return (
        <div 
          className="w-full h-full rounded-2xl flex items-center justify-center text-white text-xl font-bold text-center p-4"
          style={{ background: gradientOptions[formData.gradient as keyof typeof gradientOptions]?.style || gradientOptions.sunset.style }}
        >
          {formData.text}
        </div>
      );
    } else if (formData.type === 'gradient') {
      return (
        <div 
          className="w-full h-full rounded-2xl"
          style={{ background: gradientOptions[formData.gradient as keyof typeof gradientOptions]?.style || gradientOptions.sunset.style }}
        />
      );
    }

    return (
      <div className="w-full h-full bg-gray-200 rounded-2xl flex items-center justify-center text-gray-500">
        Story preview will appear here
      </div>
    );
  };

  const renderStoryCard = (story: Story) => {
    const getPreviewContent = () => {
      if ((story.contentType === 'image' || story.contentType?.startsWith('image/')) && story.mediaUrl) {
        return (
          <div 
            className="w-full h-40 rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${story.mediaUrl})` }}
          />
        );
      } else if ((story.contentType === 'video' || story.contentType?.startsWith('video/')) && story.mediaUrl) {
        return (
          <div className="relative w-full h-40 rounded-lg overflow-hidden bg-black">
            <video
              src={story.mediaUrl}
              className="w-full h-full object-cover"
              controls
              playsInline
              muted
              preload="metadata"
            />
          </div>
        );
      } else if (story.contentType === 'text/plain' && story.text) {
        return (
          <div 
            className="w-full h-40 rounded-lg flex items-center justify-center text-white text-sm font-bold text-center p-2"
            style={{ background: gradientOptions[story.gradient as keyof typeof gradientOptions]?.style || gradientOptions.sunset.style }}
          >
            {story.text}
          </div>
        );
      } else if (story.contentType === 'gradient') {
        return (
          <div 
            className="w-full h-40 rounded-lg"
            style={{ background: gradientOptions[story.gradient as keyof typeof gradientOptions]?.style || gradientOptions.sunset.style }}
          />
        );
      }

      return (
        <div className="w-full h-40 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
          No Preview
        </div>
      );
    };

    return (
      <motion.div
        key={story.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
      >
        {getPreviewContent()}
        
        <div className="space-y-2 mt-3">
          <h4 className="font-semibold text-gray-800">{story.title}</h4>
          <p className="text-sm text-gray-600">by {story.author}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="capitalize">{story.contentType?.includes('/') ? story.contentType.split('/')[0] : story.contentType} Story</span>
            <span>{story.duration}s</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Eye size={12} />
              <span>{story.views || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart size={12} />
              <span>{story.likes || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>{new Date(story.createdAt || '').toLocaleDateString()}</span>
            </div>
          </div>
          
          <button 
            onClick={() => deleteStory(story.id)}
            className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Plus className="text-purple-500" />
            Instagram Stories Admin
          </h1>
          <p className="text-gray-600 mt-2">Create and manage your Instagram-style stories</p>
        </div>

        {/* Story Creation Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Story</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Story Type</label>
                <select 
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="image">Image Story</option>
                  <option value="video">Video Story</option>
                  <option value="text">Text Story</option>
                  <option value="gradient">Gradient Story</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter story title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Author *</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter author name"
                />
              </div>

              {formData.type === 'image' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Загрузить изображение</label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.avif,image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-purple-400 transition-all flex flex-col items-center gap-2 group"
                  >
                    <Upload className="w-8 h-8 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    <span className="text-sm font-medium text-gray-700">
                      {previewImages.length > 0
                        ? `Выбрано: ${previewImages.length} файл(ов) — нажмите чтобы заменить`
                        : 'Нажмите для выбора изображений'}
                    </span>
                    <span className="text-xs text-gray-400">
                      JPG, PNG, WEBP, HEIC, AVIF до {MAX_IMAGE_SIZE_MB}MB
                    </span>
                  </button>
                  {uploadState.uploading && (
                    <div className="mt-2 text-sm text-blue-600">
                      Загрузка... {uploadState.progress}%
                    </div>
                  )}
                  {uploadState.error && (
                    <div className="mt-2 text-sm text-red-600">
                      Ошибка: {uploadState.error}
                    </div>
                  )}
                </div>
              )}

              {formData.type === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Загрузить видео</label>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept=".mp4,.mov,.m4v,.webm,.mpeg,.mpg,.3gp,.3g2,video/mp4,video/quicktime,video/webm,video/x-m4v,video/mpeg,video/3gpp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-purple-400 transition-all flex flex-col items-center gap-2 group"
                  >
                    <Play className="w-8 h-8 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    <span className="text-sm font-medium text-gray-700">
                      {videoPreview
                        ? 'Видео выбрано — нажмите чтобы заменить'
                        : 'Нажмите для выбора видео'}
                    </span>
                    <span className="text-xs text-gray-400">
                      MP4, MOV, WEBM, M4V, MPEG до {MAX_VIDEO_SIZE_MB}MB
                    </span>
                  </button>
                  {uploadState.uploading && (
                    <div className="mt-2 text-sm text-blue-600">
                      Загрузка... {uploadState.progress}%
                    </div>
                  )}
                  {uploadState.error && (
                    <div className="mt-2 text-sm text-red-600">
                      Ошибка: {uploadState.error}
                    </div>
                  )}
                </div>
              )}

              {formData.type === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Story Text</label>
                  <textarea
                    value={formData.text || ''}
                    onChange={(e) => handleInputChange('text', e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter your story text..."
                  />
                </div>
              )}

              {(formData.type === 'text' || formData.type === 'gradient') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Background Gradient</label>
                  <select
                    value={formData.gradient || 'sunset'}
                    onChange={(e) => handleInputChange('gradient', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {Object.entries(gradientOptions).map(([key, option]) => (
                      <option key={key} value={key}>{option.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Story Duration: {formData.duration} seconds
                </label>
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={String(formData.duration || '')}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Ã°Å¸Å’Å¸ Instagram-style Audience Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Who can see this story?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleInputChange('audience', 'everyone')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.audience === 'everyone'
                        ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      formData.audience === 'everyone'
                        ? 'bg-gradient-to-br from-orange-400 to-pink-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-sm">Everyone</div>
                      <div className="text-xs text-gray-500">All your subscribers</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInputChange('audience', 'close-friends')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.audience === 'close-friends'
                        ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      formData.audience === 'close-friends'
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-sm">Close Friends</div>
                      <div className="text-xs text-gray-500">Special people only</div>
                    </div>
                  </button>
                </div>
              </div>

              <button
                onClick={createStory}
                disabled={isCreating || uploadState.uploading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating || uploadState.uploading ? (
                  <>
                    <Upload className="animate-spin" size={20} />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    Create Story
                  </>
                )}
              </button>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Preview</h3>
              <div className="mx-auto" style={{ width: '250px', height: '400px' }}>
                {renderPreview()}
              </div>
            </div>
          </div>
        </div>

        {/* Stories Management */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Manage Stories</h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200 animate-pulse">
                  <div className="w-full h-40 bg-gray-300 rounded-lg mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <Plus size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">No stories created yet</p>
              <p className="text-sm">Create your first story using the form above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stories.map(renderStoryCard)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstagramStoriesAdminNew;


