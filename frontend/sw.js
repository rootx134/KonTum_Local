/**
 * sw.js — Service Worker for PWA (Caching & Web Push Notifications)
 * Đặt tại root directory: /sw.js
 */

const CACHE_NAME = 'kontum-plus-v5';
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/css/styles.css',
    '/assets/js/app.js',
    '/assets/js/feed.js',
    '/assets/js/place.js',
    '/assets/js/review.js',
    '/assets/js/profile.js',
    '/assets/js/map.js',
    'https://fc.kontumplus.com/favicon.png'
];

// Cài đặt Service Worker và Cache assets
self.addEventListener('install', event => {
    console.log('[SW] Installed');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching assets');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Kích hoạt và dọn dẹp cache cũ
self.addEventListener('activate', event => {
    console.log('[SW] Activated');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            );
        })
    );
    event.waitUntil(clients.claim());
});

// Fetch dữ liệu từ mạng (Network First, fallback về Cache)
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        fetch(event.request).then(fetchRes => {
            return caches.open(CACHE_NAME).then(cache => {
                // Không cache các request API hoặc analytics
                if (event.request.url.startsWith(self.location.origin) && !event.request.url.includes('/api/')) {
                    cache.put(event.request.url, fetchRes.clone());
                }
                return fetchRes;
            });
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});

// Lắng nghe Push Notification từ server
self.addEventListener('push', event => {
    let payload = { title: 'Kon Tum Local', body: 'Bạn có thông báo mới!', icon: 'https://fc.kontumplus.com/favicon.png' };

    try {
        if (event.data) {
            const data = event.data.json();
            payload = { ...payload, ...data };
        }
    } catch (e) {
        payload.body = event.data ? event.data.text() : 'Thông báo mới';
    }

    const options = {
        body: payload.body,
        icon: payload.icon || 'https://fc.kontumplus.com/favicon.png',
        badge: 'https://fc.kontumplus.com/favicon.png',
        vibrate: [200, 100, 200],
        data: { url: payload.url || '/' },
        actions: [
            { action: 'view', title: 'Xem ngay' },
            { action: 'dismiss', title: 'Bỏ qua' },
        ],
        tag: payload.tag || 'kontum-notif',
        renotify: true,
        requireInteraction: false,
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

// Xử lý khi user click vào notification
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});
