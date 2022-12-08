import http.server
import socketserver
import threading
import tempfile
import os
import asyncio
import websockets
import sys
import json

os.chdir('/Users/xenios/bisweb/src/build/web');

httpd=0;
connections={};

# Temporary Directory
# -------------------
def createTemp():
    tmp=tempfile.TemporaryDirectory(dir='/Users/xenios/bisweb/src');
    print('Created temp directory:',tmp.name);
    return tmp.name;

def createServer():
    PORT = 8084
    Handler = http.server.SimpleHTTPRequestHandler
    httpd=http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler);
    print("serving at port",PORT,' root=',os.getcwd())
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    return httpd

async def listen(websocket):
    async for message in websocket:
        print('Received',message);
        b=json.loads(message);
        print(b);

        if (b['command'] == 'hello'):
            index=b['index'];
            connections[index]=websocket;
            a= {
                "command" : "load",
                "filename" : "http://localhost:8080/web/images/MNI_T1_2mm_stripped_ras.nii.gz"
            };
            await connections[index].send(json.dumps(a));
            
        if (b['command'] == 'done'):

            c= {
                "command" : "crosshairs",
                "coords"  : [ 20+index*10,20+index*20,20+index*30 ]
            };

            print(c);
            await connections[index].send(json.dumps(c));

        print(connections);

async def createWebsocket():
    async with websockets.serve(listen, "localhost", 8766):
        await asyncio.Future()  # run forever


createTemp();
#httpd=createServer();
asyncio.run(createWebsocket());
str=input('Hello')
#httpd.server_close();
str=input('Hello Again');
asyncio.run(main.send("Done"));



