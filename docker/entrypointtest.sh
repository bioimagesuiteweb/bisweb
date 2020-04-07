#!/bin/bash

# From https://denibertovic.com/posts/handling-permissions-with-docker-volumes/
# Add local user
# Either use the LOCAL_USER_ID if passed in at runtime or
# fallback to 9001

echo "----------------------------------------------------------"

cat<<TF

 #####      #     ####   #    #  ######  #####
 #    #     #    #       #    #  #       #    #
 #####      #     ####   #    #  #####   #####
 #    #     #         #  # ## #  #       #    #
 #    #     #    #    #  ##  ##  #       #    #
 #####      #     ####   #    #  ######  #####

TF
echo "----------------------------------------------------------"

BASE=/basedir
mkdir ${BASE}

echo "+++ Creating base directory inside the container in ${BASE}"
cd ${BASE}

export PATH=/usr/local/bin:${PATH}

cd ${BASE}
mkdir -p bisweb
cd bisweb
/usr/local/bin/biswebconfig.sh


cd ${BASE}/bisweb/src/build
echo "----------------------------------------------------------"   
echo "--- Regression testing JS"
echo "---"
cd wasm; ctest -V


echo "----------------------------------------------------------"   
echo "--- Regression testing Python"
echo "---"
cd ../native; ctest -V


echo "----------------------------------------------------------"   


