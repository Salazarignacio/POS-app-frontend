// Detener la propagación de eventos fetch para protocolos no soportados (como chrome-extension://)
// Registrado al inicio para asegurar precedencia antes de que se cargue Workbox
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) {
    event.stopImmediatePropagation();
  }
});
