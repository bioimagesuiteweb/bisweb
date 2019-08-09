#!/bin/bash

BISMAKEJ="-j8"
BDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

echo "SRC=${SRCDIR}, BDIR=${BDIR}"

#Install directories
mkdir -p ${BDIR}/install
rm -rf   ${BDIR}/install/bisweb

# Doc directory
mkdir -p ${BDIR}/doc/doxgen

bash ${BDIR}/wasmbuild.sh
bash ${BDIR}/webbuild.sh
bash ${BDIR}/nativebuild.sh
bash ${BDIR}/testbuild.sh

