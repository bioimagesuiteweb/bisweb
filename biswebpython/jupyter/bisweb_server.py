import os
import asyncio
import websockets
import sys
import json

class Server:

    def __init__(self,port=None):
        self.connections={}
        self.wsport=9000
        if (port != None):
            self.wsport=port;
        
        self.lastIndex=0
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
                                
            except websockets.exceptions.ConnectionClosed:
                print("Client disconnected.  Do cleanup")

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
        
                   
def main(port=None):
    print('.... Starting main function')
    v=Server(port)
    asyncio.run(v.createServer())

async def start(port=None):
    print('.... Starting main function')
    v=Server(port)
    await v.createServer()
    

if __name__ == '__main__':
    a=sys.argv[1];
    if (a==None):
        a="9000"
    
    main(int(sys.argv[1]))
    




