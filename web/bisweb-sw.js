const idb=require('idb-keyval');

// idb-store has a key 'mode' with three values
// online  -- no cache
// offline -- can download
// offline-complete -- has downloaded

// --------- First Configuration Info --------------------
const internal =  {
    cachelist : require('./pwa/pwacache.js'),
    name : 'bisweb',
    path : self.location.href.substr(0,self.location.href.lastIndexOf('/')),
    updating : false,
    count : 0,
    maxcount : 0,
    webfirst : true,
};


internal.pathlength=internal.path.length;
// ------------------- Utility Functions -----------------

let cleanCache=function() {
    console.log('bisweb-sw: Cleaning cache',internal.name);
    let p=[];
    internal.webfirst=true;
    return new Promise( (resolve,reject) => {
        idb.set('mode','online').then( () => {
            caches.open(internal.name).then(cache => {
                cache.keys().then( (keys) => {
                    console.log('bisweb-sw: Removing',keys.length,'files');
                    for (let i=0;i<keys.length;i++) {
                        p.push(cache.delete(keys[i]));
                    }
                });
                Promise.all(p).then( ()=> {
                    cache.keys().then( (keys) => {
                        console.log('bisweb-sw: Cache deleted files left=', keys.length);
                        resolve();
                    });
                });
            });
        }).catch( (e) => {
            reject(e);
        });
    });
};

let populateCache=function(msg="Cache Updated") {

    let lst=internal.cachelist['web'].concat(internal.cachelist['cache']);
    console.log(`bisweb-sw: Beginning to  install (cache) ${lst.length} files`);

    let newlst = [ internal.path ];
    for (let i=0;i<lst.length;i++) {
        let item=lst[i];
        newlst.push(item);
    }
    
    return caches.open(internal.name).then(cache => {

        internal.count=0;
        internal.maxcount=newlst.length;

        let t= new Date().getTime()
        let p=[];
        
        for (let i=0;i<newlst.length;i++) {
            let url=newlst[i];
            let url2=`${url}?t=${t}`;
            p.push(new Promise( (resolve,reject) => {
                fetch(url2).then(function(response) {
                    if (!response.ok) {
                        throw new TypeError('bad response status');
                    }
                    cache.put(url, response).then( () => {
                        internal.count=internal.count+1;
                        resolve();
                        send_message_to_all_clients(`Updating Cache: Downloaded file ${internal.count}/${internal.maxcount}`);
                    }).catch( (e) => {
                        internal.updating=false;
                        reject(e); });
                });
            }));
        }
        

        Promise.all(p).then( () => {
            internal.updating=false;
            console.log('bisweb-sw: Installation (caching) successful');
            idb.set('mode','offline-complete').then( () => {
                internal.webfirst=false;
                send_message_to_all_clients(msg);
                self.skipWaiting()
            });
        });
    });
};


// ----------------- Messaging Functions -----------------

let send_message_to_client=function(client, msg){
    return new Promise(function(resolve, reject){
        var msg_chan = new MessageChannel();

        msg_chan.port1.onmessage = function(event){
            if(event.data.error){
                reject(event.data.error);
            }else{
                resolve(event.data);
            }
        };
        client.postMessage(msg, [msg_chan.port2]);
    });
};

let send_message_to_all_clients=function(msg){
    clients.matchAll().then(clients => {
        clients.forEach(client => {
            send_message_to_client(client, msg).then(m => console.log("bisweb-sw: Received Message: "+m));
        })
    })
};


// ----------------- Event Handling ----------------------


// -------------------------
// Message from Client
// -------------------------
self.addEventListener('message', (msg) => {
    
    console.log('bisweb-sw: Received message=',msg.data, ' webfirst=',internal.webfirst);
    
    try {
        let obj=JSON.parse(msg.data);
        let name=obj.name;
        let data=obj.data;
        console.log(`bisweb-sw: Received ${name}:${data}`);
        if (name==="updateCache") {
            if (internal.updating===false) {
                internal.updating=true;
                populateCache('Cache Updated');
            } else {
                console.log('bisweb-sw: Already updating cache');
            }
        } else if (name==="clearCache") {
            cleanCache().then( () => { send_message_to_all_clients(`Cleaned Cache. Disabled offline capabilities`); });
        }
    } catch(e) {
        console.log(`bisweb-sw: Bad Message ${e} received`);
    }
    
});

// -------------------------
// Install Event
// -------------------------
self.addEventListener('install', e => {

    internal.webfirst=true;
    idb.get('mode').then( (m) => {
        m=m || '';
        cleanCache().then( () => {
            internal.updating=false;
            if (m.indexOf('offline')>=0) {
                internal.updating=true;
                idb.set('mode','offline').then( () => { 
                    populateCache("Cache Updated -- installed new service worker");
                });
            } else {
                idb.set('mode','online');
            }
        });
    });
    self.skipWaiting()
});

// -------------------------
// Activate Event
// -------------------------
self.addEventListener('activate',  event => {
    console.log("bisweb-sw: Service Worker Activated.");
    event.waitUntil(self.clients.claim());
    send_message_to_all_clients(`Activate`);
});

// -------------------------
// The Critical Fetch Event
// -------------------------

self.addEventListener('fetch', event => {

    let webfirst=internal.webfirst;

    if (!webfirst) {
    
        let url=event.request.url;
        if (url.indexOf('bisdate.json')>=0)
            webfirst=true;
        
        
        if (internal.updating)
            webfirst=true;
    }

    //    console.log('Requesting',event.request.url,' webfirst=',webfirst);
    if (webfirst) {
        event.respondWith(fetch(event.request).catch( (e) => {
            console.log('bisweb-sw: Tried but no network ... returning cached version',event.request.url);
            return caches.match(event.request);
        }))
    } else {
        // Cache then Web
        event.respondWith(
            caches.match(
                event.request, {
                    ignoreSearch : true
                }
            ).then(response => {
                
                return response || fetch(event.request);
            }).catch(function(error) {
                console.log('bisweb-sw: Cache fetch failed; returning online version for', event.request.url);
            }));
    }
});

console.log(`bisweb-sw: BioImage Suite Web Service Worker starting name=${internal.name} path=${internal.path}`);                       
