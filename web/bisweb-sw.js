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
    count : 0,
    maxcount : 0,
    debug : false,
    forceOffline : false,
};

internal.path2= internal.path+"#";
internal.path3= internal.path+"index.html#";
internal.mainpage=internal.path+"index.html";

internal.pathlength=internal.path.length;

internal.pending={};

// ------------------- Utility Functions -----------------

var getTime=function(nobracket=0) {
    //    http://stackoverflow.com/questions/7357734/how-do-i-get-the-time-of-day-in-javascript-node-js

    let date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    let min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    let sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    if (nobracket===0)
        return  "[" + hour + ":" + min + ":" + sec +"]";
    return  hour + ":" + min + ":" + sec;
};

var cleanCache=function() {
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
                    goOnline().then( () => {
                        resolve();
                    }).catch( (e) => {
                        reject(e);
                    });
                });
            }).catch( (e) => {
                reject(e);
            });
        });
    });
};

var getSingleItem=function(cache,url,url2) {

    internal.pending[url]=url2;
    return new Promise( (resolve,reject) => {
        fetch(url2).then(function(response) {
            if (!response.ok) {
                throw new TypeError('bad response status');
            }
            cache.put(url, response).then( () => {
                internal.count=internal.count+1;
                delete internal.pending[url];
                send_message_to_all_clients(`Updating Cache. Downloaded file ${internal.count}/${internal.maxcount}`);
                let keys=Object.keys(internal.pending);
                if (keys.length<5) 
                    console.log('bisweb-sw left=',JSON.stringify(keys));
                resolve();
            }).catch( (e) => {
                internal.updating=false;
                reject(e);
            });
        });
    });
};



var populateCache=function(msg="Cache Updated") {


    let newlst = [ ];
    let lst=internal.cachelist['internal'];
    let maxpass=1; //TODO: make this 1
    for (let pass=0;pass<=maxpass;pass++) {
        for (let i=0;i<lst.length;i++) {
            let item=lst[i];
            newlst.push(item);
        }
        lst=internal.cachelist['external'];
    }

    console.log(`bisweb-sw: ${getTime()}. Beginning to  install (cache) ${newlst.length} files.`);


    return caches.open(internal.name).then(cache => {

        internal.count=0;
        internal.maxcount=newlst.length;

        let t= new Date().getTime();
        let p=[];
        
        for (let i=0;i<newlst.length;i++) {
            let url=newlst[i];
            let url2=`${url}?t=${t}`;

            p.push(getSingleItem(cache,url,url2));
        }
        
        Promise.all(p).then( () => {
            internal.updating=false;
            fetch(`bisdate.json?t=${t}`).then( (resp) => {
                resp.json().then ( (obj) => {
                    console.log('bisweb-sw: '+getTime()+'. Installation (caching) successful');
                    idb.set('cachedate',obj).then( () => {
                        idb.set('cache','full').then( () => {
                            send_message_to_all_clients(msg);
                            self.skipWaiting();
                        });
                    });
                });
            });
        });
    });
};


// ----------------- Messaging Functions -----------------

