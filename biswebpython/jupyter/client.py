#!/usr/bin/env python

import asyncio
import websockets
import sys

async def hello(port,message,dowait=False,doquiet=False):

    url="ws://localhost:"+port;

    if (not doquiet):
        print('___ Testing',port,message);
        print('___ Url=',url);
        
    try:
        async with websockets.connect(url) as websocket:
            if (not doquiet):
                print('___ Sending=',message);
            await websocket.send(message);
            if (dowait):
                result = await websocket.recv()
                print(result)
                return result;
            else:
                return 'done'

    except:
        e = sys.exc_info()[0]
        print(e)
        return 0


l=len(sys.argv)
port=sys.argv[1];
command='';
doquiet=False;
dowait=False;

if (l>3):
    dowait=sys.argv[3];
    if (dowait=='True' or dowait=='1' or dowait=='true'):
        dowait=True;
    else:
        dowait=False;

if (l>4):
    doquiet=sys.argv[4];
    if (doquiet=='True' or doquiet=='1' or doquiet=='true'):
        doquiet=True;
    else:
        doquiet=False;
        

if (l>2):
    command=sys.argv[2];

if (len(command)<2):
    command=' {"command" : "getInfo" }'
    dowait=True

if (not doquiet):
    print('___ Executing port=',port,' command=',command,' wait=',dowait,'quiet=',doquiet);


asyncio.run(hello(port,command,dowait,doquiet))
