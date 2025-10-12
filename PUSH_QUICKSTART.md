# 🚀 Quick Start: Web Push Integration

## Для нового App.tsx (если еще не интегрировано)

```tsx
import React, { useEffect } from 'react';
import { useAuth } from './auth/AuthContext';
import { 
  NotificationSubscribe,
  useNotificationPrompt,
  listenToForegroundMessages,
  showForegroundNotification,
  playNotificationSound
} from '@/features/notifications';

function App() {
  const { user } = useAuth();
  const { shouldShow, dismiss, markAsShown } = useNotificationPrompt(user?.uid);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = listenToForegroundMessages((payload) => {
      if (payload.notification) {
        showForegroundNotification(
          payload.notification.title || 'SunfoodApp',
          {
            body: payload.notification.body,
            data: payload.data
          }
        );
        
        // Play sound (only works after user interaction)
        playNotificationSound();
      }
    });

    return unsubscribe || undefined;
  }, [user?.uid]);

  return (
    <div>
      {/* Your app routes */}
      
      {shouldShow && user?.uid && (
        <NotificationSubscribe
          userId={user.uid}
          onClose={dismiss}
          onEnabled={markAsShown}
        />
      )}
    </div>
  );
}
```

## Deploy Steps

```bash
# 1. Install dependencies
cd functions
npm install

# 2. Build functions
npm run build

# 3. Deploy everything
firebase deploy --only functions,firestore:rules,hosting

# 4. Verify
firebase functions:list
```

## Test Checklist

- [ ] Admin получает уведомление при создании заказа
- [ ] Клиент получает уведомление при принятии заказа
- [ ] Модалка появляется через 3 секунды после входа
- [ ] Звук воспроизводится (на Android/iOS)
- [ ] Вибрация работает (на поддерживаемых устройствах)
- [ ] requireInteraction работает (уведомление не закрывается)

## Next Steps

1. Добавь `public/notify.mp3` для foreground sound
2. Настрой VAPID key в `.env`
3. Добавь домены в Firebase Console
4. Deploy и тестируй!

Полная документация: `README_PUSH.md`
