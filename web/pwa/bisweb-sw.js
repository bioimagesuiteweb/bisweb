console.log('swsw Hello from Bioimage Suite Web Service Worker');

let offline=false;
let count=0;

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open('bisweb').then(cache => {

            return cache.addAll([
	        'fonts/glyphicons-halflings-regular.woff',
	        'fonts/glyphicons-halflings-regular.woff2',
                'biscommon.css',
                'bislib.css',
                'bislib.js',
                'biswebdropbox.html',
                'bisweb-sw.js',
                'bootstrap.min.js',
                'bootstrap_dark_edited.css',
                'connviewer.css',
                'connviewer.html',
                'console.html',
                'dualviewer.css',
                'dualviewer.html',
                'editor.css',
                'editor.html',
                'fonts/glyphicons-halflings-regular.eot',
                'fonts/glyphicons-halflings-regular.svg',
                'fonts/glyphicons-halflings-regular.ttf',
                'images/MNI_T1_1mm_stripped_ras.nii.gz',
                'images/MNI_T1_1mm_stripped_xy.png',
                'images/MNI_T1_2mm_stripped_ras.nii.gz',
                'images/bioimagesuite.png',
                'images/bislogo.png',
                'images/bislogomed.png',
                'images/blend_xy.png',
                'images/colin_talairach_lookup_xy.png',
                'images/connviewer.png',
                'images/dualviewer.png',
                'images/editor.png',
                'images/favicon.ico',
                'images/mni2tal.png',
                'images/overlayviewer.png',
                'images/paravision.png',
                'images/sampleanat.nii.gz',
                'images/samplefunc.nii.gz',
                'images/tal2mni_lookup_xy.png',
                'images/viewer.png',
                'images/yale_broadmann_2mm_ras.nii.gz',
                'images/yale_broadmann_ras.nii.gz',
                'images/yale_brod_xy.png',
                'index.css',
                'index.html',
                'index.js',
                'jquery.min.js',
                'libbiswasm_wasm.js',
                'mni2tal.css',
                'mni2tal.html',
                'manifest.json',
                'overlayviewer.css',
                'overlayviewer.html',
                'viewer.css',
                'viewer.html',
                'webcomponents-lite.js',
                'images/gray_highres_groupncut150_right5_left1_emily_reord_new.nii.gz',
                'images/lobes_left.json',
                'images/lobes_right.json',
                'images/Reorder_Atlas.nii.gz',
                'images/shen.json',
                'images/pos_mat.txt',
                'images/neg_mat.txt',
                'https://fonts.googleapis.com/css?family=Lato:400,700,400italic',
                'https://fonts.gstatic.com/s/lato/v14/S6u9w4BMUTPHh6UVSwiPGQ.woff2',
                'https://fonts.gstatic.com/s/lato/v14/S6uyw4BMUTPHjx4wXg.woff2',
            ]).then(() => self.skipWaiting());
        })
    )
});

self.addEventListener('activate',  event => {
    event.waitUntil(self.clients.claim());
});


self.addEventListener('fetch', function(event) {

    //    count=count+1;
    //    let i=count;
    //    console.log(i,'Looking for ',event.request.url);

    let debug=false;

    
    if (offline)  {
        let t=event.request.url.split('.').pop();
        let x=event.request.url.split('/').pop();
        if (t==='html' || x.length<1 ) {
            offline=false;
            console.log('swsw We are looking for an HTML file',event.request.url);
            debug=true;
        }
    }
    
    if (offline) {
        count=count+1;
        if (count===1)
            console.log('swsw returning cached version',event.request.url);
        let res=caches.match(event.request);
        event.respondWith(res);
    } else {
        count=0;
        if (debug)
            console.log('swsw Testing to see if we have a network connection first ',event.request.url);
        try {
            event.respondWith(fetch(event.request).catch( (e) => {
                console.log('swsw Tried but no network ... returning cached version',event.request.url);
                offline=true;
                return caches.match(event.request);
            }));
        } catch(e) {
            console.log(e);
        }
    }
});
