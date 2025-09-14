import { StoryUser, InstagramStoryItem } from '../components/InstagramStories';

// Тип для Story из API (отличается от InstagramStoryItem)
interface ApiStory {
  id: string;
  contentType: 'image' | 'video' | 'text';
  title?: string;
  textContent?: string;
  mediaUrl?: string;
  background?: {
    type: string;
    value: string;
  };
  isActive: boolean;
  expiresAt: string | Date;
  createdAt: string | Date;
  durationMs?: number;
  link?: string;
  linkText?: string;
}

// Адаптер для преобразования наших Story в формат StoryUser для Instagram Stories
export class StoriesAdapter {
  /**
   * Преобразует массив ApiStory в массив StoryUser для Instagram Stories компонента
   * Группирует истории по создателю (для демо используем одного пользователя)
   */
  static adaptStoriesToUsers(stories: ApiStory[]): StoryUser[] {
    console.log('🔍 Filtering stories:', stories.length, 'stories received');
    
    // Фильтруем только активные истории, которые не истекли
    const activeStories = stories.filter(story => {
      const now = new Date();
      const expiresAt = new Date(story.expiresAt);
      const isActive = story.isActive && expiresAt > now;
      console.log('⏰ Story expiration check:', {
        storyId: story.id,
        isActive: story.isActive,
        expiresAt: expiresAt.toISOString(),
        now: now.toISOString(),
        isNotExpired: expiresAt > now,
        finalResult: isActive
      });
      return isActive;
    });

    console.log('✅ Active stories after filtering:', activeStories.length);

    if (activeStories.length === 0) {
      console.log('❌ No active stories found');
      return [];
    }

    // Для демо создаем одного пользователя со всеми историями
    const storyUser: StoryUser = {
      id: 'sunfood_official',
      name: 'SunFood',
      avatarSource: '/images/sunfood-avatar.jpg',
      stories: activeStories.map(story => {
        // Преобразуем ApiStory в InstagramStoryItem
        console.log('🎯 Adapting story:', {
          id: story.id,
          originalDurationMs: story.durationMs,
          mappedDuration: story.durationMs || 5000,
          contentType: story.contentType
        });

        const adaptedStory: InstagramStoryItem = {
          id: story.id,
          // Важно: маппим durationMs в duration для InstagramStories
          duration: story.durationMs || 5000,
          title: story.title || '',
          mediaUrl: story.mediaUrl,
          contentType: story.contentType,
          textContent: story.textContent,
          background: story.background ? {
            type: story.background.type,
            value: story.background.value
          } : undefined,
          link: story.link,
          linkText: story.linkText
        };

        return adaptedStory;
      })
    };

    console.log('🎭 Final adapted user:', {
      userId: storyUser.id,
      storiesCount: storyUser.stories.length,
      stories: storyUser.stories.map(s => ({
        id: s.id,
        duration: s.duration,
        contentType: s.contentType
      }))
    });

    return [storyUser];
  }

  /**
   * Создает тестовые истории для разработки
   */
  static createTestStories(): StoryUser[] {
    const testStories: ApiStory[] = [
      {
        id: 'test-1',
        contentType: 'text',
        title: 'Добро пожаловать!',
        textContent: 'Попробуйте наши новые коктейли!',
        background: {
          type: 'gradient',
          value: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)'
        },
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // expires in 24h
        createdAt: new Date(),
        durationMs: 4000
      },
      {
        id: 'test-2',
        contentType: 'image',
        title: 'Новое меню!',
        mediaUrl: '/images/new-menu.jpg',
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        durationMs: 6000
      }
    ];

    return this.adaptStoriesToUsers(testStories);
  }

  /**
   * Проверяет активна ли история
   */
  static isStoryActive(story: ApiStory): boolean {
    const now = new Date();
    const expiresAt = new Date(story.expiresAt);
    return story.isActive && expiresAt > now;
  }

  /**
   * Фильтрует только активные истории
   */
  static filterActiveStories(stories: ApiStory[]): ApiStory[] {
    return stories.filter(story => this.isStoryActive(story));
  }

  /**
   * Подсчитывает количество непросмотренных историй
   */
  static getUnseenStoriesCount(stories: ApiStory[], seenStoryIds: string[] = []): number {
    const activeStories = this.filterActiveStories(stories);
    return activeStories.filter(story => !seenStoryIds.includes(story.id)).length;
  }
}
