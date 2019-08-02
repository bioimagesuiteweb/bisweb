#!/bin/bash
#
# Copy this file in the emsdk-portable directory
#

echo "Copy this file in the emsdk-portable directory"

./emsdk update
./emsdk install clang-e1.38.30-64bit
./emsdk activate clang-e1.38.30-64bit
./emsdk install node-8.9.1-64bit
./emsdk activate node-8.9.1-64bit
./emsdk install  emscripten-1.38.30
./emsdk activate emscripten-1.38.30
./emsdk install sdk-1.38.30-64bit
./emsdk activate sdk-1.38.30-64bit

