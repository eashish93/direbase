'use client';

import { useEffect } from 'react';
import useAuth, { AuthProvider } from '@/lib/hooks/useAuth';

export default function Providers({ children }: { children: React.ReactNode }) {
  // register service worker.
  useEffect(() => {
    // register service worker. No need to check for support as > 96% browsers support it.
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => {
        console.log('Service worker registered: ', reg.scope);
        if (reg.waiting) {
          // case when new service detected but in waiting mode, we send message which will be captured by sw.js
          // to immediately called skip waiting.
          console.log('New sw waiting to register');
          reg.waiting.postMessage('SKIP_WAITING');
        }
      },
      (err) => {
        console.error('Service worker registration failed: ', err);
      }
    );
  }, []);

  return (
    <>
      <AuthProvider>
        {children}
      </AuthProvider>
    </>
  );
}
