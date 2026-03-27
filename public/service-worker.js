const CACHE_NAME = 'nexdisplay-v4';
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Never cache OAuth routes
  if (url.pathname.startsWith('/~oauth')) return;

  // Let external CDNs (fonts, etc.) bypass the SW entirely
  if (url.hostname !== self.location.hostname) return;

  // API / Supabase calls: network-first
  if (url.pathname.startsWith('/rest/') || url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (JS/CSS/fonts/images): stale-while-revalidate
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Navigation: network-first, fallback to cache, then /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/offline'))
      )
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((cached) => cached || new Response('', { status: 408 }))
    )
  );
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ==============================================================
// ADVANCED PWA FEATURES
// ==============================================================

// Background Sync Handler
self.addEventListener('sync', (event) => {
  console.log(`[SW] Background sync event: ${event.tag}`);

  if (event.tag === 'sync-widgets') {
    event.waitUntil(
      (async () => {
        try {
          // Get auth token from storage
          const session = localStorage.getItem('auth_token') || '';

          const response = await fetch('/functions/v1/sync-widgets', {
            headers: {
              'Authorization': `Bearer ${session}`,
              'X-Background-Sync': 'true',
            }
          });

          if (response.ok) {
            const data = await response.json();
            // Notify all clients
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'WIDGETS_SYNCED',
                data: data.data,
              });
            });
            console.log('[SW] Widgets synced:', data.count);
          }
        } catch (err) {
          console.error('[SW] Widget sync failed:', err);
          throw err;
        }
      })()
    );
  } else if (event.tag === 'sync-units') {
    event.waitUntil(
      (async () => {
        try {
          const session = localStorage.getItem('auth_token') || '';

          const response = await fetch('/functions/v1/sync-units', {
            headers: {
              'Authorization': `Bearer ${session}`,
              'X-Background-Sync': 'true',
            }
          });

          if (response.ok) {
            const data = await response.json();
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'UNITS_SYNCED',
                data: data.data,
              });
            });
            console.log('[SW] Units synced:', data.count);
          }
        } catch (err) {
          console.error('[SW] Unit sync failed:', err);
          throw err;
        }
      })()
    );
  }
});

// Periodic Background Sync Handler
self.addEventListener('periodicsync', (event) => {
  console.log(`[SW] Periodic sync event: ${event.tag}`);

  if (event.tag === 'sync-widgets') {
    event.waitUntil(
      (async () => {
        try {
          const response = await fetch('/api/widgets');
          if (response.ok) {
            // Notify clients of update
            const data = await response.json();
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'WIDGETS_UPDATED',
                data: data
              });
            });
          }
        } catch (err) {
          console.error('[SW] Periodic widget sync failed:', err);
        }
      })()
    );
  } else if (event.tag === 'sync-units') {
    event.waitUntil(
      (async () => {
        try {
          const response = await fetch('/api/units');
          if (response.ok) {
            const data = await response.json();
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({
                type: 'UNITS_UPDATED',
                data: data
              });
            });
          }
        } catch (err) {
          console.error('[SW] Periodic unit sync failed:', err);
        }
      })()
    );
  }
});

// Push Notification Handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  let notificationData = {
    title: 'NEXDISPLAY Notificação',
    options: {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData.title = data.title || notificationData.title;
      notificationData.options = {
        ...notificationData.options,
        body: data.body,
        tag: data.tag || 'nexdisplay-notification',
        data: data.data || {},
      };
    } catch (err) {
      notificationData.options.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title,
      notificationData.options
    )
  );
});

// Push Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);

  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Check if app is already open
      for (let i = 0; i < clients.length; i++) {
        if (clients[i].url === targetUrl && 'focus' in clients[i]) {
          return clients[i].focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
