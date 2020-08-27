#!/bin/bash

IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BDIR="$( cd ${IDIR}/../build && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"


echo "_______________________________________________________________________"
echo "___ "
echo "___ Running smoke test"
echo "___ SRCDIR=${SRCDIR}, BDIR=${BDIR}"
echo "___"
cd ${BDIR}
node ${SRCDIR}/js/bin/bisweb -h

echo "_______________________________________________________________________"
echo "___ "
echo "___ Running quick tests"

cd ${SRCDIR}/test
mocha   test_module.js --input local --last 2
python3 test_module.py --last 5 --input local

echo "_______________________________________________________________________"
echo "___"
echo "___ done with smoke and quick tests"
echo "___"
