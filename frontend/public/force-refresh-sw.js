// Force cache bypass service worker
self.addEventListener('install', function(event) {
  console.log('🚀 CACHE-BYPASS SERVICE WORKER INSTALLED');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('✅ CACHE-BYPASS SERVICE WORKER ACTIVATED');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('🗑️ Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('💥 ALL CACHES CLEARED - FORCING FRESH LOAD');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Force fresh fetch for all requests
  event.respondWith(
    fetch(event.request.url + '?cachebust=' + Date.now(), {
      cache: 'no-store'
    }).catch(function() {
      return fetch(event.request);
    })
  );
});