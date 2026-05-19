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