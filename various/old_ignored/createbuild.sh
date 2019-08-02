#!/bin/bash

echo "------------------------------------------------------------------------------------"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DIR="${DIR}/../build"

mkdir -p ${DIR}
cd ${DIR}

echo "++++"
echo "++++ Installing Eigen3"
echo "++++"
mkdir -p ${DIR}/eigen3
cd ${DIR}/eigen3
unzip ${DIR}/../various/download/Eigen.zip


echo "++++"
echo "++++ Installing Emscripten"
echo "++++"


cd ${DIR}
tar xvfz ${DIR}/../various/download/emsdk-portable.tar.gz

cd emsdk_portable

chmod +x emsdk
python ${DIR}/emsdk_portable/emsdk update

echo "++++"
echo "++++ Emsdk install latest"
echo "++++"
python3 ${DIR}/emsdk_portable/emsdk install latest


echo "++++"
echo "++++ Emsdk activate latest"
echo "++++"
python3 ${DIR}/emsdk_portable/emsdk activate latest 

echo "++++"
echo "++++ Creating Build Directories"
echo "++++"

mkdir -p ${DIR}/web
mkdir -p ${DIR}/wasm
mkdir -p ${DIR}/native
mkdir -p ${DIR}/dist

echo "++++"
echo "++++ Creating scripts"
echo "++++"

cp ${DIR}/../config/setpaths_build.sh ${DIR}/setpaths.sh
cp ${DIR}/../compiletools/cmake.sh ${DIR}/cmake.sh
cp ${DIR}/../compiletools/ccmake.sh ${DIR}/ccmake.sh
cp ${DIR}/../compiletools/cmake_native.sh ${DIR}/cmake_native.sh
cp ${DIR}/../compiletools/ccmake_native.sh ${DIR}/ccmake_native.sh

chmod +x ${DIR}/cmake*.sh
chmod +x ${DIR}/ccmake*.sh




