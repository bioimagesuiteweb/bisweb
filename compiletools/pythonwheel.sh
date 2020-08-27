#!/bin/bash

IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

echo "_______________________________________________________________________"
echo "___ "
echo "___ Assembling python package"
echo "___ "

cd ${BDIR}/install

ORIG=${BDIR}/install/biswebpython
WHEEL=${BDIR}/install/wheel

rm -rf ${WHEEL}/biswebpython
cp -r ${ORIG} ${WHEEL}
rm -rf ${WHEEL}/biswebpython/__pycache__
rm -rf ${WHEEL}/biswebpython/*/__pycache__
rm -rf ${WHEEL}/biswebpython/setpaths*

cd ${WHEEL}

echo "_______________________________________________________________________"
echo "___"
echo "___ Invoking python3 setup.py"
echo "___"

python3 setup.py sdist

echo "_______________________________________________________________________"
echo "___"
echo "___ Looking at files"
echo "___"
cd ${BDIR}/install/zips
rm -rf bisweb*any.whl
rm -rf bisweb*.tar.gz
cp ${BDIR}/install/wheel/dist/* .
pwd
ls -lrt 



