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

    def __init__(self,port=None,tempname=None):
        self.connections={}
        self.wsport=9000
        self.httpport=None
        if (port != None):
            self.wsport=port;


        self.lastIndex=0
        self.httpd=None
        print('__ Created temp directory:',tempname);
        self.tempdir=tempname;
  
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

                print('\n___\n___\n___ server received command=',b,'index=',index)

                if (command=='exit'):
                    self.httpd.server_close();
                    try:
                        sys.exit(0);
                    except:
                        print(sys.exc_info())


                if (command=='getInfo'):
                    out = {
                        'index' : self.lastIndex,
                        'temp'  : self.tempdir,
                        'url'   : "http://localhost:"+str(self.httpport)+'/',
                        'path' : os.path.basename(self.tempdir)
                    }
                    self.lastIndex=self.lastIndex+1;
                    print('___ Responding',out,'\n___');
                    await websocket.send(json.dumps(out));


                if (command == 'viewerReady'):
                    self.connections[index]=websocket;
                    
                    
                try:
                    a=self.connections[index];
                except:
                    self.connections[index]=None;

                if (self.connections[index]!=None):
                    if (command == 'done'):
                        coords = [ 50+index,50+index*2,20+index*3];
                        await self.setCoordinates(index,coords,0)

                    if (command == 'forward' and self.connections[index]!=None):
                        payload=json.dumps(b['payload']);
                        try:
                            await self.connections[index].send(payload)
                        except:
                            print('Failed here')
                            e = sys.exc_info()[0]
                            print(sys.exc_info())
                else:
                    print('___ viewer',index,'not connected yet')
                        
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
            if (dowait):
                await asyncio.Future()  # run forever


    def createTemp(self):
        print('__in dir=',os.getcwd())
        tmp=tempfile.TemporaryDirectory(dir=os.getcwd());
          
    def createHTTPServer(self):

        if (self.httpport==None):
            self.httpport=self.wsport+1;


        self.createTemp();
        Handler = http.server.SimpleHTTPRequestHandler
        self.httpd=http.server.ThreadingHTTPServer(("127.0.0.1", self.httpport), Handler);
        print("---- HTTP Server started at port",self.httpport,' root=',os.getcwd())
        server_thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        server_thread.start()

            
    async def setImage(self,url,index=0,viewer=0,overlay=False):
        port="8080";
        if (self.httpport!=None):
            port=str(self.httpport)
        
        
        a= {
            "command" : "load",
            "filename" : url,
            "viewer" : viewer,
            "overlay" : overlay
        };
        print(a,index);
        await self.connections[index].send(json.dumps(a));

    async def setCoordinates(self,index,coords,viewer=0):
        c= {
            "command" : "crosshairs",
            "coords"  : [ 20+index*10,20+index*20,20+index*30 ],
            "viewer"  : viewer
        };
        await self.connections[index].send(json.dumps(c));
        

# Commandline Version
def main(port=None,dir=None,doWait=True):
    print('__ switching to directory',dir);
    os.chdir(dir)
    with tempfile.TemporaryDirectory(dir=dir) as tempdname:
        print('.... Starting main function',tempdname)
        v=Server(port,tempdname)
        v.createHTTPServer()
        asyncio.run(v.createWSServer(dowait=doWait))


# Jupyter Version        
async def start(port=None,dir=None):
    main(port,dir,False);
    

if __name__ == '__main__':
    a=sys.argv[1];
    if (a==None):
        a="9000"

    main(int(sys.argv[1]),sys.argv[2])
    




