import http.server
import socketserver
import threading
import os
import asyncio
import websockets
import sys
import json
import tempfile

class Server:

    def __init__(self,port=None):
        self.connections={}
        self.wsport=9000
        self.httpport=None
        if (port != None):
            self.wsport=port;


        self.lastIndex=0
        self.httpd=None
        self.tempdir=None
        self.connections={}
         
    async def listen(self,websocket):
        
        async for message in websocket:
            try:
                b=json.loads(message);

                try:
                    command=b['command'];
                except:
                    command='';
                
                try:
                    index=b['index'];
                except:
                    index=0

                print('___ server received command=',command,'index=',index)
                    
                if (command == 'hello'):
                    self.connections[index]=websocket;
                    await self.setImage("MNI_T1_2mm_stripped_ras.nii.gz",index,0,False);

                if (command == 'done'):
                    coords = [ 50+index,50+index*2,20+index*3];
                    await self.setCoordinates(index,coords,0)

                if (command == 'forward'):
                    payload=json.dumps(b['payload']);
                    try:
                        await self.connections[index].send(payload)
                    except:
                        print('Failed')
                        e = sys.exc_info()[0]
                        print(sys.exc_info())

                if (command=='exit'):
                    self.httpd.server_close();
                    try:
                        sys.exit(0);
                    except:
                        print(sys.exc_info())
                        
            except websockets.exceptions.ConnectionClosed:
                print("Client disconnected.  Do cleanup")

            except:
                e = sys.exc_info()[0]
                print(sys.exc_info())


    def print(self):
        print('---- Connections=',self.connections);

    async def createWSServer(self,dowait=True):
        async with websockets.serve(self.listen, "localhost", self.wsport):
            print('---- Websocket server started on port',self.wsport);
            await asyncio.Future()  # run forever


    def createTemp(self):
        tmp=tempfile.TemporaryDirectory(dir=os.getcwd());
        print('Created temp directory:',tmp.name);
        self.tempdir=tmp.name;
            
    def createHTTPServer(self,dir=None):

        if (self.httpport==None):
            self.httpport=self.wsport+1;

        if (dir!=None):
            os.chdir(dir)

        self.createTemp();
        Handler = http.server.SimpleHTTPRequestHandler
        self.httpd=http.server.ThreadingHTTPServer(("127.0.0.1", self.httpport), Handler);
        print("---- HTTP Server started at port",self.httpport,' root=',os.getcwd())
        server_thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        server_thread.start()

            
    async def setImage(self,filename,index=0,viewer=0,overlay=False):
        port="8080";
        if (self.httpport!=None):
            port=str(self.httpport)
        
        
        a= {
            "command" : "load",
            "filename" : "http://localhost:"+port+"/web/images/"+filename,
            "viewer" : viewer,
            "overlay" : overlay
        };
        await self.connections[index].send(json.dumps(a));

    async def setCoordinates(self,index,coords,viewer=0):
        c= {
            "command" : "crosshairs",
            "coords"  : [ 20+index*10,20+index*20,20+index*30 ],
            "viewer"  : viewer
        };
        await self.connections[index].send(json.dumps(c));
        
                   
def main(port=None,dir=None):
    print('.... Starting main function')
    v=Server(port)
    v.createHTTPServer(dir)
    asyncio.run(v.createWSServer(dowait=False))


async def start(port=None,dir=None):
    print('.... Starting main function')
    v=Server(port)
    v.createHTTPServer(dir)
    await v.createWSServer()
    

if __name__ == '__main__':
    a=sys.argv[1];
    if (a==None):
        a="9000"
    
    
    main(int(sys.argv[1]),sys.argv[2])
    




