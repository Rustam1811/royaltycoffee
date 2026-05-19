import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tailwind.css';

const container = document.getElementById('root') as HTMLElement;

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(new URL('./sw.ts', import.meta.url), { type: 'module' })
      .catch(() => undefined);
  });
}

