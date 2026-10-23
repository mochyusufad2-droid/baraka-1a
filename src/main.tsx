import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initIndexedDB } from './utils/participantOfflineManager';

// Register Service Worker for offline PWA caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

// Warm up IndexedDB
initIndexedDB().catch((err) => {
  console.warn('[OfflineDB] IndexedDB initialization warning:', err);
});

createRoot(document.getElementById('root')!).render(<App />);
