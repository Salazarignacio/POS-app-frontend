import './sw-filter.js';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { createHandlerBoundToURL } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Forzar la activación inmediata del service worker
self.skipWaiting();
clientsClaim();

// Precarga de assets locales del build
precacheAndRoute(self.__WB_MANIFEST || []);

cleanupOutdatedCaches();

// Soporte para navegación en SPA (Single Page Application)
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html"), {
  denylist: [/^\/chrome-extension:/, /chrome-extension/]
}));
