import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { createHandlerBoundToURL } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Forzar la activación inmediata del service worker
self.skipWaiting();
clientsClaim();

// Detener la propagación de eventos fetch para protocolos no soportados (como chrome-extension://)
// Esto evita que Workbox intente cachearlos y lance el error 'Request scheme chrome-extension is unsupported'
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) {
    event.stopImmediatePropagation();
  }
});

// Precarga de assets locales del build
precacheAndRoute(self.__WB_MANIFEST || []);

cleanupOutdatedCaches();

// Soporte para navegación en SPA (Single Page Application)
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html"), {
  denylist: [/^\/chrome-extension:/, /chrome-extension/]
}));
