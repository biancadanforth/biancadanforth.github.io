// based on: https://serviceworke.rs/strategy-network-or-cache_service-worker_doc.html

let CACHE = 'network-first';

self.addEventListener('install', function(evt) {
  console.log('The service worker is being installed.');
  evt.waitUntil(precache());
});

self.addEventListener('fetch', function(evt) {
  console.log('The service worker is serving the asset.');
  evt.respondWith(fromNetwork(evt.request, 400)
    .catch(function() {
      return fromCache(evt.request);
    }));
});

self.addEventListener('activate', function() {

});

function precache() {
  return caches.open(CACHE).then(function(cache) {
    console.log('Opened cache');
    return cache.addAll([
      'third-party-doc.html'
      ]);
  });
}

function fromNetwork(request, timeout) {
  return new Promise(function(fulfill, reject) {
    const timeoutId = setTimeout(reject, timeout);
    fetch(request).then(function(response) {
      clearTimeout(timeoutId);
      fulfill(response);
    }, reject);
  });
}

function fromCache(request) {
  return caches.open(CACHE).then(function(cache) {
    return cache.match(request).then(function(matching) {
      return matching || Promise.reject('no-match');
    });
  });
}