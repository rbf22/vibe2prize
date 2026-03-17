const CACHE_NAME = 'grid-studio-v1';
const ASSETS = [
  './grid-template-studio.html',
  './styles/main.css',
  './src/main.js',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=Newsreader:opsz,wght@6..72,600&display=swap',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
