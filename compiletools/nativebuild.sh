#!/bin/bash

if [ "*${1}*" == "**" ]; then
    DOINSTALL="false"
else
    DOINSTALL="true"
fi
BISWEBOS=`uname | cut -f1 -d_`
echo "___"
echo "___ Beginning Native C++ build on ${OS}, INSTALL=${DOINSTALL}"
echo "___"



BISMAKEJ="-j4"
GENERATOR="Unix Makefiles"
IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"
CDIR="$( cd ${IDIR}/../compiletools && pwd )"

if  [  ${BISWEBOS} == "MINGW64" ] ; then
    BISMAKEJ=" "
    MAKE=`which nmake`
    GENERATOR="NMake Makefiles"
else
    MAKE=`which make`
fi


echo "_______________________________________________________________________"
echo "___ SRCDIR=${SRCDIR}, BDIR=${BDIR}"
echo "___ OS=${BISWEBOS}"
echo "___ Make command=${MAKE} ${BISMAKEJ}"
echo "___ Generator=${GENERATOR}"
echo "___"

# Fake JS build
mkdir -p ${BDIR}/wasm
touch ${BDIR}/wasm/libbiswasm_wrapper.js

# Build NATIVE
mkdir -p ${BDIR}/native
cd ${BDIR}/native
touch CMakeCache.txt
rm CMakeCache.txt

echo "_______________________________________________________________________"
echo "___ "
echo "___ Invoking cmake"
echo "___ "


cmake -G "${GENERATOR}" \
      -DBIS_A_EMSCRIPTEN=OFF \
      -DCMAKE_BUILD_TYPE=Release \
      -DPYTHON_EXECUTABLE=`which python3` \
      -DEigen3_DIR=${BDIR}/eigen3/share/eigen3/cmake \
      -DCMAKE_VERBOSE_MAKEFILE=OFF \
      -DBIS_A_MATLAB=ON \
      -DCMAKE_INSTALL_PREFIX=${BDIR}/install \
      -DBIS_USEGPL=ON -DBIS_GPL_DIR=${SRCDIR}/../gpl \
      -DBIS_USEINDIV=ON -DIGL_DIR=${BDIR}/igl \
      ${SRCDIR}/cpp

echo "_______________________________________________________________________"
echo "___ "
echo "___ Invoking ${MAKE}"
echo "___ "

"${MAKE}" ${BISMAKEJ}

if [ ${DOINSTALL} == "true" ]; then

    echo "_______________________________________________________________________"
    echo "___ "
    echo "___ ensuring install directories exist"
    echo "___ "

    mkdir -p ${BDIR}/doc/doxgen
    mkdir -p ${BDIR}/install
    mkdir -p ${BDIR}/install/zips
    
    rm -rf ${BDIR}/install/biswebpython
    rm -rf ${BDIR}/install/biswebmatlab
    rm -rf ${BDIR}/install/wheel
    
    "${MAKE}" ${BISMAKEJ} install
    bash ${CDIR}/pythonwheel.sh
else
    echo "_______________________________________________________________________"
    echo "___ "
    echo "___ not making install"
    echo "___ "

fi

echo "_______________________________________________________________________"
echo "___ Done with Native Python/Matlab build"
echo "_______________________________________________________________________"





