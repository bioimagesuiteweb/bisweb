import asyncio
import websockets
import sys

async def hello(port,message):
    print('Testing',port,message);
    url="ws://localhost:"+port;
    print('Url=',url);
    try:
        async with websockets.connect(url) as websocket:
            print('W=',websocket)
            print('Sending=',message);
            await websocket.send(message);
    except:
        e = sys.exc_info()[0]
        print(e)
        return 0



    

print('sys.argv=',sys.argv)
asyncio.run(hello(sys.argv[1],sys.argv[2]))
