#!/bin/bash

BDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SRCDIR="$( cd ${BDIR}/.. && pwd )"

cd ${BDIR}
node ${SRCDIR}/js/bin/bisweb -h

# Run quick tests
cd ${SRCDIR}/test
mocha   test_module.js --input local --last 2
python3 test_module.py --last 5

# Done
cd ${SRCDIR}
