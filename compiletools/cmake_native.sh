#!/bin/bash

BDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source ${BDIR}/emsdk_portable/emsdk_env.sh
DIR=${BDIR}/..

echo "Source dir=${DIR}"

cmake -DBIS_A_EMSCRIPTEN=OFF -DPYTHON_EXECUTABLE=`which python3` -DEigen3_DIR=${BDIR}/eigen3/share/eigen3/cmake -DCMAKE_VERBOSE_MAKEFILE=ON  ${DIR}/cpp
