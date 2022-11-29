import os
import asyncio
import websockets
import sys
import json
import IPython.display 
import webbrowser


class Viewer:

    wsport=9000;
    httpport=8080
    lastIndex=0;

    url='';
    
    def __init__(self,port=None,httpport=None):
        super().__init__();
        if (port!=None):
            Viewer.wsport=port;
        if (httpport!=None):
            Viewer.httpport=httpport;
        else:
            Viewer.httpport=Viewer.wsport+1;
        Viewer.url="ws://localhost:"+str(Viewer.wsport);
        self.hasViewer=False;
        
    async def sendMessage(self,msg,port=None):
        async with websockets.connect(Viewer.url) as websocket:
            Viewer.websocket=websocket;
            await Viewer.websocket.send(msg);
                
    def createViewer(self,width=800,height=800,external=False):

        if (self.hasViewer):
            print('Viewer already created');
            return
        
        self.index=Viewer.lastIndex;
        url="http://localhost:"+str(Viewer.httpport)+"/web/lightviewer.html";
        url=url+"?port="+str(Viewer.wsport);
        print('++++ creating viewer with URL=',url);
        url=url+"&index="+str(Viewer.lastIndex);
        m=url;
        
        if (external):
            webbrowser.open(url);
        else:
            m='IPython.display.IFrame('+'"'+url+'", width='+str(width)+', height='+str(height)+")";
            eval(m)
        Viewer.lastIndex+=1;
        self.hasViewer=True
        return m

    async def setImage(self,filename,overlay=False):
        a= {
            "command" : "forward",
            "index" : self.index,
            "payload": {
                "command" : "load",
                "filename" : "http://localhost:"+str(Viewer.httpport)+"/web/images/"+filename,
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
    hp=8080;
    if (sys.argv[1]!=None):
        ws=int(sys.argv[1])
    if (sys.argv[2]!=None):
        hp=int(sys.argv[2])

    Viewer.lastIndex=10;
    v=Viewer(ws,hp);
    m=asyncio.run(v.createViewer(external=True));

    
