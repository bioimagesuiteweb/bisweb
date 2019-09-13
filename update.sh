#!/bin/bash

echo "Updating bisweb source setup"
echo "---------------------------------------"
echo "1. update npm dependencies"
npm install -d
echo "---------------------------------------"
echo "2. update python3 dependencies"
pip3 install -r biswebpython/config/requirements.txt
echo "---------------------------------------"
echo "3. update build scripts"
node config/createsimple.js
echo "---------------------------------------"
