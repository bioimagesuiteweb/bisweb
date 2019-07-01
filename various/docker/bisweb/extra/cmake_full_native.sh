#!/bin/bash

BDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DIR=${BDIR}/..

echo "Source dir=${DIR}"

cmake -DBIS_A_EMSCRIPTEN=OFF -DPYTHON_EXECUTABLE=`which python3` \
      -DEigen3_DIR=${BDIR}/eigen3/share/eigen3/cmake \
      -DCMAKE_VERBOSE_MAKEFILE=ON \
      -DBIS_A_MATLAB=ON \
      -DBIS_USEGPL=ON -DBIS_GPL_DIR=/opt/bisweb/gpl \
      -DBIS_USEINDIV=ON -DIGL_DIR=/opt/bisweb/src/build/igl \
      ${DIR}/cpp
