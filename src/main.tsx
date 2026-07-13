import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for offline support with automatic updates check
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered successfully:', reg.scope);
        
        // Periodically check for updates in the background (every 5 minutes)
        setInterval(() => {
          reg.update().then(() => {
            console.log('Checked for service worker updates in background.');
          }).catch(err => {
            console.warn('Background update check failed:', err);
          });
        }, 300000);
      })
      .catch((err) => console.error('Service Worker registration failed:', err));
  });

  // Automatically reload page when new service worker takes control (automatic update)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
