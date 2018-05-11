const cachelist=require('./pwa/pwacache.js');

let offline=false;
let count=0;

let installFiles=function() {
    console.log('Installing ', cachelist['production'].length,' files');
    return caches.open('bisweb').then(cache => {
        return cache.addAll(cachelist['production']).then(() => self.skipWaiting());
    });
};

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

        client.postMessage("SW Says: '"+msg+"'", [msg_chan.port2]);
    });
};

let send_message_to_all_clients=function(msg){
    clients.matchAll().then(clients => {
        clients.forEach(client => {
            send_message_to_client(client, msg).then(m => console.log("SW Received Message: "+m));
        })
    })
};


self.addEventListener('message', (msg) => {

    console.log('Received message=',msg.data);
    
    try {
        let obj=JSON.parse(msg.data);
        let name=obj.name;
        let data=obj.data;
        console.log(`Received ${name}:${data}`);
        if (name==="updateCache") {
            installFiles();
            console.log(msg);
            send_message_to_all_clients("Cache Updated");
        }
    } catch(e) {
        console.log(`Bad Message ${e} received`);
    }
    
});

self.addEventListener('install', e => {
    e.waitUntil( installFiles() )
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
