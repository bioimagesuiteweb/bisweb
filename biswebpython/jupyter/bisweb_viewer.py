import os
import asyncio
import websockets
import sys
import json

print('importing viewer')

class Viewer:

    wsport=9000;
    websocket=None;
    lastindex=0;
    baseurl="http://localhost:8080/web/lightviewer.html";
    
    def __init__(self):
        super().__init__();
        
    async def connect(self,port=None):
        if (port!=None):
            Viewer.wsport=port;

        if (Viewer.websocket==None):
            url="ws://localhost:"+str(Viewer.wsport);
            print("Initializing",url);
            await websockets.connect(url);
            Viewer.websocket=websocket;
            await Viewer.websocket.send('Initializing Connection');
        else:
            print("Websocket already exists")

        
    async def createViewer(self,width=800,height=800,port=22222):

        await self.connect(port);

        self.index=Viewer.lastIndex;
        
        url=Viewer.baseurl
        url=url+"?port="+str(Viewer.wsport);
        print('++++ creating viewer with URL=',url);
        url=url+str(self.wsport)
        url=url+"&index="+str(Viewer.lastIndex);
        print(url)
        m='IFrame('+url+', width='+str(width)+', height='+str(height);
        print(m);
        Viewer.lastIndex+=1;
        return m

    async def setImage(self,filename,overlay=False):
        a= {
            "command" : "forward",
            "index" : self.index,
            "payload": {
                "command" : "load",
                "filename" : "http://localhost:8083/web/images/"+filename,
                "overlay" : overlay
            }
        }
        await self.connections[index].send(json.dumps(a));

    async def setCoordinates(self,coords):
        c= {
            "command" : "forward",
            "index" : self.index,
            "payload": {
                "command" : "crosshairs",
                "coords"  : [ 20+index*10,20+index*20,20+index*30 ],
            }
        }
        await self.websocket.send(json.dumps(c));
        
                   
