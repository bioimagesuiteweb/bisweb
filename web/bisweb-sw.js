// --------- First Configuration Info --------------------
const internal =  {
    cachelist : require('./pwa/pwacache.js'),
    name : 'bisweb',
    path : self.location.href.substr(0,self.location.href.lastIndexOf('/')),
    updating : false,
    count : 0,
    maxcount : 0,
};

internal.pathlength=internal.path.length;
// ------------------- Utility Functions -----------------

let cleanCache=function() {
    console.log(' ---------------- Clear -------------------------');
    console.log('bisweb-sw: Cleaning cache',internal.name);
    caches.delete(internal.name);
};

let populateCache=function(msg="Cache Updated") {

    console.log(' ---------------- Populate -------------------------');
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
            send_message_to_all_clients(msg);
            self.skipWaiting()
        });
        
        /*return cache.addAll(newlst).then(
            () => {
                send_message_to_all_clients(msg);
                self.skipWaiting()
            });*/
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
            send_message_to_client(client, msg).then(m => console.log("SW Received Message: "+m));
        })
    })
};


// ----------------- Event Handling ----------------------


// -------------------------
// Message from Client
// -------------------------
self.addEventListener('message', (msg) => {

    console.log('bisweb-sw: Received message=',msg.data);
    
    try {
        let obj=JSON.parse(msg.data);
        let name=obj.name;
        let data=obj.data;
        console.log(`bisweb-sw: Received ${name}:${data}`);
        if (name==="updateCache" && internal.updating===false) {
            internal.updating=true;
            cleanCache();
            populateCache('Cache Updated');
        } else {
            console.log('bisweb-sw: Already updating cache');
        }
    } catch(e) {
        console.log(`bisweb-sw: Bad Message ${e} received`);
    }
    
});

// -------------------------
// Install Event
// -------------------------
self.addEventListener('install', e => {
    internal.updating=true;
    cleanCache();
    e.waitUntil( populateCache("Cache Updated -- installed new service worker"));
        
});

// -------------------------
// Activate Event
// -------------------------
self.addEventListener('activate',  event => {
    event.waitUntil(self.clients.claim());
    send_message_to_all_clients(`Activate`);
});



// -------------------------
// The Critical Fetch Event
// -------------------------

self.addEventListener('fetch', event => {



    // Check for css,js html
    let webfirst=false;

/*    let x=event.request.url.split('/').pop();
    if (x.length<2) {
        webfirst=true;
    } else {
        let url=event.request.url;
        if (url.indexOf(internal.path)===0)
            url=url.substr(internal.pathlength+1,url.length-internal.pathlength);
        let index=url.lastIndexOf('?');
        if (index>0) {
            url=event.request.url.substr(0,index-1);
        }
        if (internal.cachelist['web'].indexOf(url)>=0)
            webfirst=true;
        else if (url.indexOf('bisdate.json')>=0)
            webfirst=true;
    }*/
    let url=event.request.url;
    if (url.indexOf('bisdate.json')>=0)
        webfirst=true;


    if (internal.updating)
        webfirst=true;
    
    if (webfirst) {
        // Web then Cache
        //        console.log('bisweb-sw Fetch: requested:'+event.request.url+' webfirst='+webfirst);
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

console.log(`BioImage Suite Web Service Worker starting name=${internal.name} path=${internal.path}`);                       
