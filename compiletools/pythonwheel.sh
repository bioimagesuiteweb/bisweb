#!/bin/bash

IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

echo "-----------------------------------------------------------------------"
echo "Assembling python package"
echo "-----------------------------------------------------------------------"

cd ${BDIR}/install

ORIG=${BDIR}/install/biswebpython
WHEEL=${BDIR}/install/wheel

rm -rf ${WHEEL}/biswebpython

#cp ${BDIR}/install/initial/__init__.py ${WHEEL}

echo ${ORIG}
echo ${WHEEL}

cp -r ${ORIG} ${WHEEL}
rm -rf ${WHEEL}/biswebpython/__pycache__
rm -rf ${WHEEL}/biswebpython/*/__pycache__
rm -rf ${WHEEL}/biswebpython/setpaths*

cd ${WHEEL}
python3 setup.py sdist bdist_wheel

echo "-----------------------------------------------------------------------"
cd ${BDIR}/install
rm bisweb*any.whl
rm bisweb*.tar.gz
cp ${BDIR}/install/wheel/dist/* .
pwd
ls -lrt *tar.gz *sh *whl


echo "-----------------------------------------------------------------------"
echo " Done with Python Wheel stuff"
echo "-----------------------------------------------------------------------"
