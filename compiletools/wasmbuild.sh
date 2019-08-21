#!/bin/bash

BISMAKEJ="-j8"

IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

echo "-----------------------------------------------------------------------"
echo "SRCDIR=${SRCDIR}, BDIR=${BDIR}"
echo "-----------------------------------------------------------------------"

cd ${BDIR}
source ${BDIR}/emsdk_portable/emsdk_env.sh



mkdir -p ${BDIR}/wasm
mkdir -p ${BDIR}/wasm/lib
mkdir -p ${BDIR}/wasm/lib/bin
mkdir -p ${BDIR}/install



# Now C++ Build for WASM
cd ${BDIR}/wasm
touch CMakeCache.txt
rm CMakeCache.txt
cmake -DCMAKE_TOOLCHAIN_FILE=${SRCDIR}/compiletools/Emscripten.cmake \
      -DEigen3_DIR=${BDIR}/eigen3/share/eigen3/cmake \
      -DCMAKE_CXX_FLAGS="-o0 -s WASM=1 -s TOTAL_MEMORY=512MB" \
      -DCMAKE_EXE_LINKER_FLAGS="--pre-js ${SRCDIR}/cpp/libbiswasm_pre.js --post-js ${SRCDIR}/cpp/libbiswasm_post.js" \
      -DCMAKE_INSTALL_PREFIX=${BDIR}/install \
      -DBIS_BUILDSCRIPTS=ON \
      -DCMAKE_VERBOSE_MAKEFILE=OFF \
      -DBIS_USEGPL=ON -DBIS_GPL_DIR=${SRCDIR}/../gpl \
      -DBIS_USEINDIV=ON -DIGL_DIR=${BDIR}/igl \
      ${SRCDIR}/cpp


make ${BISMAKEJ} 
rm -rf ${BDIR}/install/bisweb
make install

cd ${BDIR}/install/bisweb
npm pack
mv *tgz ${BDIR}/install
echo "-----------------------------------------------------------------------"


cd ${BDIR}/install
pwd
ls -lrt *tgz *.tar.gz *zip

echo "-----------------------------------------------------------------------"
echo " Done with WASM and Command Line JS"
echo "-----------------------------------------------------------------------"

