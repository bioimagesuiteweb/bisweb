import http.server
import socketserver
import threading
import tempfile
import os
import asyncio
import websockets
import sys
import json

class Server:

    def __init__(self):
        self.connections={}
        self.wsport=9000
        self.lastIndex=0
        self.connections={}
         
    async def listen(self,websocket):
        print('--- Waiting for messages')
        async for message in websocket:
            print('---- Received',message);
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

                print('Command=',command,'index=',index)
                    
                if (command == 'hello'):
                    self.connections[index]=websocket;
                    await self.setImage("MNI_T1_2mm_stripped_ras.nii.gz",index,0,False);

                if (command == 'done'):
                    coords = [ 50+index,50+index*2,20+index*3];
                    await self.setCoordinates(index,coords,0)

                if (command == 'forward'):
                    try:
                        payload=b['payload'];
                        await self.connections[index].send(payload)
                    except:
                        e = sys.exc_info()[0]
                        print(sys.exc_info())
            except:
                e = sys.exc_info()[0]
                print(sys.exc_info())


    def print(self):
        print('---- Connections=',self.connections);

    async def createServer(self):
        async with websockets.serve(self.listen, "localhost", self.wsport):
            print('---- Websocket server started on port',self.wsport);
            await asyncio.Future()  # run forever
                
    async def setImage(self,filename,index=0,viewer=0,overlay=False):
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
        await self.connections[index].send(json.dumps(c));
        
                   
                

if __name__ == '__main__':
        
    print('.... Starting main function')
    v=Server()
    asyncio.run(v.createServer())





