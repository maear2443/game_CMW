const CACHE_NAME = 'totem-drop-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// 설치 - 즉시 활성화
self.addEventListener('install', (event) => {
  self.skipWaiting(); // 즉시 활성화
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache 열기');
      return cache.addAll(urlsToCache);
    })
  );
});

// 활성화 - 기존 클라이언트도 즉시 컨트롤
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all([
        // 오래된 캐시 삭제
        ...cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        }),
        // 즉시 클라이언트 컨트롤
        self.clients.claim()
      ]);
    })
  );
});

// Fetch - Stale While Revalidate 전략 (빠른 로딩 + 백그라운드 업데이트)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // JS/CSS 파일만 캐싱 (HTML은 항상 최신 유지)
          if (event.request.url.match(/\.(js|css|woff2?|png|jpg|svg)$/)) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        // 캐시가 있으면 즉시 반환하고, 백그라운드에서 업데이트
        // 캐시가 없으면 네트워크 응답 대기
        return cachedResponse || fetchPromise;
      });
    }).catch(() => {
      // 네트워크 실패 시 캐시에서 반환
      return caches.match(event.request);
    })
  );
});
