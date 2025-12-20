// Define a cache name
const CACHE_NAME = "verdant-view-cache-v1";

// List of files to cache
const urlsToCache = [
  "/",
  "/expenses",
  "/reminders",
  "/settings",
  "/scan",
  "/manifest.json",
  // Note: We won't cache Next.js specific JS bundles by name
  // as they have hashes. We'll cache them dynamically.
];

// Install service worker
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event
self.addEventListener("fetch", (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== "GET") {
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
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data.type === "SCHEDULE_REMINDER") {
    const { title, options, schedule } = event.data.payload;
    const timeUntilNotification = schedule.at - Date.now();
    // Use Math.max to ensure non-negative delay, allowing immediate execution if time is passed/now
    const delay = Math.max(0, timeUntilNotification);

    // setTimeout has a maximum delay of 2,147,483,647ms (~24.8 days).
    // If delay exceeds this, it fires immediately.
    const MAX_TIMEOUT = 2147483647;

    if (timeUntilNotification > MAX_TIMEOUT) {
      console.log(
        `[SW] Notification for "${title}" is too far in the future (> 24 days). Scheduling deferred.`
      );
      return;
    }

    // We allow scheduling even if it's slightly in the past (handled by immediate timeout)
    // Only ignore if it is significantly in the past (e.g. > 1 min ago) which implies a logic error or stale event
    if (timeUntilNotification > -60000) {
      setTimeout(() => {
        // Enhance options with defaults if missing
        const enhancedOptions = {
          icon: "/icons/icon.svg",
          badge: "/icons/icon.svg",
          vibrate: [200, 100, 200],
          ...options,
        };
        self.registration.showNotification(title, enhancedOptions);
      }, delay);
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Handle action buttons
  if (event.action === "dismiss") {
    return;
  }

  // Open the app
  const urlToOpen = event.notification.data?.url || "/reminders";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
