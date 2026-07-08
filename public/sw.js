const CACHE_NAME = 'wms-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon.jpg'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Cache-First for assets, Stale-While-Revalidate for API)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and same-origin requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isApiRequest = url.pathname.startsWith('/api/');

  if (isApiRequest) {
    // 1. Stale-While-Revalidate Strategy for APIs
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('API fetch failed, utilizing cached fallback if available:', err);
            if (cachedResponse) return cachedResponse;
            throw err;
          });

        return cachedResponse || fetchPromise;
      })
    );
  } else {
    // 2. Cache-First Strategy for Static Assets (with background update)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Asynchronously update asset cache in the background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            // If HTML request fails and not cached, return home fallback
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/');
            }
            throw err;
          });
      })
    );
  }
});

// Periodic background worker: checks inventory every hour and triggers Web Notifications when low stock is found
async function checkInventoryStock() {
  try {
    const response = await fetch('/api/sync/pull');
    if (!response.ok) throw new Error('Failed to pull sync data in background');
    const data = await response.json();
    if (data && Array.isArray(data.items) && Array.isArray(data.movements)) {
      const items = data.items;
      const movements = data.movements;
      
      const lowStockItems = [];
      for (const item of items) {
        const inward = movements
          .filter(m => m.itemId === item.id && m.type === 'in')
          .reduce((sum, m) => sum + m.quantity, 0);
        const outward = movements
          .filter(m => m.itemId === item.id && m.type === 'out')
          .reduce((sum, m) => sum + m.quantity, 0);
        const balance = inward - outward;
        
        if (balance < (item.safetyLimit || 0)) {
          lowStockItems.push({ name: item.name, balance, limit: item.safetyLimit });
        }
      }
      
      if (lowStockItems.length > 0) {
        const names = lowStockItems.map(i => `${i.name} (المتبقي: ${i.balance})`).slice(0, 3).join('، ');
        const suffix = lowStockItems.length > 3 ? ` و ${lowStockItems.length - 3} أصناف أخرى` : '';
        
        // Ensure permission is granted in the background context
        if (self.registration && self.Notification && self.Notification.permission === 'granted') {
          self.registration.showNotification('تنبيه المخزون الحرج ⚠️', {
            body: `الأصناف التالية تحت حد الأمان: ${names}${suffix}`,
            icon: '/icon.svg',
            badge: '/icon.svg',
            vibrate: [200, 100, 200],
            data: { url: '/' }
          });
        }
      }
    }
  } catch (err) {
    console.error('Background stock check failed:', err);
  }
}

// Check on activate, then every 1 hour (3600000 ms)
setTimeout(() => {
  checkInventoryStock();
  setInterval(checkInventoryStock, 3600000);
}, 10000);

// Listen for manual trigger message to test notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_STOCK_NOW') {
    checkInventoryStock();
  }
});

// Handle notification click: open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
