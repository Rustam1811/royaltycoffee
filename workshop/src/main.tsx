import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { DebugOverlay } from './DebugOverlay';

const rootEl = document.getElementById('root')!;
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
    <DebugOverlay />
  </React.StrictMode>
);
