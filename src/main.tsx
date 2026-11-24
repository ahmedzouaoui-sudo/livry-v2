import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

if (typeof window !== 'undefined') {
  // Clean up cache-busting query param after a forced hard refresh
  try {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has('_upd')) {
      currentUrl.searchParams.delete('_upd');
      window.history.replaceState({}, '', currentUrl.toString());
    }
  } catch {
    // Ignore history API errors
  }

  const notifyOutdatedVersion = (reason: string) => {
    window.dispatchEvent(
      new CustomEvent('livry:version-outdated', {
        detail: { reason },
      })
    );
  };

  // Immediately lock app if a lazy-loaded Vite chunk fails due to stale deployment
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    notifyOutdatedVersion('preload_error');
  });

  if ('serviceWorker' in navigator) {
    const hadControllerAtBoot = Boolean(navigator.serviceWorker.controller);
    const observedRegistrations = new WeakSet<ServiceWorkerRegistration>();

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadControllerAtBoot) {
        notifyOutdatedVersion('sw_waiting');
      }
    });

    const triggerSwUpdateCheck = () => {
      if (!navigator.onLine) return;
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            if (registration.waiting && navigator.serviceWorker.controller) {
              notifyOutdatedVersion('sw_waiting');
            }
            if (!observedRegistrations.has(registration)) {
              observedRegistrations.add(registration);
              registration.addEventListener('updatefound', () => {
                const installingWorker = registration.installing;
                if (!installingWorker) return;
                installingWorker.addEventListener('statechange', () => {
                  if (
                    installingWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    notifyOutdatedVersion('sw_waiting');
                  }
                });
              });
            }
            registration.update().catch(() => {});
          });
        })
        .catch(() => {});
    };

    window.addEventListener('load', () => {
      triggerSwUpdateCheck();
      window.setInterval(triggerSwUpdateCheck, 30 * 1000);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        triggerSwUpdateCheck();
      }
    });

    window.addEventListener('focus', triggerSwUpdateCheck);
    window.addEventListener('online', triggerSwUpdateCheck);
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
