#!/bin/bash

echo "Updating bisweb source setup"
echo "---------------------------------------"
echo "1. update npm dependencies"

NV=`node -v | grep v10`
echo $NV
if [ -n "$NV" ]; then
    echo "___ Not using node.js v12, no need for shrinkwrap file"
else
    echo "___ Using node.js v12 or v14 -- adding shrinkwrap file"
    IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    cp ${IDIR}/npm-shrinkwrap-orig.json ${IDIR}/npm-shrinkwrap.json
fi

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
