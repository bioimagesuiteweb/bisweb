#!/bin/bash

IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

echo "-----------------------------------------------------------------------"
echo "SRCDIR=${SRCDIR}, BDIR=${BDIR}"
echo "-----------------------------------------------------------------------"

cd ${BDIR}
echo "${BDIR}/emsdk_portable/emsdk_env.sh"

source ${BDIR}/emsdk_portable/emsdk_env.sh
echo $PATH

cmake -DCMAKE_TOOLCHAIN_FILE=${BDIR}/emsdk_portable/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake \
      -DEigen3_DIR=${BDIR}/eigen3/share/eigen3/cmake \
      -DCMAKE_CXX_FLAGS="-o2 -s WASM=1 -s TOTAL_MEMORY=512MB -Wint-in-bool-context" \
      -DCMAKE_EXE_LINKER_FLAGS="--pre-js ${SRCDIR}/cpp/libbiswasm_pre.js --post-js ${SRCDIR}/cpp/libbiswasm_post.js" \
      -DCMAKE_INSTALL_PREFIX=${BDIR}/install \
      -DBIS_BUILDSCRIPTS=ON \
      -DCMAKE_VERBOSE_MAKEFILE=ON \
      -DBIS_USEGPL=ON -DBIS_GPL_DIR=${SRCDIR}/../gpl \
      -DBIS_USEINDIV=ON -DIGL_DIR=${BDIR}/igl \
      -DBIS_USECPM=ON \
      ${SRCDIR}/cpp
