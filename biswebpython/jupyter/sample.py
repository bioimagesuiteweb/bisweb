import http.server
import socketserver
import threading
import tempfile
import os
import asyncio
import websockets
import sys

os.chdir('/Users/xenios/bisweb/src/build/web');

httpd=0;

# Temporary Directory
# -------------------
def createTemp():
    tmp=tempfile.TemporaryDirectory(dir='/Users/xenios/bisweb/src/build/web');
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

async def echo(websocket):
    async for message in websocket:
        print('Received',message);
        print('Websocket=',websocket);
        print('Done');


async def createWebsocket():
    async with websockets.serve(echo, "localhost", 8766):
        await asyncio.Future()  # run forever


createTemp();
httpd=createServer();
asyncio.run(createWebsocket());
str=input('Hello')
httpd.server_close();
str=input('Hello Again');




