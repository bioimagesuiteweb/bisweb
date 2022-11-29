import http.server
import socketserver
import threading
import tempfile
import os
import asyncio
import websockets
import sys
import json


singleton=None;
print('Here')

class Viewer:
    
    def __init__(self):
        super().__init__();
        self.httpd=None
        self.connections={}
        self.tempname=''
        self.httpport=8083
        self.wsport=8889
        self.lastIndex=0
        os.chdir('/Users/xenios/bisweb/src/')
        self.baseurl="http://localhost:8080/web/lightviewer.html";
        print("Base=",self.baseurl)

    # Temporary Directory
    # -------------------
    def createTemp(self):
         tmp=tempfile.TemporaryDirectory(dir='/Users/xenios/bisweb/src');
         print('---- Created temp directory:',tmp.name);
         self.tempname=tmp.name;
         
    def createServer(self):
        Handler = http.server.SimpleHTTPRequestHandler
        httpd=http.server.ThreadingHTTPServer(("127.0.0.1", self.httpport), Handler);
        print("---- Serving at port",self.httpport,' root=',os.getcwd())
        server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        server_thread.start()
        self.httpd=httpd;
        
    async def listen(self,websocket):
        async for message in websocket:
            print('---- Received',message);
            b=json.loads(message);
            
            if (b['command'] == 'hello'):
                index=b['index'];
                self.connections[index]=websocket;
                await self.setImage("MNI_T1_2mm_stripped_ras.nii.gz",0,False);

            if (b['command'] == 'done'):
                index=b['index'];
                coords = [ 20+index*10,20+index*20,20+index*30];
                await self.setCoordinates(index,coords,0)


    def print(self):
        print('---- Connections=',selfconnections);

    async def createWebsocket(self):
        async with websockets.serve(self.listen, "localhost", self.wsport):
            print('---- Websocket server started on port',self.wsport);


    async def initializeWebSocket(self):
        self.createTemp();
        await self.createWebsocket();

    def exit(self):
        if (self.httpd!=None):
            self.httpd.shutdown()
                
#    def createViewer(self,width=800,height=800):
#        url=self.baseurl
#        url=url+"?port=";
#        print('++++ creating viewer with URL=',url);
#        url=url+str(self.wsport)
#        url=url+"&index="+str(self.lastIndex);
#        IFrame(url, width=width, height=height);
#        a=self.lastIndex;
#        self.lastIndex+=1;
#        return a

    async def setImage(self,index,filename,viewer=0,overlay=False):
        a= {
            "command" : "load",
            "filename" : "http://localhost:8080/web/images/"+filename,
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
        await selfconnections[index].send(json.dumps(c));
        
                   
    def getTempDirectory(self):
        return self.tempname
                

async def main():

    print('Singleton=',singleton);
    
    if (singleton==None):
        singleton=Viewer()
        print('Hello');
        await singleton.initializeWebSocket()
        await singleton.createServer()
        print('---- ',singleton.getTempDirectory())
        
    return singleton;
    
if __name__ == '__main__':
    print('.... Starting main function')
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
