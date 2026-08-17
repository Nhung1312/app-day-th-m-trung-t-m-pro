self.addEventListener('install', (e) => {
    console.log('[Service Worker] Đã cài đặt thành công');
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    console.log('[Service Worker] Đã kích hoạt');
});

self.addEventListener('fetch', (e) => {
    // Phản hồi các yêu cầu mạng để trình duyệt công nhận đây là PWA hợp lệ
    e.respondWith(fetch(e.request).catch(() => {
        return new Response("Ứng dụng đang ngoại tuyến.");
    }));
});