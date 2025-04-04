const CACHE_NAME = 'flappybird-cache-v1';
const urlsToCache = [
  './index.html',
  './game.js',
  './manifest.json',
  './service-worker.js',
  'img/bg.png',
  'img/pipeTop.png',
  'img/pipeBottom.png',
  'img/ground.png',
  'img/start.png',
  'img/gameover.png',
  'img/score/0.png',
  'img/score/1.png',
  'img/score/2.png',
  'img/score/3.png',
  'img/score/4.png',
  'img/score/5.png',
  'img/score/6.png',
  'img/score/7.png',
  'img/score/8.png',
  'img/score/9.png',
  'img/bird/0.png',
  'img/bird/1.png',
  'img/bird/2.png',
  'img/bird/3.png',
  'img/bird/4.png',
  'img/bird/5.png',
  'img/bird/6.png',
  'img/bird/7.png',
  'sounds/9999.mp3',
  'sounds/jump.mp3',
  'sounds/death.wav',
  'sounds/0000.wav'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
