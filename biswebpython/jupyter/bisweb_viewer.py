import os
import asyncio
import websockets
import sys
import json
from IPython.display import IFrame


class Viewer:

    wsport=9000;
    lastIndex=0;
    baseurl="http://localhost:8080/web/lightviewer.html";
    url='';
    
    def __init__(self,port=None):
        super().__init__();
        if (port!=None):
            Viewer.wsport=port;
        Viewer.url="ws://localhost:"+str(Viewer.wsport);
        print('Port=',Viewer.url)
        
    async def sendMessage(self,msg,port=None):
        async with websockets.connect(Viewer.url) as websocket:
            Viewer.websocket=websocket;
            await Viewer.websocket.send(msg);
                
    async def createViewer(self,width=800,height=800):

        self.index=Viewer.lastIndex;
        url=Viewer.baseurl
        url=url+"?port="+str(Viewer.wsport);
        print('++++ creating viewer with URL=',url);
        url=url+"&index="+str(Viewer.lastIndex);
        print(url)
        m='from IPython.display import IFrame; IFrame('+'"'+url+'", width='+str(width)+', height='+str(height)+")";
        Viewer.lastIndex+=1;
            
        #IFrame("http://localhost:8080/web/lightviewer.html?port=9000&index=3", width=1000, height=1000)
        return m

    async def setImage(self,filename,overlay=False):
        a= {
            "command" : "forward",
            "index" : self.index,
            "payload": {
                "command" : "load",
                "filename" : "http://localhost:8080/web/images/"+filename,
                "overlay" : overlay
            }
        }
        await self.sendMessage(json.dumps(a));


    async def setCoordinates(self,coords):
        c= {
            "command" : "forward",
            "index" : self.index,
            "payload": {
                "command" : "crosshairs",
                "coords"  : coords,
            }
        }
        await self.sendMessage(json.dumps(c));


        
                   
if __name__ == '__main__':
    v=Viewer(9000);

    m=asyncio.run(v.createViewer(800,800));
    print(m)
    str=input('Press enter to continue');
    asyncio.run(v.setCoordinates([20,24,32 ]));
    
