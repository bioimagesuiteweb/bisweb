#!/bin/bash


BISMAKEJ="-j8"

BDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"
source ${BDIR}/emsdk_portable/emsdk_env.sh

echo "-----------------------------------------------------------------------"
echo "SRCDIR=${SRCDIR}, BDIR=${BDIR}"
echo "-----------------------------------------------------------------------"


# Now C++ Build for WASM
cd ${BDIR}/wasm

rm CMakeCache.txt
cmake -DCMAKE_TOOLCHAIN_FILE=${SRCDIR}/compiletools/Emscripten.cmake \
      -DEigen3_DIR=${BDIR}/eigen3/share/eigen3/cmake \
      -DCMAKE_CXX_FLAGS="-o0 -s WASM=1 -s TOTAL_MEMORY=512MB" \
      -DCMAKE_EXE_LINKER_FLAGS="--pre-js ${SRCDIR}/cpp/libbiswasm_pre.js --post-js ${SRCDIR}/cpp/libbiswasm_post.js" \
      -DCMAKE_VERBOSE_MAKEFILE=OFF \
      -DBIS_USEGPL=ON -DBIS_GPL_DIR=${SRCDIR}/../gpl \
      -DBIS_USEINDIV=ON -DIGL_DIR=${BDIR}/igl \
      ${SRCDIR}/cpp


make ${BISMAKEJ}
echo "-----------------------------------------------------------------------"
# Create npm package biswebbrowser
cd ${SRCDIR}
gulp build
gulp npmpack
cd ${BDIR}/dist/biswebbrowser
pwd
ls -l 
npm pack
cp *tgz ${BDIR}
exit


echo "-----------------------------------------------------------------------"
# Build NATIVE
cd ${BDIR}/native
rm CMakeCache.txt

cpcmake -DBIS_A_EMSCRIPTEN=OFF -DPYTHON_EXECUTABLE=`which python3` \
      -DEigen3_DIR=${BDIR}/eigen3/share/eigen3/cmake \
      -DCMAKE_VERBOSE_MAKEFILE=OFF \
      -DBIS_A_MATLAB=ON \
      -DBIS_USEGPL=ON -DBIS_GPL_DIR=${SRCDIR}/../gpl \
      -DBIS_USEINDIV=ON -DIGL_DIR=${BDIR}/igl \
      ${SRCDIR}/cpp
../cmake_full_native.sh
make ${BISMAKEJ}
make package
cp *.gz ${BDIR}

echo "-----------------------------------------------------------------------"
# END
cd ${BDIR}
ls -l *gz
node ${SRCDIR}/js/bin/bisweb -h


# Run quick tests
cd ${SRCDIR}/test
mocha   test_module.js --input local --last 2
python3 test_module.py --last 5

# Done
cd ${SRCDIR}

