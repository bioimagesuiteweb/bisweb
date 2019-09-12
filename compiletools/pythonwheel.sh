#!/bin/bash

IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"


echo "-----------------------------------------------------------------------"
echo "Assembling python package"
echo "-----------------------------------------------------------------------"

cd ${BDIR}/install

ORIG=${BDIR}/install/bisweb
WHEEL=${BDIR}/install/wheel/biswebpython



rm -rf ${WHEEL}
mkdir -p ${WHEEL}
cp ${BDIR}/install/initial/__init__.py ${WHEEL}
cp ${ORIG}/python/*.py ${WHEEL}
cp ${ORIG}/python/*/*.py ${WHEEL}
cp ${ORIG}/lib/*.so ${WHEEL}
cp ${ORIG}/lib/*.dylib ${WHEEL}
cp ${ORIG}/lib/*.dll ${WHEEL}
cp ${ORIG}/lib/*.py ${WHEEL}
cp ${ORIG}/LICENSE ${WHEEL}
cp ${ORIG}/README_py.txt ${WHEEL}

#
# More needed here
# 
#
cd ${WHEEL}/..
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
