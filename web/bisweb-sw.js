"use strict";

const idb=require('idb-keyval');

/*global self, caches,fetch, MessageChannel, clients */

// idb-store has a key 'cache' with two values

// empty  -- no cache
// full   -- has downloaded copy of application

// --------- First Configuration Info --------------------
const internal =  {
    cachelist : require('./pwa/pwacache.js'),
    name : 'bisweb',
    path : self.location.href.substr(0,self.location.href.lastIndexOf('/')+1),
    updating : false,
    count : {},
    maxcount : {},
    debug : false,
    offline : false,
};

internal.path2= internal.path+"#";
internal.path3= internal.path+"index.html#";
internal.mainpage=internal.path+"index.html";

internal.pathlength=internal.path.length;
// ------------------- Utility Functions -----------------

let getTime=function(nobracket=0) {
    //    http://stackoverflow.com/questions/7357734/how-do-i-get-the-time-of-day-in-javascript-node-js

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    if (nobracket===0)
        return  "[" + hour + ":" + min + ":" + sec +"]";
    return  hour + ":" + min + ":" + sec;
};

let cleanCache=function() {
    console.log('bisweb-sw: '+getTime()+'. Cleaning cache',internal.name);

    return new Promise( (resolve,reject) => {
        
        let p=[];

        p.push(idb.set('cache','empty'));
        p.push(idb.set('cachedate',{}));

        caches.open(internal.name).then(cache => {
            cache.keys().then( (keys) => {
                console.log('bisweb-sw: '+getTime()+'. Removing',keys.length,'files');
                for (let i=0;i<keys.length;i++) {
                    p.push(cache.delete(keys[i]));
                }
            });

            Promise.all(p).then( ()=> {
                cache.keys().then( (keys) => {
                    console.log('bisweb-sw: '+getTime()+'. Cache deleted files left=', keys.length);
                    send_message_to_all_clients(`Cleaned Cache. Disabled offline capabilities`);
                    resolve();
                });
            }).catch( (e) => {
                reject(e);
            });
        });
    });
};

let getSingleItem=function(cache,mode,url,url2) {

    return new Promise( (resolve,reject) => {
                fetch(url2).then(function(response) {
                    if (!response.ok) {
                        throw new TypeError('bad response status');
                    }
                    cache.put(url, response).then( () => {
                        internal.count[mode]=internal.count[mode]+1;
                        if (mode==='internal')
                            send_message_to_all_clients(`Updating Cache. Downloaded file ${internal.count[mode]}/${internal.maxcount[mode]}`);
                        resolve();
                    }).catch( (e) => {
                        internal.updating=false;
                        reject(e);
                    });
                });
    });
};

let populateCache=function(msg="Cache Updated",mode='internal') {

    let lst=internal.cachelist[mode];
    console.log(`bisweb-sw: ${getTime()}. Beginning to  install (cache) ${lst.length} files. Mode=${mode}`);

    let newlst = [ ];
    //    if (mode==='internal')
    //      newlst.push(internal.path);
    for (let i=0;i<lst.length;i++) {
        let item=lst[i];
        newlst.push(item);
    }


    return caches.open(internal.name).then(cache => {

        internal.count[mode]=0;
        internal.maxcount[mode]=newlst.length;

        let t= new Date().getTime();
        let p=[];
        
        for (let i=0;i<newlst.length;i++) {
            let url=newlst[i];
            let url2=`${url}?t=${t}`;
            p.push(getSingleItem(cache,mode,url,url2));
        }
        
        Promise.all(p).then( () => {
            internal.updating=false;
            if (mode==='internal') {
                fetch(`bisdate.json?t=${t}`).then( (resp) => {
                    resp.json().then ( (obj) => {
                        console.log('bisweb-sw: '+getTime()+' bisdate.json',obj);
                        console.log('bisweb-sw: '+getTime()+'. Installation (caching) successful');
                        idb.set('cachedate',obj).then( () => {
                            idb.set('cache','full').then( () => {
                                send_message_to_all_clients(msg);
                                self.skipWaiting();
                            });
                        });
                    });
                });
            }
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
            send_message_to_client(client, msg).then(m => console.log("bisweb-sw: "+getTime()+". Received Message: "+m));
        });
    });
};


