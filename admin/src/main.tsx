import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { UserProvider } from '@/contexts/UserContext';
import { BrowserRouter } from 'react-router-dom';
import './i18n'; // Инициализация i18n для клиентского меню
import './styles/admin-theme.css'; // Стили админки в стиле клиентской части

console.log('[ENV]', import.meta.env.VITE_API_BASE);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UserProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </UserProvider>
  </React.StrictMode>,
);
