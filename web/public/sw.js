/*
 * Service worker de Yogella.
 *
 * Objectif : rendre l'application installable et utilisable hors ligne pour sa
 * coquille, sans jamais servir de données périmées.
 *
 * - les appels API et les médias ne sont jamais mis en cache ;
 * - les fichiers de /assets/ portent un nom haché, donc immuables : cache
 *   d'abord ;
 * - la navigation passe par le réseau, et ne retombe sur la coquille en cache
 *   que si le réseau est indisponible.
 */
const VERSION = 'yogella-v1'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const SHELL_URL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.add(SHELL_URL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Données et médias : toujours le réseau, jamais de copie locale.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL).then((c) => c.put(SHELL_URL, copy))
          return res
        })
        .catch(() => caches.match(SHELL_URL).then((r) => r ?? Response.error())),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(ASSETS).then((c) => c.put(request, copy))
            }
            return res
          }),
      ),
    )
  }
})
