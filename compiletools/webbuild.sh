#!/bin/bash

EXTRA="$@"

IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

BDIST=${BDIR}/dist

mkdir -p ${BDIST}
mkdir -p ${BDIR}/install/zips
mkdir -p ${BDIR}/web

touch ${BDIR}/web/LICENSE

# Create server zip file
cd ${SRCDIR}
touch ${BDIST}/a.zip
rm ${BDIST}/*zip

gulp build ${EXTRA} 
gulp zip
mv ${BDIST}/*zip ${BDIR}/install/zips

# Create npm package biswebbrowser
cd ${SRCDIR}
gulp npmpack
cd ${BDIST}/biswebbrowser
npm pack
cp *tgz ${BDIR}/install/zips
cd ${BDIR}/install/zips


echo "-----------------------------------------------------------------------"
pwd
ls -lrt 

echo "-----------------------------------------------------------------------"
echo " Done with Web Based Tools"
echo "-----------------------------------------------------------------------"
