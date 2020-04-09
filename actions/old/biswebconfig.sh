#!/bin/bash

BDIR="$(pwd )"
echo "-------------------------------------------------"
echo "Installing and building bisweb in $BDIR"
echo "-------------------------------------------------"
sleep 1

cd ${BDIR}
git clone https://github.com/bioimagesuiteweb/bisweb src

cd ${BDIR}/src
git branch -l
git checkout devel
git pull

#checkout bisweb gpl plugin source
cd ${BDIR}
git clone https://github.com/bioimagesuiteweb/gplcppcode gpl

echo "-------------------------------------------------"
echo "Installing prerequisites"
echo "-------------------------------------------------"
sleep 2


#Create BUILD Setup
cd ${BDIR}/src
npm install -d
node config/createbuild.js
python3 -m pip install --user -r biswebpython/config/requirements.txt

#Now C++ Build for WASM
cd ${BDIR}/src/build
echo "Copying files"

# Run dos2unix to convert and make executable
dos2unix ${BDIR}/src/build/*.sh
chmod +x ${BDIR}/src/build/*.sh
dos2unix ${BDIR}/src/compiletools/*.sh
chmod +x ${BDIR}/src/compiletools/*.sh

echo "-------------------------------------------------"
echo "Beginning build"
echo "-------------------------------------------------"
sleep 2

# Build
${BDIR}/src/compiletools/fullbuild.sh


cd ${BDIR}/src

echo "-------------------------------------------------"
echo "All set"
echo "-------------------------------------------------"
sleep 1










