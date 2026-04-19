// Service worker for Brainrot Clicker.
// Phase 1: registration only — enables Notification permission and lets us
// show notifications from the page even when the tab is backgrounded.
// Phase 2 (todo): handle web-push events triggered by a server (VAPID).

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// When a notification is clicked, focus an existing tab or open the game.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.includes(self.location.origin)) { c.focus(); return; }
    }
    await self.clients.openWindow(url);
  })());
});

// Future: handle real push events
self.addEventListener('push', (event) => {
  let payload = { title: 'Brainrot Clicker', body: '', url: '/' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) { /* ignore */ }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/characters/01_noobini_lovini.png',
    badge: '/characters/01_noobini_lovini.png',
    data: { url: payload.url },
    vibrate: [200, 100, 200],
  }));
});
