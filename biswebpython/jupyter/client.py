import asyncio
import websockets

async def hello():
    async with websockets.connect("ws://localhost:8766") as websocket:
        str=input('message');
        await websocket.send(str);
        

asyncio.run(hello())
