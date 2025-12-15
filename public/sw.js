// Define a cache name
const CACHE_NAME = 'verdant-view-cache-v1';

// List of files to cache
const urlsToCache = [
  '/',
  '/expenses',
  '/reminders',
  '/settings',
  '/scan',
  '/manifest.json'
  // Note: We won't cache Next.js specific JS bundles by name
  // as they have hashes. We'll cache them dynamically.
];

// Install service worker
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Try to get the resource from the cache.
      const cachedResponse = await cache.match(event.request);
      // And fetch the resource from the network.
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // If we got a valid response, clone it and cache it.
        if (networkResponse && networkResponse.status === 200) {
            // We only cache app-served resources, not external ones
            if (event.request.url.startsWith(self.location.origin)) {
                 cache.put(event.request, networkResponse.clone());
            }
        }
        return networkResponse;
      });

      // Return the cached response if we have one, otherwise wait for the network.
      return cachedResponse || fetchPromise;
    })
  );
});


// Activate event
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});


self.addEventListener('message', event => {
    if (event.data.type === 'SCHEDULE_REMINDER') {
        const { title, options, schedule } = event.data.payload;
        const timeUntilNotification = schedule.at - Date.now();
        
        if (timeUntilNotification > 0) {
            setTimeout(() => {
                self.registration.showNotification(title, options);
            }, timeUntilNotification);
        }
    }
});
