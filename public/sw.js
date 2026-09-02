// Service worker minimal untuk Nafilah POS.
// Fungsinya cuma supaya browser (terutama Chrome di Android) mengizinkan
// menampilkan notifikasi asli lewat registration.showNotification() —
// ini lebih andal dibanding `new Notification()` langsung dari halaman,
// yang di banyak browser Android tidak akan muncul tanpa service worker.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Kalau notifikasi di-tap, buka/fokuskan tab aplikasi yang sudah terbuka,
// atau buka tab baru ke halaman Antrian kalau belum ada yang terbuka.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => 'focus' in c);
      if (existing) return existing.focus();
      if (self.clients.openWindow) return self.clients.openWindow('/antrian');
    })
  );
});
