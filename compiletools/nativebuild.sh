#!/bin/bash

BISMAKEJ="-j4"
MAKE=`which make`
GENERATOR="Unix Makefiles"


IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"
CDIR="$( cd ${IDIR}/../compiletools && pwd )"


BISWEBOS=`uname | cut -f1 -d_`
echo $OS
if  [  ${BISWEBOS} == "MINGW64" ] ; then
      BISMAKEJ=" "
      MAKE=`which nmake`
     GENERATOR="NMake Makefiles"
fi


echo "-----------------------------------------------------------------------"
echo "SRCDIR=${SRCDIR}, BDIR=${BDIR} CDIR=${CDIR}"
echo "OS=${BISWEBOS}, ${MAKEJ} ${BISWEBMAKEJ} ${GENERATOR}"
echo "-----------------------------------------------------------------------"



mkdir -p ${BDIR}/doc/doxgen
mkdir -p ${BDIR}/install
mkdir -p ${BDIR}/install/zips

rm -rf ${BDIR}/install/biswebpython
rm -rf ${BDIR}/install/biswebmatlab
rm -rf ${BDIR}/install/wheel


# Fake JS build
mkdir -p ${BDIR}/wasm
touch ${BDIR}/wasm/libbiswasm_wrapper.js

# Build NATIVE
mkdir -p ${BDIR}/native
cd ${BDIR}/native
touch CMakeCache.txt
rm CMakeCache.txt

cmake -G "${GENERATOR}" \
      -DBIS_A_EMSCRIPTEN=OFF \
      -DPYTHON_EXECUTABLE=`which python3` \
      -DEigen3_DIR=${BDIR}/eigen3/share/eigen3/cmake \
      -DCMAKE_VERBOSE_MAKEFILE=OFF \
      -DBIS_A_MATLAB=ON \
      -DCMAKE_INSTALL_PREFIX=${BDIR}/install \
      -DBIS_USEGPL=ON -DBIS_GPL_DIR=${SRCDIR}/../gpl \
      -DBIS_USEINDIV=ON -DIGL_DIR=${BDIR}/igl \
      ${SRCDIR}/cpp

"${MAKE}" ${BISMAKEJ} install

echo "-----------------------------------------------------------------------"
bash ${CDIR}/pythonwheel.sh

echo "-----------------------------------------------------------------------"
echo " Done with Python Wheel stuff"
echo "-----------------------------------------------------------------------"

cd ${BDIR}/install/zips
pwd
ls -lrt 


echo "-----------------------------------------------------------------------"
echo " Done with Python/Matlab Tools"
echo "-----------------------------------------------------------------------"
