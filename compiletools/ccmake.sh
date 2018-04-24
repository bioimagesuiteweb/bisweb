#!/bin/bash

BDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source ${BDIR}/emsdk_portable/emsdk_env.sh
DIR=${BDIR}/..

echo "Source dir=${DIR}"

ccmake -DCMAKE_TOOLCHAIN_FILE=${DIR}/compiletools/Emscripten.cmake -DEigen3_DIR=${BDIR}/eigen3/share/eigen3/cmake -DCMAKE_CXX_FLAGS="-o0 -s WASM=1 -s TOTAL_MEMORY=512MB" -DCMAKE_EXE_LINKER_FLAGS="--pre-js ${DIR}/cpp/libbiswasm_pre.js --post-js ${DIR}/cpp/libbiswasm_post.js" -DCMAKE_VERBOSE_MAKEFILE=ON  ${DIR}/cpp
