#!/bin/bash

BISMAKEJ="-j8"

IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

echo "-----------------------------------------------------------------------"
echo "SRCDIR=${SRCDIR}, BDIR=${BDIR}"
echo "-----------------------------------------------------------------------"

cd ${BDIR}/install/
npm install -g biswebnode*tgz
chmod +x /usr/lib/node_modules/biswebnode/lib/dcm2nii_binaries/*/*

echo "biswebnode node.js package installed. Type biswebnode to access"

sh ${BDIR}/native/bisweb*python*sh --prefix=/usr/local --skip-license

echo "bisweb python3 package installed. See /usr/local/bisweb"
