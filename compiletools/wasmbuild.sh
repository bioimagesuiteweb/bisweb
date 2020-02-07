#!/bin/bash

BISMAKEJ="-j8"

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


mkdir -p ${BDIR}/doc/doxgen
mkdir -p ${BDIR}/install
mkdir -p ${BDIR}/install/zips
mkdir -p ${BDIR}/wasm
mkdir -p ${BDIR}/wasm/lib
mkdir -p ${BDIR}/wasm/lib/bin
mkdir -p ${BDIR}/install
mkdir -p ${BDIR}/install/web

rm -rf ${BDIR}/install/bisweb
mkdir -p ${BDIR}/install/bisweb

# Now C++ Build for WASM
cd ${BDIR}/wasm
touch CMakeCache.txt
rm CMakeCache.txt
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


make ${BISMAKEJ} 
rm -rf ${BDIR}/install/bisweb
make install

cd ${BDIR}/install/bisweb/
npm pack
mv *tgz ${BDIR}/install/zips
echo "-----------------------------------------------------------------------"


cd ${BDIR}/install/zips
pwd
ls -lrt

echo "-----------------------------------------------------------------------"
echo " Done with WASM and Command Line JS"
echo "-----------------------------------------------------------------------"

