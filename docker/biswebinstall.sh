#!/bin/bash

BISMAKEJ="-j8"

BDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

echo "-----------------------------------------------------------------------"
echo "SRCDIR=${SRCDIR}, BDIR=${BDIR}"
echo "-----------------------------------------------------------------------"

cd ${BDIR}/install/
npm install -g biswebnode*tgz
chmod +x /usr/lib/node_modules/biswebnode/lib/dcm2nii_binaries/*/*

sh ${BDIR}/native/bisweb*python*sh --prefix=/usr/local --skip-license
