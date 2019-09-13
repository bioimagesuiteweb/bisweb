#!/bin/bash

BISMAKEJ="-j8"
IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
CDIR="$( cd ${IDIR}/../compiletools && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

echo "SRC=${SRCDIR}, BDIR=${BDIR}"

# Cleanup some old stuff
rm -rf ${BDIR}/install
rm -rf ${BDIR}/doc

bash ${CDIR}/wasmbuild.sh
bash ${CDIR}/webbuild.sh
bash ${CDIR}/nativebuild.sh
bash ${CDIR}/testbuild.sh


