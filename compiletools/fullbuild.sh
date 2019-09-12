#!/bin/bash

BISMAKEJ="-j8"
IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
CDIR="$( cd ${IDIR}/../compiletools && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

echo "SRC=${SRCDIR}, BDIR=${BDIR}"

rm -rf ${BDIR}/install
rm -rf ${BDIR}/installp
rm -rf ${BDIR}/doc

#Install directories
mkdir -p ${BDIR}/install
mkdir -p ${BDIR}/install/wheel

# Doc directory
mkdir -p ${BDIR}/doc/doxgen

bash ${CDIR}/wasmbuild.sh
bash ${CDIR}/webbuild.sh
bash ${CDIR}/nativebuild.sh
bash ${CDIR}/testbuild.sh


