#!/bin/bash

BISMAKEJ="-j8"
BDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

echo "SRC=${SRCDIR}, BDIR=${BDIR}"

mkdir -p ${BDIR}/install
rm -rf   ${BDIR}/install/bisweb


bash ${BDIR}/wasmbuild.sh
bash ${BDIR}/webbuild.sh
bash ${BDIR}/nativebuild.sh
bash ${BDIR}/testbuild.sh

