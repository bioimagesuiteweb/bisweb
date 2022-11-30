import os
import asyncio
import websockets
import sys
import json
import IPython.display 
import webbrowser
import time

class Viewer:

    wsport=9000;

    url='';
    
    def __init__(self,port=None):
        super().__init__();
        if (port!=None):
            Viewer.wsport=port;
        Viewer.url="ws://localhost:"+str(Viewer.wsport);
        self.hasViewer=False;
        self.info=None;
        
    async def sendMessage(self,msg,respond=False):
        async with websockets.connect(Viewer.url) as websocket:
            Viewer.websocket=websocket;
            await Viewer.websocket.send(msg);
            if (respond):
                result = await Viewer.websocket.recv()
                return result;
            else:
                return 'done'

    async def createViewer(self,width=800,height=800,external=False):

        if (self.hasViewer):
            print('Viewer already created');
            return

        tmp=await self.sendMessage('{"command" : "getInfo"}',respond=True);

        try:
            self.info=json.loads(tmp)
        except:
            print(sys.exc_info())
            self.info=None;
            print('Failed to connect to server');
            return 

        self.index=self.info['index']
        url=self.info['url']+"web/lightviewer.html";
        url=url+"?port="+str(Viewer.wsport);
        print('++++ creating viewer with URL=',url);
        url=url+"&index="+str(self.index);
        m=url;
        
        if (external):
            webbrowser.open(url);
            time.sleep(2.0);
        else:
            m='IPython.display.IFrame('+'"'+url+'", width='+str(width)+', height='+str(height)+")";

        self.hasViewer=True
        return m

    async def setImage(self,filename,overlay=False):
        a= {
            "command" : "forward",
            "index" : self.index,
            "payload": {
                "command" : "load",
                "filename" : self.info['url']+filename,
                "overlay" : overlay
            }
        }
        await self.sendMessage(json.dumps(a))

        
    async def setCoordinates(self,coords):
        c= {
            "command" : "forward",
            "index" : self.index,
            "payload": {
                "command" : "crosshairs",
                "coords"  : coords,
            }
        }
        await self.sendMessage(json.dumps(c))


        
                   
if __name__ == '__main__':

    ws=9000;
    if (sys.argv[1]!=None):
        ws=int(sys.argv[1])

    v=Viewer(ws);
    asyncio.run(v.createViewer(external=True));
    time.sleep(5.0);
    asyncio.run(v.setImage("web/images/MNI_T1_2mm_stripped_ras.nii.gz",False));
                        

    
