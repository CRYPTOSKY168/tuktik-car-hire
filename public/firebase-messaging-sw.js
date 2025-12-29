// Firebase Messaging Service Worker for TukTik
// Handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDnMU-FMvfhyRn-GfAshqR37CDD7BEb3Hk",
  authDomain: "y9kwjw47a2jytykyv2mlbyok4qw47i.firebaseapp.com",
  projectId: "y9kwjw47a2jytykyv2mlbyok4qw47i",
  storageBucket: "y9kwjw47a2jytykyv2mlbyok4qw47i.firebasestorage.app",
  messagingSenderId: "270018999972",
  appId: "1:270018999972:web:a421655064b7fb6be85831"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'TukTik';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'คุณมีการแจ้งเตือนใหม่',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: payload.data?.tag || 'tuktik-notification',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: getNotificationActions(payload.data?.type),
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Define notification actions based on type
function getNotificationActions(type) {
  switch (type) {
    case 'driver_en_route':
      return [
        { action: 'call', title: 'โทรหาคนขับ', icon: '/icons/icon-72x72.png' },
        { action: 'view', title: 'ดูรายละเอียด', icon: '/icons/icon-72x72.png' },
      ];
    case 'booking_confirmed':
      return [
        { action: 'view', title: 'ดูงานจอง', icon: '/icons/icon-72x72.png' },
      ];
    case 'new_booking':
      return [
        { action: 'view', title: 'ดูงาน', icon: '/icons/icon-72x72.png' },
        { action: 'confirm', title: 'ยืนยัน', icon: '/icons/icon-72x72.png' },
      ];
    default:
      return [
        { action: 'view', title: 'ดูรายละเอียด', icon: '/icons/icon-72x72.png' },
      ];
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event.action);
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/dashboard';

  // Determine URL based on action and data
  if (event.action === 'call' && data.driverPhone) {
    targetUrl = `tel:${data.driverPhone}`;
  } else if (event.action === 'view' || event.action === 'confirm') {
    if (data.bookingId) {
      if (data.type === 'new_booking' || data.isAdmin) {
        targetUrl = `/admin/bookings?id=${data.bookingId}`;
      } else {
        targetUrl = `/confirmation?bookingId=${data.bookingId}`;
      }
    }
  }

  // Open or focus the appropriate window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.focus();
          if (targetUrl !== '/dashboard') {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle push event (fallback)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received');

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[firebase-messaging-sw.js] Push data:', data);
    } catch (e) {
      console.log('[firebase-messaging-sw.js] Push text:', event.data.text());
    }
  }
});

// Service Worker lifecycle
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(clients.claim());
});
