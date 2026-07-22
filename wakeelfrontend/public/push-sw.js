/* global self */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'إشعار', body: event.data ? String(event.data.text()) : '' };
  }

  const title = data.title || 'إشعار';
  const body = data.body || '';
  const url = data.url || '/wakeel/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/wakeel/logo192.png',
      badge: '/wakeel/logo192.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/wakeel/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url && client.url.includes('/wakeel') && 'focus' in client) {
          await client.focus();
          try {
            client.navigate(url);
          } catch {
            // ignore
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});

