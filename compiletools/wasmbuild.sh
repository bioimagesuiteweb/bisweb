#!/bin/bash

if [ "*${1}*" == "**" ]; then
    DOINSTALL="false"
else
    DOINSTALL="true"
fi

BISMAKEJ="-j2"
GENERATOR="Unix Makefiles"

IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

BISWEBOS=`uname | cut -f1 -d_`
MOCHA=`which mocha`

echo "___"
echo "___ Beginning WASM build on ${OS} INSTALL=${DOINSTALL}"
echo "___"

if  [  ${BISWEBOS} == "MINGW64" ] ; then
    BISMAKEJ=" "
    MAKE=`which nmake`
    MOCHA="${MOCHA}.cmd"
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
echo "___ MOCHA = ${MOCHA}"
echo "___ BISUSEAFNI=${BISUSEAFNI}"
echo "___ BISUSEGPL=${BISUSEGPL}"
echo "_______________________________________________________________________"



# Make standard directories if they do not exist
echo "___ "
echo "___ ensuring build directories and necessary js files exist"
echo "___ "
mkdir -p ${BDIR}/doc/doxgen
mkdir -p ${BDIR}/wasm
mkdir -p ${BDIR}/wasm/lib
mkdir -p ${BDIR}/wasm/lib/bin

F=${BDIR}/wasm/libbiswasm_wrapper.js
G=${BDIR}/wasm/biswasmdate.js

if [[ -f $F && -f $G ]]; then
    echo "___ Found core files ${F}"
    echo "___              and ${G}"
else
    echo "___ "
    echo "___ file ${F}"
    echo "___   or ${G} not found"
    echo "___ copying/creating necessary files to enable the first build"
    echo "___ "
    touch ${F}
    cp ${SRCDIR}/various/wasm/biswasmdate.js ${BDIR}/wasm
    ls -l ${BDIR}/wasm/*.js
fi

echo "_______________________________________________________________________"
echo "___ "
echo "___ Setting up emscripten paths"
echo "___ "

cd ${BDIR}
source ${BDIR}/emsdk_portable/emsdk_env.sh
echo "CMAKE = `which cmake`"
echo "EMSDK = ${EMSDK}"

# Now C++ Build for WASM
cd ${BDIR}/wasm
touch CMakeCache.txt
rm CMakeCache.txt
echo "_______________________________________________________________________"
echo "___ "
echo "___ Invoking cmake"
echo "___ "

cmake -G "${GENERATOR}" \
      -DCMAKE_TOOLCHAIN_FILE=${BDIR}/emsdk_portable/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake \
      -DEigen3_DIR=${BDIR}/eigen3/share/eigen3/cmake \
      -DMOCHA=${MOCHA} \
      -DBISWEB_USEAFNI=${BISUSEAFNI} \
      -DBISWEB_AFNI_DIR=${SRCDIR}/../afni/src \
      -DCMAKE_CXX_FLAGS="-o2 -s WASM=1 -s TOTAL_MEMORY=512MB -Wint-in-bool-context" \
      -DCMAKE_EXE_LINKER_FLAGS="__pre-js ${SRCDIR}/cpp/libbiswasm_pre.js __post-js ${SRCDIR}/cpp/libbiswasm_post.js" \
      -DCMAKE_INSTALL_PREFIX=${BDIR}/install \
      -DBIS_BUILDSCRIPTS=ON \
      -DCMAKE_VERBOSE_MAKEFILE=ON \
      -DBIS_USEGPL=${BISUSEGPL} -DBIS_GPL_DIR=${SRCDIR}/../gpl \
      -DIGL_DIR=${BDIR}/igl \
      -DBIS_USECPM=ON \
      ${SRCDIR}/cpp

echo "_______________________________________________________________________"
echo "___ "
echo "___ Invoking ${MAKE}"
echo "___ "

# Ensure wrappers are up to date
rm ${F} ${G}
"${MAKE}" ${BISMAKEJ}

if [ ${DOINSTALL} == "true" ]; then

    echo "_______________________________________________________________________"
    echo "___ "
    echo "___ ensuring install directories exist"
    echo "___ "
    
    mkdir -p ${BDIR}/install/zips
    mkdir -p ${BDIR}/install/web
    rm -rf ${BDIR}/install/bisweb
    mkdir -p ${BDIR}/install/bisweb

    echo "_______________________________________________________________________"
    echo "___ "
    echo "___ Invoking ${MAKE} install"
    echo "___ "
    "${MAKE}" install

    echo "_______________________________________________________________________"
    echo "___ "
    echo "___ Invoking npm pack"
    echo "___ "
    
    cd ${BDIR}/install/bisweb/
    npm pack
    mv *tgz ${BDIR}/install/zips
    
    cd ${BDIR}/install/zips
    pwd
    ls -lrt
else
    echo "_______________________________________________________________________"
    echo "___ "
    echo "___ not making install"
    echo "___ "
fi

echo "_______________________________________________________________________"
echo " Done with WASM and Command Line JS"
echo "_______________________________________________________________________"