var send_message_to_client=function(client, msg){

    return new Promise(function(resolve, reject){
        let msg_chan = new MessageChannel();

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

var send_message_to_all_clients=function(msg){

    clients.matchAll().then(clients => {
        clients.forEach(client => {
            send_message_to_client(client, msg).then(m => console.log("bisweb-sw: "+getTime()+". Received Message: "+m));
        });
    });
};

// -------------------------------------------------------------
// Go Online, or Go Offline
// -------------------------------------------------------------

var goOnline=async function(extra='') {

    let t= new Date().getTime();
    try {
        await fetch(`bisdate.json?t=${t}`);
    } catch(e) {
        console.log('bisweb-sw: '+getTime()+'. Failed to connect to network staying offline if possible');
        await goOffline(false);
        return;
    }
    internal.forceOffline=false;
    try {
        await idb.set('mode','online');
        send_message_to_all_clients(`Going Online${extra}`);
    } catch(e) {
        console.log('bisweb-sw: '+getTime()+'. Failed to set idb mode'+e);
    }
};


var goOffline=async function(hasnetwork=true) {

    let extra='';
    if (!hasnetwork)
        extra=' No network connection';
    
    let m=await idb.get('cache');
    if (m!=='empty') {
        internal.forceOffline=true;
        await idb.set('mode','offline');
        send_message_to_all_clients(`Going Offline.${extra}`);
    } else if (hasnetwork) {
        await goOnline('empty cache');
    }
};

// ----------------- Event Handling ----------------------
// -------------------------
// Message from Client
// -------------------------
self.addEventListener('message', (msg) => {

    let obj=null;
    try {
        obj=JSON.parse(msg.data);
    } catch(e) {
        console.log(`bisweb-sw: ${getTime()}. Bad Message ${e} received`);
        return;
    }
    
    let name=obj.name;
    let data=obj.data;
    if (internal.debug)
        console.log(`bisweb-sw: ${getTime()}. Received ${name}:${data}`);

    if (name.indexOf("updateCache")>=0) {
        if (internal.updating===false) {
            internal.updating=true;
            populateCache('Cache Updated').then( () => {
                console.log('bisweb-sw: Cache Updated');
            });
        } else {
            console.log('bisweb-sw: '+getTime()+'. Already updating cache');
        }
    } else if (name==="clearCache") {
        cleanCache();
    } else if (name==="debugon") {
        internal.debug=true;
        console.log('++++ setting debug to on');
    } else if (name==="debugoff") {
        console.log('++++ setting debug to off');
        internal.debug=false;
    } else if (name==="goOnline") {
        goOnline().catch( (e) => {
            console.log('Error ',e,e.stack,' in goOnline');
        });
    } else if (name==="goOffline") {
        goOffline().catch( (e) => {
            console.log('Error ',e,e.stack,' in goOffline');
        });
    }
    
});

// -------------------------
// Install Event
// -------------------------
self.addEventListener('install', () => {

    cleanCache().then( () => {
        console.log('bisweb-sw: '+getTime()+'. In install mode');
        self.skipWaiting();
    });
});

self.addEventListener('activate',  event => {

    event.waitUntil(self.clients.claim());
    self.skipWaiting();
    console.log('bisweb-sw: '+getTime()+'. In activate mode');
});

// -------------------------------------------------------
// The Critical Fetch Event
// -------------------------------------------------------

// Get this from the network
// -------------------------
var tryNetwork=async function(url,urlname) {

    try {
        let q=await fetch(url);
        return q;
    } catch(e) {
        if (internal.debug)
            console.log('bisweb-sw: '+getTime()+'. Network fetch failed; will try returning cached version for', url,urlname);
    }
    return null;
};

// Get file from cache
// -------------------------
var tryCache=async function(url,urlname) {
    try {
        let q=await caches.match(url, {ignoreSearch : true});
        if (q) {
            return q;
        } else {
            if (internal.debug)
                console.log('bisweb-sw: '+getTime()+'. Cache fetch returned undefined; will try returning online version for', url);
        }
    } catch(e) {
        if (internal.debug)
            console.log('bisweb-sw: '+getTime()+'. Cache fetch failed; will try returning online version for',url,urlname);
    }
    return null;
};


var dummyResponse=function(urlname,mainpage) {
    if (internal.debug)
        console.log("bisweb-sw: "+getTime()+". About to return dummy");
    
    const fallbackResponse = `
<HEAD>
    <title>BioImage Suite Error Page</title>
</head>
<body style="background-color: rgb(14,22,32); color:rgb(255,255,255)">
   <H1>Network Error</H1>
<HR>
<p>Either there is no connection to the BioImage Suite Web Application, or this url=${urlname} does not exist.</p>
<p>You can try return to the <a href="${mainpage}" style="color:rgb(255,128,128)">main page</a>.</p>
<HR>
</body>`;
    
    // Construct the fallback response via an in-memory variable. In a real application,
    // you might use something like `return fetch(FALLBACK_URL)` instead,
    // to retrieve the fallback response via the network.
    return new Response(fallbackResponse, { headers: {'Content-Type': 'text/html'}});
};

// ------------------------------------------------------

self.addEventListener('fetch', (event) => {

    event.respondWith(async function() { 
        
        // First check for special paths and reroute
        let url=event.request;
        let urlname=event.request.url;

        let ind=urlname.indexOf('bisdate.json');
        if (ind<0) {
            if (urlname === internal.path ||
                urlname === internal.path2 ||
                urlname === internal.path3) {
                url=internal.mainpage;
                if (internal.debug) {
                    console.log('--bisweb-sw: '+getTime()+'. Getting ',url,' was', urlname);
                }
                urlname=url;
            }
        }

        try {
            if (internal.forceOffline===false || ind>=0) {
                let q=await tryNetwork(url,urlname);
                if (q)
                    return q;
            }
            
            let q=await tryCache(url,urlname);
            if (q)   {
                if (!internal.forceOffline) {
                    console.log('--bisweb-sw: '+getTime()+'. Going offline');
                    await goOffline(false);
                }
                return q;
            }
        } catch(e) {
            if (internal.debug)
                console.log('--bisweb-sw: '+getTime()+'. Cache error in getting ',urlname,' was', e);
        }

        if (internal.forceOffline===true) {
            // Nothing offline, let's try back to online
            try {
                let q=await tryNetwork(url,urlname);
                if (q)
                    return q;
            }  catch(e) {
                if (internal.debug)
                    console.log('--bisweb-sw: '+getTime()+'. Network error in getting ',urlname,' was', e);
            }
        }   
        
        return dummyResponse(urlname,internal.mainpage);
    }());
});

// ----------------------------------------------------
// Initialization
// ----------------------------------------------------

idb.get('cache').then( (m) => {
    idb.get('mode').then( (n) => {
        console.log(`bisweb-sw: ${getTime()}. BioImage Suite Web Service Worker starting name=${internal.name} path=${internal.path}, mode=${m},${n}`);
        if (m !== 'offline') {
            idb.set('mode','online');
        }
        if ( m !== 'full') {
            idb.set('cache','empty');
        }
    });
}).catch( (e) => {
    console.log('Error ',e);
});



    
