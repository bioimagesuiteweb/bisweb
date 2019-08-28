#!/bin/bash

EXTRA=""

IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

BDIST=${BDIR}/dist

mkdir -p ${BDIR}/web
mkdir -p ${BDIST}

touch ${BDIR}/web/LICENSE

# Create server zip file
cd ${SRCDIR}
touch ${BDIST}/a.zip
rm ${BDIST}/*zip

gulp build ${EXTRA} 
gulp zip
mv ${BDIST}/*zip ${BDIR}/install

# Create npm package biswebbrowser
cd ${SRCDIR}
gulp npmpack
cd ${BDIST}/biswebbrowser
npm pack
cp *tgz ${BDIR}/install
cd ${BDIR}/install


echo "-----------------------------------------------------------------------"
pwd
ls -lrt *tgz  *zip

echo "-----------------------------------------------------------------------"
echo " Done with Web Based Tools"
echo "-----------------------------------------------------------------------"
