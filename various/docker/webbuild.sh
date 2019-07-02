#!/bin/bash

BDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

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
