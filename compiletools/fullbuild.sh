#!/bin/bash


BISMAKEJ="-j8"

BDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"
source ${BDIR}/emsdk_portable/emsdk_env.sh

rm -rf ${BDIR}/install
mkdir -p ${BDIR}/install

echo "-----------------------------------------------------------------------"
echo "SRCDIR=${SRCDIR}, BDIR=${BDIR}"
echo "-----------------------------------------------------------------------"


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


make ${BISMAKEJ} install
cd ${BDIR}/install/bisweb
npm pack
mv *tgz ${BDIR}
cd ${BDIR}
ls -lrt *tgz
echo "-----------------------------------------------------------------------"
echo " Done with WASM and Command Line JS"
echo "-----------------------------------------------------------------------"

# Create server zip file
cd ${SRCDIR}
touch ${BDIR}/dist/a.zip
rm ${BDIR}/dist/*zip

gulp build 
gulp zip
mv ${BDIR}/dist/*zip ${BDIR}

# Create npm package biswebbrowser
cd ${SRCDIR}
gulp npmpack
cd ${BDIR}/dist/biswebbrowser
npm pack
cp *tgz ${BDIR}
cd ${BDIR}/dist/
ls -lrt *tgz

echo "-----------------------------------------------------------------------"
echo " Done with Web Based Tools"
echo "-----------------------------------------------------------------------"


echo "-----------------------------------------------------------------------"
# Build NATIVE
cd ${BDIR}/native
touch CMakeCache.txt
rm CMakeCache.txt

cmake -DBIS_A_EMSCRIPTEN=OFF -DPYTHON_EXECUTABLE=`which python3` \
      -DEigen3_DIR=${BDIR}/eigen3/share/eigen3/cmake \
      -DCMAKE_VERBOSE_MAKEFILE=OFF \
      -DBIS_A_MATLAB=ON \
      -DCMAKE_INSTALL_PREFIX=${BDIR}/install \
      -DBIS_USEGPL=ON -DBIS_GPL_DIR=${SRCDIR}/../gpl \
      -DBIS_USEINDIV=ON -DIGL_DIR=${BDIR}/igl \
      ${SRCDIR}/cpp
../cmake_full_native.sh
make ${BISMAKEJ} install
make package
cp *tar.gz ${BDIR}
cd {$BDIR}
ls -lrt *tgz


echo "-----------------------------------------------------------------------"
echo " Done with Python/Matlab Tools"
echo "-----------------------------------------------------------------------"

# END
cd ${BDIR}
node ${SRCDIR}/js/bin/bisweb -h


# Run quick tests
cd ${SRCDIR}/test
mocha   test_module.js --input local --last 2
python3 test_module.py --last 5

# Done
cd ${SRCDIR}

