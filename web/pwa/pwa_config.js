module.exports = {

    'manifest' : `<link rel="manifest" href="/webapp/manifest.json">`,
    'serviceworker' : `
        <script type="text/javascript">
            if (typeof (window.BISELECTRON) === "undefined") {
            // is service worker supported?
                if('serviceWorker' in navigator) {
                // service worker registered
                    navigator.serviceWorker.register('/webapp/bisweb-sw.js', { scope: '/webapp/' })
                    .then(function(registration) {
                        console.log('____ bisweb -- service worker registered');
                    });

                    // service worker ready
                    navigator.serviceWorker.ready.then(function(registration) {
                        console.log('____ bisweb -- service worker ready');
                    });
                }
            }
        </script>`
};
