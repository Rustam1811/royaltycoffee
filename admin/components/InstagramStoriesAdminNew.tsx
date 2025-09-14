import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Eye, Heart, Calendar, Upload } from 'lucide-react';
import { StoriesService, Story } from '../../src/services/stories';
import { useStoryUpload } from '../../src/hooks/useStoryUpload';

interface StoryFormData {
  type: 'image' | 'text' | 'gradient';
  title: string;
  author: string;
  duration: number;
  text?: string;
  gradient?: string;
  file?: File;
  files?: File[]; // для множественной загрузки
}

const gradientOptions = {
  sunset: { name: 'Sunset', style: 'linear-gradient(135deg, #ff6b6b, #ffd93d, #ff9f43)' },
  ocean: { name: 'Ocean', style: 'linear-gradient(135deg, #667eea, #764ba2)' },
  forest: { name: 'Forest', style: 'linear-gradient(135deg, #2dd4bf, #065f46)' },
  purple: { name: 'Purple Dream', style: 'linear-gradient(135deg, #a855f7, #ec4899)' }
};

export const InstagramStoriesAdminNew: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<StoryFormData>({
    type: 'image',
    title: '',
    author: '',
    duration: 5,
    files: [] // инициализируем массив файлов
  });
  const [isCreating, setIsCreating] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]); // для множественного превью

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

  const handleInputChange = (field: keyof StoryFormData, value: string | number | File) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (e.target.multiple) {
        // Множественная загрузка
        setFormData(prev => ({ ...prev, files }));
        
        // Создаем превью для всех файлов
        const previews: string[] = [];
        let loadedCount = 0;
        
        files.forEach((file, index) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            previews[index] = e.target?.result as string;
            loadedCount++;
            
            if (loadedCount === files.length) {
              setPreviewImages([...previews]);
            }
          };
          reader.readAsDataURL(file);
        });
      } else {
        // Одиночная загрузка
        const file = files[0];
        setFormData(prev => ({ ...prev, file }));
        
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewImages([e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const clearForm = () => {
    setFormData({
      type: 'image',
      title: '',
      author: '',
      duration: 5,
      files: []
    });
    setPreviewImages([]);
  };

  const createStory = async () => {
    try {
      setIsCreating(true);

      if (!formData.title.trim() || !formData.author.trim()) {
        alert('Please fill in all required fields');
        return;
      }

      if (formData.type === 'image') {
        // Проверяем есть ли файлы для загрузки
        const filesToUpload = formData.files && formData.files.length > 0 ? formData.files : 
                            formData.file ? [formData.file] : [];
        
        if (filesToUpload.length === 0) {
          alert('Please select at least one image file');
          return;
        }

        // Загружаем все файлы и создаем сторис для каждого
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
            reactions: []
          };

          await StoriesService.create(newStory);
        }
        
        alert(`${filesToUpload.length} ${filesToUpload.length === 1 ? 'story' : 'stories'} created successfully!`);
      } else {
        // Для текстовых и градиентных сторис создаем одну историю
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
          reactions: []
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
      return (
        <div className="space-y-4">
          {previewImages.length === 1 ? (
            <div 
              className="w-full h-full bg-cover bg-center rounded-2xl"
              style={{ backgroundImage: `url(${previewImages[0]})` }}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 text-center">
                {previewImages.length} images selected
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
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
          )}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {uploadState.uploading && (
                    <div className="mt-2 text-sm text-blue-600">
                      Uploading... {uploadState.progress}%
                    </div>
                  )}
                  {uploadState.error && (
                    <div className="mt-2 text-sm text-red-600">
                      Error: {uploadState.error}
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
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  className="w-full"
                />
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
