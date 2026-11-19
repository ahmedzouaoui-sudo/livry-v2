import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Automatic Service Worker update checks so the app updates itself seamlessly
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let hasReloadedForNewSw = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloadedForNewSw) return;
    hasReloadedForNewSw = true;
    window.location.reload();
  });

  const triggerSwUpdateCheck = () => {
    if (!navigator.onLine) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.update().catch(() => {});
        });
      })
      .catch(() => {});
  };

  window.addEventListener('load', () => {
    triggerSwUpdateCheck();
    // Periodically check for newly deployed app versions every 5 minutes
    setInterval(triggerSwUpdateCheck, 5 * 60 * 1000);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerSwUpdateCheck();
    }
  });

  window.addEventListener('online', triggerSwUpdateCheck);
}

createRoot(document.getElementById('root')!).render(<App />);
