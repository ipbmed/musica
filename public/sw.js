/* IPB Med Música — service worker (cache básico para instalação PWA) */
const CACHE = 'ipbmed-musica-v2';
const PRECACHE = ['./manifest.webmanifest', './logo.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => self.clients.claim()),
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	// Páginas HTML: rede primeiro, para o nome/textos atualizarem
	const isPage = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
	if (isPage) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response && response.ok) {
						const copy = response.clone();
						caches.open(CACHE).then((cache) => cache.put(request, copy));
					}
					return response;
				})
				.catch(() => caches.match(request)),
		);
		return;
	}

	event.respondWith(
		caches.match(request).then((cached) => {
			const network = fetch(request)
				.then((response) => {
					if (response && response.ok && response.type === 'basic') {
						const copy = response.clone();
						caches.open(CACHE).then((cache) => cache.put(request, copy));
					}
					return response;
				})
				.catch(() => cached);

			return cached || network;
		}),
	);
});
