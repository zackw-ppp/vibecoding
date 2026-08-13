const CACHE_NAME = 'mise-fixture-v1'
const FIXTURE_ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/media/scallion-noodles.svg',
  '/media/step-scallions.svg',
  '/media/step-oil.svg',
  '/media/step-sauce.svg',
  '/media/step-noodles.svg',
  '/media/tomato-pasta.svg',
  '/media/step-pasta-pot.svg',
  '/media/steamed-fish.svg',
  '/media/lemon-cake.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(FIXTURE_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put('/', copy))
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          void caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