// ----------------- Event Handling ----------------------


// -------------------------
// Message from Client
// -------------------------
self.addEventListener('message', (msg) => {
    
    console.log('bisweb-sw: '+getTime()+'. Received message=',msg.data);
    
    try {
        let obj=JSON.parse(msg.data);
        let name=obj.name;
        let data=obj.data;
        console.log(`bisweb-sw: ${getTime()}. Received ${name}:${data}`);
        if (name==="updateCache") {
            if (internal.updating===false) {
                internal.updating=true;
                populateCache('Cache Updated','internal');
                populateCache('Cache Updated','external');
            } else {
                console.log('bisweb-sw: '+getTime()+'. Already updating cache');
            }
        } else if (name==="clearCache") {
            cleanCache();
        } else if (name==="debugon") {
            internal.debug=true;
        } else if (name==="debugoff") {
            internal.debug=false;
        }
    } catch(e) {
        console.log(`bisweb-sw: ${getTime()}. Bad Message ${e} received`);
    }
    
});

// -------------------------
// Install Event
// -------------------------
self.addEventListener('install', () => {

    cleanCache().then( () => {
        self.skipWaiting();
    });
});

// -------------------------
// Activate Event
// -------------------------
self.addEventListener('activate',  event => {

    event.waitUntil(self.clients.claim());
    self.skipWaiting();
    console.log('bisweb-sw: '+getTime()+'. In activate mode');
});

// -------------------------
// The Critical Fetch Event
// -------------------------

self.addEventListener('fetch', (event) => {

    event.respondWith(async function() { 
        
        // First check for special paths and reroute
        let url=event.request;
        let urlname=event.request.url;
        if (urlname === internal.path ||
            urlname === internal.path2 ||
            urlname === internal.path3) {
            url=internal.mainpage;
            if (internal.debug) {
                console.log('--bisweb-sw: '+getTime()+'. Getting ',url,' was', urlname);
            }
            urlname=url;
        }

        // If .json or .html force online check even if offline
        let ind=urlname.indexOf(".html");
        let ind2=urlname.indexOf(".json");
        if (ind2>0 || ind>0 >0 || internal.offline===false) {
            try {
                if (internal.offline)
                    console.log('bisweb-sw: '+getTime()+'. Trying network fetch for', event.request.url,urlname);
                let q=await fetch(url);
                await idb.set('network','online');
                internal.offline=false;
                return q;
            } catch(e) {
                if (internal.debug)
                    console.log('bisweb-sw: '+getTime()+'. Network fetch failed; will try returning cached version for', event.request.url,urlname);
            }
        }
        
        try {
            let q=await caches.match(url, {ignoreSearch : true});
            if (q) {
                internal.offline=true;
                await idb.set('network','offline');
                return q;
            } else {
                if (internal.debug)
                    console.log('bisweb-sw: '+getTime()+'. Cache fetch returned undefined; will try returning online version for', event.request.url);
                url=event.request;
            }
        } catch(e) {
            if (internal.debug)
                console.log('bisweb-sw: '+getTime()+'. Cache fetch failed; will try returning online version for', event.request.url,urlname);
        }
        
        if (internal.debug)
            console.log("bisweb-sw: "+getTime()+". About to return dummy");

        // https://googlechrome.github.io/samples/service-worker/fallback-response/
        // For demo purposes, use a pared-down, static YouTube API response as fallback.
        const fallbackResponse = {
          items: [{
              snippet: {title: 'Fallback Title 1'}
          }]
        };

        // Construct the fallback response via an in-memory variable. In a real application,
        // you might use something like `return fetch(FALLBACK_URL)` instead,
        // to retrieve the fallback response via the network.
        return new Response(JSON.stringify(fallbackResponse), { headers: {'Content-Type': 'application/json'}});
    }());
});


idb.get('cache').then( (m) => {
    idb.get('network').then( (n) => {
        console.log(`bisweb-sw: ${getTime()}. BioImage Suite Web Service Worker starting name=${internal.name} path=${internal.path}, mode=${m},${n}`);
        if (n !== 'offline') {
            idb.set('network','online');
        }
        if ( m !== 'full') {
            idb.set('cache','empty');
        }
    });
}).catch( (e) => {
    console.log('Error ',e);
});



