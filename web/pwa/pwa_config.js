module.exports = {

    'manifest' : `<link rel="manifest" href="/webapp/manifest.json">`,
    'serviceworker' : `
        <script type="text/javascript">
            // is service worker supported?
            if (typeof (window.BISELECTRON) === "undefined") {
                if('serviceWorker' in navigator) {
                // service worker registered
                    navigator.serviceWorker.register('/webapp/service-worker.js', { scope: '/webapp/' })
                    .then(function(registration) {
                        // console.log('service worker registered');
                    });

                    // service worker ready
                    navigator.serviceWorker.ready.then(function(registration) {
                        // console.log('service worker ready');
                    });
                }
            }
        </script>`
};