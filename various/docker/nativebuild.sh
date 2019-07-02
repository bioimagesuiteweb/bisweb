#!/bin/bash

BISMAKEJ="-j8"

BDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

echo "-----------------------------------------------------------------------"
# Build NATIVE
mkdir -p ${BDIR}/native
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

make ${BISMAKEJ} install
make package
cp *tar.gz ${BDIR}/install
cd ${BDIR}/install
echo "-----------------------------------------------------------------------"
pwd
ls -lrt *tgz *zip


echo "-----------------------------------------------------------------------"
echo " Done with Python/Matlab Tools"
echo "-----------------------------------------------------------------------"
