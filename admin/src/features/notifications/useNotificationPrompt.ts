import { useState, useEffect } from 'react';

const REMIND_AFTER_DAYS = 7;
const STORAGE_KEY = 'notificationPromptDismissed';

export function useNotificationPrompt(isAuthenticated: boolean, hasNotificationsEnabled: boolean) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || hasNotificationsEnabled) {
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'denied' || Notification.permission === 'granted') {
      return;
    }

    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < REMIND_AFTER_DAYS) {
        return;
      }
    }

    const timer = setTimeout(() => {
      setShouldShow(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, hasNotificationsEnabled]);

  const dismiss = () => {
    setShouldShow(false);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  return { shouldShow, dismiss };
}
