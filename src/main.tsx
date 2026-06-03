import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';

// Global handler: if a lazy-loaded chunk fails (stale deploy), hard-reload once.
// This catches both Vite preload errors and dynamic import failures.
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});
window.addEventListener('error', (e) => {
  // ResizeObserver loop ошибки безобидны, но крашат на старых WebView (Huawei/Xiaomi)
  if (e.message?.includes('ResizeObserver loop') ||
      e.message?.includes('ResizeObserver loop completed with undelivered notifications')) {
    e.stopImmediatePropagation();
    return;
  }
  if (e.message?.includes('Failed to fetch dynamically imported module') ||
      e.message?.includes('Importing a module script failed')) {
    window.location.reload();
  }
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || String(e.reason || '');
  if (msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('error loading dynamically imported module')) {
    window.location.reload();
    return;
  }
  // Не валим приложение из-за неважных промисов (Firebase Messaging, network blips и т.п.)
  if (msg.includes('messaging/') ||
      msg.includes('FirebaseError') ||
      msg.includes('NetworkError') ||
      msg.includes('Failed to fetch')) {
    e.preventDefault();
    console.warn('[unhandledrejection suppressed]', msg);
  }
});

// Fade out splash screen before React mounts
const splash = document.getElementById('splash');
if (splash) {
  splash.style.transition = 'opacity .3s ease-out';
  splash.style.opacity = '0';
  setTimeout(() => splash.remove(), 300);
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);