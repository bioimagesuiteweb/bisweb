
const WebSocket=require('ws');
const wsutil = require('bis_wsutil');
const globalInitialServerPort=require('bis_wsutil').initialPort;
const fs=require('fs');
const https=require('https');
const BisWSWebSocketFileServer=require('bis_wswebsocketfileserver');


// .................................................. This is the class ........................................

class BisSecureWSWebSocketFileServer extends BisWSWebSocketFileServer {

    constructor(opts={}) {
        super(opts);
        this.indent='sssss';
    }

    startServer(hostname='localhost', externalport=globalInitialServerPort, datatransfer = true) {

        if (hostname==='localhost')
            return super.startServer('localhost',externalport,datatransfer);
        return this.startHTTPServer('localhost',externalport,datatransfer);
    }


    // ---------------------------------------------------------------------------
    startHTTPServer(hostname,externalport,datatransfer) {
        
        let options={
            cert: fs.readFileSync('server.cert').toString(),
            key: fs.readFileSync('server.key').toString(),
        };

        return new Promise ( (resolve,reject) => {

            let startNetServer = ( (server,port) => {
                
                this.netServer = new WebSocket.Server({ server } , () => {
                    this.attachServerEvents(hostname,port,datatransfer);
                    setTimeout( () => {
                        resolve(this.portNumber);
                    },100);
                });
            });

            let internalStartServer= (port) => {

                try {
                    console.log('Starting server');
                    this.httpserver=new https.createServer(options);
                    console.log("Server created");
                    this.httpserver.listen(port);
                    console.log("Server listening on port",port);
                    startNetServer(this.httpserver,port);
                    
                } catch(e) {
                    console.log(e);
                    let newport=port+1;
                    if (port<=wsutil.finalPort) {
                        internalStartServer(newport);
                    } else {
                        reject(this.indent+' Can not find free port');
                    }
                }

            };
            
            internalStartServer(externalport);
        });
    }

}


module.exports=BisSecureWSWebSocketFileServer;
