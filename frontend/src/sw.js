import { precacheAndRoute } from 'workbox-precaching';

// Workbox injetará a lista de arquivos para cachear aqui
precacheAndRoute(self.__WB_MANIFEST || []);

// Escuta evento de Push Notification
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const notificationData = data.notification || data;

  const title = notificationData.title || 'Claudio Gestão';
  const options = {
    body: notificationData.body || 'Novo prazo ou vencimento registrado.',
    icon: notificationData.icon || '/favicon.svg',
    badge: notificationData.badge || '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: notificationData.data?.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Evento de clique na notificação para abrir a URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já houver uma janela aberta, foca nela
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
