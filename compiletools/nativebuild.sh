#!/bin/bash

BISMAKEJ="-j8"


IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
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
      -DCMAKE_INSTALL_PREFIX=${BDIR}/install/wheel \
      -DBIS_USEGPL=ON -DBIS_GPL_DIR=${SRCDIR}/../gpl \
      -DBIS_USEINDIV=ON -DIGL_DIR=${BDIR}/igl \
      ${SRCDIR}/cpp

make ${BISMAKEJ} install


rm ${BDIR}/native/bisweb*python*sh
make package
cp bisweb*python*.sh ${BDIR}/install
cd ${BDIR}/install
echo "-----------------------------------------------------------------------"


cd ${BDIR}/install/wheel
python3 setup.py sdist bdist_wheel


echo "-----------------------------------------------------------------------"
cd ${BDIR}/install
rm bisweb*any.whl
rm bisweb*.tar.gz
cp ${BDIR}/install/wheel/dist/* .
pwd
ls -lrt *tar.gz *sh *whl


echo "-----------------------------------------------------------------------"
echo " Done with Python/Matlab Tools"
echo "-----------------------------------------------------------------------"
