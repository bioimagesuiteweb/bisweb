#!/bin/bash

echo "Updating bisweb source setup"
echo "---------------------------------------"
echo "1. update npm dependencies"
npm install -d
echo "---------------------------------------"
echo "2. update python3 dependencies"
python3 -m pip install --user -r biswebpython/config/requirements.txt
echo "---------------------------------------"
echo "3. update build scripts"
dos2unix compiletools/*.sh
chmod +x compiletools/*.sh
node config/updatelinks.js
echo "---------------------------------------"
