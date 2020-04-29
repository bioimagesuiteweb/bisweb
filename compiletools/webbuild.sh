#!/bin/bash

EXTRA="$@"

IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"
BDIST=${BDIR}/dist


echo "_______________________________________________________________________"
echo "___ "
echo "___ Building web distributions"
echo "___ SRCDIR=${SRCDIR}, BDIR=${BDIR}"
echo "___ BDIST=${BDIST}"
echo "___"


mkdir -p ${BDIST}
mkdir -p ${BDIR}/install/zips
mkdir -p ${BDIR}/web
mkdir -p ${BDIR}/build/doc
touch ${BDIR}/web/LICENSE

# Create server zip file
cd ${SRCDIR}
touch ${BDIST}/a.zip
rm ${BDIST}/*zip

echo "_______________________________________________________________________"
echo "___"
echo "___ Invoking gulp"
echo "___"


gulp build ${EXTRA} 
gulp zip
mv ${BDIST}/*zip ${BDIR}/install/zips

echo "_______________________________________________________________________"
echo "___"
echo "___ Invoking npm pack"
echo "___"

cd ${SRCDIR}
gulp npmpack
cd ${BDIST}/biswebbrowser
npm pack
cp *tgz ${BDIR}/install/zips
cd ${BDIR}/install/zips


echo "_______________________________________________________________________"
echo "___"
echo "___ Listing files"
echo "___"
pwd
ls -lrt 

echo "_______________________________________________________________________"
echo "___"
echo "___ Done with Web distribution"
echo "___"
echo "_______________________________________________________________________"
