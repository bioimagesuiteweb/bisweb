#!/bin/bash


IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
CDIR="$( cd ${IDIR}/../compiletools && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

# Cleanup some old stuff
rm -rf ${BDIR}/install
rm -rf ${BDIR}/doc

echo ""
echo "*******************************************************"
echo ""
bash ${CDIR}/wasmbuild.sh install
echo ""
echo "*******************************************************"
echo ""
bash ${CDIR}/webbuild.sh -m
echo ""
echo "*******************************************************"
echo ""
bash ${CDIR}/nativebuild.sh install
echo ""
echo "*******************************************************"
echo ""
bash ${CDIR}/testbuild.sh


