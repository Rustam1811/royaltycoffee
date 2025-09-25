// ✅ Продакшн-готовый StoryManagement с Firebase Functions
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  PhotoIcon, 
  VideoCameraIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { SimpleFileUploader } from '@/components/SimpleFileUploader';
import { ApiService } from '@/services/apiConfig';

interface Story {
  id: string;
  title: string;
  content: {
    type: 'image' | 'video' | 'text';
    url?: string;
    text?: string;
    backgroundColor?: string;
  };
  duration: number;
  linkUrl?: string;
  linkText?: string;
  isActive: boolean;
  viewCount: number;
  createdAt: string | number | Date;
}

const StoryManagement: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image: '',
    video: '',
    type: 'text' as 'image' | 'video' | 'text',
    duration: 5,
    linkUrl: '',
    linkText: '',
    isActive: true
  });

  const storyTypes = [
    { value: 'text', label: 'Текст', icon: PencilIcon },
    { value: 'image', label: 'Фото', icon: PhotoIcon },
    { value: 'video', label: 'Видео', icon: VideoCameraIcon }
  ];

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    setLoading(true);
    try {
      const data = await ApiService.stories.getAll();
      setStories(data);
    } catch (error) {
      console.error('Ошибка загрузки сторисов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Map local formData to API shape
      const contentType = formData.type;
      const mediaUrl = contentType === 'image' ? formData.image : contentType === 'video' ? formData.video : undefined;
      const textContent = contentType === 'text' ? formData.content : undefined;
      const background = contentType === 'text' ? { type: 'color' as const, value: '#6366F1' } : undefined;

      const body = {
        title: formData.title,
        contentType,
        mediaUrl,
        textContent,
        background,
        duration: formData.duration,
        link: formData.linkUrl || undefined,
        linkText: formData.linkText || undefined,
        publishAt: new Date().toISOString(),
      };

      if (editingStory) {
        await ApiService.stories.update(editingStory.id, body);
      } else {
        await ApiService.stories.create(body);
      }

      await fetchStories();
      reset();
    } catch (error) {
      console.error('Ошибка сохранения сториса:', error);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFormData({ 
      title: '', 
      content: '', 
      image: '', 
      video: '', 
      type: 'text', 
      duration: 5, 
      linkUrl: '', 
      linkText: '', 
      isActive: true 
    });
    setEditingStory(null);
    setShowModal(false);
  };

  const handleEdit = (story: Story) => {
    setEditingStory(story);
    setFormData({
      title: story.title,
      content: story.content.text || '',
      image: story.content.type === 'image' ? story.content.url || '' : '',
      video: story.content.type === 'video' ? story.content.url || '' : '',
      type: story.content.type,
      duration: story.duration,
      linkUrl: story.linkUrl || '',
      linkText: story.linkText || '',
      isActive: story.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить сторис?')) return;
    
    setLoading(true);
    try {
      await ApiService.stories.delete(id);
      await fetchStories();
    } catch (error) {
      console.error('Ошибка удаления сториса:', error);
    } finally {
      setLoading(false);
    }
  };

  const isStoryActive = (story: Story) => {
    if (!story.isActive) return false;
    // Проверяем, не истёк ли срок действия (24 часа)
    const createdAt = new Date(story.createdAt);
    const now = new Date();
    const hoursPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursPassed < 24;
  };

  const getTimeLeft = (story: Story) => {
    const createdAt = new Date(story.createdAt);
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Истёк';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}ч ${minutes}м`;
    return `${minutes}м`;
  };

  const formatDate = (timestamp: string | number | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="-mx-6 px-6 py-4 bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)]/80 backdrop-blur-md shadow-card"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-3 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold text-white font-[var(--font-family-heading)]">Управление сторисами</h1>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="px-5 py-3 rounded-2xl text-[var(--color-accent-orange)] bg-white/90 hover:bg-white transition shadow-card"
          >
            <span className="inline-flex items-center gap-2 font-semibold">
              <PlusIcon className="w-5 h-5" /> Новый сторис
            </span>
          </motion.button>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto p-6">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--color-accent-orange)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {!loading && stories.length === 0 && (
          <div className="text-center py-16 bg-[var(--color-bg-elevated)] rounded-2xl shadow-card border border-[var(--color-border)]">
            <div className="text-[var(--color-text-secondary)] text-lg mb-4">Нет созданных сторисов</div>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)] text-white font-semibold shadow-card"
            >
              Создать первый сторис
            </button>
          </div>
        )}

        {/* Список сторисов */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
          {stories.map((story) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--color-bg-elevated)] rounded-2xl shadow-card border border-[var(--color-border)] overflow-hidden"
            >
              {/* Превью */}
              <div className="h-64 bg-[var(--color-bg-hover)] relative">
                {story.content.type === 'image' && story.content.url ? (
                  <img 
                    src={story.content.url} 
                    alt={story.title}
                    className="w-full h-full object-cover"
                  />
                ) : story.content.type === 'video' && story.content.url ? (
                  <video 
                    src={story.content.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-accent-orange)] to-[var(--color-accent-pink)]">
                    <div className="text-center text-white p-4">
                      <h3 className="font-bold text-lg mb-2">{story.title}</h3>
                      <p className="text-sm opacity-90">{story.content.text}</p>
                    </div>
                  </div>
                )}

                {/* Кнопки управления */}
                <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(story)}
                      className="bg-white text-blue-600 hover:text-blue-800 p-2 rounded-full shadow-card"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(story.id)}
                      className="bg-white text-red-600 hover:text-red-800 p-2 rounded-full shadow-card"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Статус */}
                <div className="absolute top-3 left-3">
                  {isStoryActive(story) ? (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)] text-white">
                      Активен
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                      Неактивен
                    </span>
                  )}
                </div>

                {/* Тип контента */}
                <div className="absolute top-3 right-3">
                  {story.content.type === 'image' && <PhotoIcon className="w-6 h-6 text-white" />}
                  {story.content.type === 'video' && <VideoCameraIcon className="w-6 h-6 text-white" />}
                  {story.content.type === 'text' && <PencilIcon className="w-6 h-6 text-white" />}
                </div>
              </div>

              {/* Информация */}
              <div className="p-4">
                <h3 className="font-semibold text-lg text-[var(--color-text-primary)] mb-2 truncate">{story.title}</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Просмотры:</span>
                    <div className="flex items-center gap-1">
                      <EyeIcon className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      <span className="text-[var(--color-text-primary)]">{story.viewCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Длительность:</span>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      <span className="text-[var(--color-text-primary)]">{story.duration}с</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Осталось:</span>
                    <span className={`font-semibold ${
                      isStoryActive(story) ? 'text-[var(--color-accent-orange)]' : 'text-red-600'
                    }`}>
                      {getTimeLeft(story)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      Создан: {formatDate(story.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Модальное окно создания/редактирования */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-card"
          >
            <h2 className="text-2xl font-bold mb-6 text-[var(--color-text-primary)] font-[var(--font-family-heading)]">
              {editingStory ? 'Редактировать сторис' : 'Новый сторис'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Заголовок
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Тип контента
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {storyTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({...formData, type: type.value as 'image' | 'video' | 'text'})}
                      className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center gap-2 ${
                        formData.type === type.value
                          ? 'border-[var(--color-accent-orange)] bg-[color-mix(in_oklab,var(--color-accent-orange)_10%,transparent)] text-[var(--color-text-primary)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-accent-orange)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      <type.icon className="w-6 h-6" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Контент
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]"
                  rows={3}
                  required
                />
              </div>

              {formData.type === 'image' && (
                <SimpleFileUploader
                  onFileUpload={(url) => setFormData({...formData, image: url})}
                  currentUrl={formData.image}
                  label="Изображение истории"
                  maxSize={5}
                  allowVideo={false}
                />
              )}

              {formData.type === 'video' && (
                <SimpleFileUploader
                  onFileUpload={(url) => setFormData({...formData, video: url})}
                  currentUrl={formData.video}
                  label="Видео истории"
                  maxSize={50}
                  allowVideo={true}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Длительность показа (секунды)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 5})}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]"
                  min="1"
                  max="30"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Ссылка для перехода
                  </label>
                  <input
                    type="url"
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({...formData, linkUrl: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    Текст кнопки
                  </label>
                  <input
                    type="text"
                    value={formData.linkText}
                    onChange={(e) => setFormData({...formData, linkText: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-orange)]"
                    placeholder="Подробнее"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveStory"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="accent-[var(--color-accent-orange)]"
                />
                <label htmlFor="isActiveStory" className="text-sm text-[var(--color-text-secondary)]">
                  Активен (автоматически истекает через 24 часа)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 px-4 py-2 rounded-2xl bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[color-mix(in_oklab,var(--color-bg-hover)_80%,white)] transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-2xl bg-gradient-to-r from-[var(--color-accent-orange)] to-[var(--color-accent-pink)] text-white font-semibold shadow-card disabled:opacity-60"
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StoryManagement;
