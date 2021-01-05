#!/bin/bash

if [ "*${1}*" == "**" ]; then
    DOINSTALL="false"
else
    DOINSTALL="true"
fi
BISWEBOS=`uname | cut -f1 -d_`

ARM=`uname -a | cut -f2 -d/ | cut -f2 -d_`
ARMARCH=""
if [ ${ARM} == "ARM64" ]; then
    ARM="TRUE"
    ARMARCH=-DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"
else
    ARM="FALSE"
fi



echo "___"
echo "___ Beginning Native C++ build on ${OS} ( ARM=${ARM} ${ARMARCH}), INSTALL=${DOINSTALL}"
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

BISUSEAFNI="OFF"
BISUSEGPL="OFF"

if [ -d ${SRCDIR}/../afni/src  ]
then
    BISUSEAFNI="ON"
fi

if [ -d ${SRCDIR}/../gpl  ]
then
    BISUSEGPL="ON"
fi


echo "_______________________________________________________________________"
echo "___ SRCDIR=${SRCDIR}, BDIR=${BDIR}"
echo "___ OS=${BISWEBOS}"
echo "___ Make command=${MAKE} ${BISMAKEJ}"
echo "___ Generator=${GENERATOR}"
echo "___ BISUSEAFNI=${BISUSEAFNI}"
echo "___ BISUSEGPL=${BISUSEGPL}"
echo "_______________________________________________________________________"



F=${BDIR}/wasm/libbiswasm_wrapper.js
G=${BDIR}/wasm/biswasmdate.js

if [[ -f $F && -f $G ]]; then
    echo "___ Found core files ${F}"
    echo "___              and ${G}"
else
    echo "___ "
    echo "___ file ${F}"
    echo "___   or ${G} not found"
    echo "___ faking a wasm build to enable wrapper scripts to run for native build"
    echo "___ "
    touch ${F}
    cp ${SRCDIR}/various/wasm/biswasmdate.js ${BDIR}/wasm
    ls -l ${BDIR}/wasm/*.js
fi


# Build NATIVE
mkdir -p ${BDIR}/native
cd ${BDIR}/native
touch CMakeCache.txt
rm CMakeCache.txt

echo "_______________________________________________________________________"
echo "___ "
echo "___ Invoking cmake"
echo "___ "


cmake -G "${GENERATOR}" ${ARMARCH}\
      -DBIS_A_EMSCRIPTEN=OFF \
      -DCMAKE_BUILD_TYPE=Release \
      -DPYTHON_EXECUTABLE=`which python3` \
      -DEigen3_DIR=${BDIR}/eigen3/share/eigen3/cmake \
      -DCMAKE_VERBOSE_MAKEFILE=OFF \
      -DBISWEB_USEAFNI=${BISUSEAFNI} \
      -DBISWEB_AFNI_DIR=${SRCDIR}/../afni/src \
      -DBIS_A_MATLAB=ON \
      -DCMAKE_INSTALL_PREFIX=${BDIR}/install \
      -DBIS_USEGPL=${BISUSEGPL} -DBIS_GPL_DIR=${SRCDIR}/../gpl \
      -DIGL_DIR=${BDIR}/igl \
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





