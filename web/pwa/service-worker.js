self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('bisweb').then(cache => {

      return cache.addAll([
          '/',
	  '/fonts/glyphicons-halflings-regular.woff',
	  '/fonts/glyphicons-halflings-regular.woff2',
          '/biscommon.css',
          '/bislib.css',
          '/bislib.js',
          '/biswebdropbox.html',
          '/bootstrap.min.js',
          '/connviewer.css',
          '/connviewer.html',
          '/console.html',
          '/dualviewer.css',
          '/dualviewer.html',
          '/editor.css',
          '/editor.html',
          '/fonts/glyphicons-halflings-regular.eot',
          '/fonts/glyphicons-halflings-regular.svg',
          '/fonts/glyphicons-halflings-regular.ttf',
          '/images/MNI_T1_1mm_stripped_ras.nii.gz',
          '/images/MNI_T1_1mm_stripped_xy.png',
          '/images/MNI_T1_2mm_stripped_ras.nii.gz',
          '/images/bioimagesuite.png',
          '/images/bislogo.png',
          '/images/bislogomed.png',
          '/images/blend_xy.png',
          '/images/colin_talairach_lookup_xy.png',
          '/images/connviewer.png',
          '/images/dualviewer.png',
          '/images/editor.png',
          '/images/favicon.ico',
          '/images/mni2tal.png',
          '/images/mosaic.png',
          '/images/overlayviewer.png',
          '/images/paravision.png',
          '/images/sampleanat.nii.gz',
          '/images/samplefunc.nii.gz',
          '/images/tal2mni_lookup_xy.png',
          '/images/tools.json',
          '/images/viewer.png',
          '/images/yale_broadmann_2mm_ras.nii.gz',
          '/images/yale_broadmann_ras.nii.gz',
          '/images/yale_brod_xy.png',
          '/index.css',
          '/index.html',
          '/index.js',
          '/jquery.min.js',
          '/libbiswasm_wasm.js',
          '/mni2tal.css',
          '/mni2tal.html',
          '/overlayviewer.css',
          '/overlayviewer.html',
          '/viewer.css',
          '/viewer.html',
          '/webcomponents-lite.js',
      ])
      .then(() => self.skipWaiting());
    })
  )
});

self.addEventListener('activate',  event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(
      event.request, {
        ignoreSearch : true
      }
    ).then(response => {

      return response || fetch(event.request);
    }).catch(function(error) {
        console.log('Fetch failed; returning offline page instead.', error);
    })
  );
});
