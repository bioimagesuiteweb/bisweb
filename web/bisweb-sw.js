"use strict";

const idb=require('idb-keyval');

/*global self, caches,fetch, MessageChannel, clients */

// idb-store has a key 'mode' with three values
// online  -- no cache
// offline -- can download
// offline-complete -- has downloaded

// --------- First Configuration Info --------------------
const internal =  {
    cachelist : require('./pwa/pwacache.js'),
    name : 'bisweb',
    path : self.location.href.substr(0,self.location.href.lastIndexOf('/')+1),
    updating : false,
    count : {},
    maxcount : {},
    webfirst : true,
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

let cleanCache=function(keepmode=false) {
    console.log('bisweb-sw: '+getTime()+'. Cleaning cache',internal.name);
    internal.webfirst=true;
    return new Promise( (resolve,reject) => {
        
        let p=[];
        
        if (keepmode===false)
            p.push(idb.set('mode','online'));

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

    internal.webfirst=true;

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
                console.log('bisweb-sw: '+getTime()+'. Installation (caching) successful');
                idb.set('mode','offline-complete').then( () => {
                    internal.webfirst=false;
                    send_message_to_all_clients(msg);
                    self.skipWaiting();
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
    
    console.log('bisweb-sw: '+getTime()+'. Received message=',msg.data, ' webfirst=',internal.webfirst);
    
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
            cleanCache().then( () => { send_message_to_all_clients(`Cleaned Cache. Disabled offline capabilities`); });
        }
    } catch(e) {
        console.log(`bisweb-sw: ${getTime()}. Bad Message ${e} received`);
    }
    
});

// -------------------------
// Install Event
// -------------------------
self.addEventListener('install', () => {

    internal.webfirst=true;
    idb.get('mode').then( (m) => {
        m=m || '';
        if (m!=='online') {
            cleanCache(true).then( () => {
                send_message_to_all_clients(`NewSW -- Due to Major Updatehe Cache was emptied.`);
                self.skipWaiting();
            });
        } 
    });
});

// -------------------------
// Activate Event
// -------------------------
self.addEventListener('activate',  event => {

    event.waitUntil(self.clients.claim());
    self.skipWaiting();
    idb.get('mode').then( (m) => {
        console.log('bisweb-sw: '+getTime()+'. In activate mode=',m);
        if (m!=='online')
            idb.set('mode','online').then( () => {
                send_message_to_all_clients(`NewSW -- Due to Major Updatehe Cache was emptied.`);
            });
    });
});

// -------------------------
// The Critical Fetch Event
// -------------------------


/*self.addEventListener('fetch', event => {
    // Prevent the default, and handle the request ourselves.
    event.respondWith(async function() {
        // Try to get the response from a cache.
        const cachedResponse = await caches.match(event.request);
        // Return it if we found one.
        if (cachedResponse) return cachedResponse;
        // If we didn't find a match in the cache, use the network.
        return fetch(event.request);
    }());
});*/

self.addEventListener('fetch', (event) => {

    event.respondWith(async function() { 
        
        let webfirst=internal.webfirst;
        
        if (!webfirst) {
            
            let url=event.request.url;
            if (url.indexOf('bisdate.json')>=0)
                webfirst=true;
            
            if (internal.updating)
                webfirst=true;
        }

        // Cache then Web
        let url=event.request;
        let urlname=event.request.url;
        if (urlname === internal.path ||
            urlname === internal.path2 ||
            urlname === internal.path3) {
            url=internal.mainpage;
            if (webfirst)
                console.log('--bisweb-sw: '+getTime()+'. In Web First mode',url,' was', urlname);
            else
                console.log('--bisweb-sw: '+getTime()+'. In Cache mode',url,' was',urlname);
            urlname=url;
        }


        
        if (webfirst) {
            try {
                return await fetch(url);
            } catch(e) {
                console.log('bisweb-sw: '+getTime()+'. Network fetch failed; will try returning cached version for', event.request.url,urlname);
            }
        }

        try {
            return await caches.match(url, {ignoreSearch : true});
        } catch(e) {
            console.log('bisweb-sw: '+getTime()+'. Cache fetch failed; will try returning online version for', event.request.url,urlname);
        }
        try { 
            let f2=await fetch(url);
            console.log('Fetch 2 ', urlname,' OK');
            return f2;
        } catch(e) {
            console.log('bisweb-sw: '+getTime()+'. Network fetch(2) failed; will return null', event.request.url,urlname,'\n Fetch error 2=',e,'\n');
        }
        console.log("bisweb-sw: "+getTime()+". About to return null");
        return null;
    }());
});


console.log(`bisweb-sw: ${getTime()}. BioImage Suite Web Service Worker starting name=${internal.name} path=${internal.path}`);                       
