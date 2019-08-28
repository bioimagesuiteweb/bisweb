echo "------------------------------------------------------------------------------------"

export PATH=/usr/bin:${PATH}

IDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DIR="$( cd ${IDIR}/.. && pwd )"

echo "DIR=${DIR}"

EDIR=${DIR}/emsdk_portable/
source ${EDIR}/emsdk_env.sh


export PATH=${DIR}/js/bin:${DIR}/js/scripts:${DIR}/python/modules:${DIR}/python/scripts:${PATH}

echo "------------------------------------------------------------------------------------"
echo "----"
echo "---- BISWEB build paths set."
echo "---- Node.js is at `which node`"
echo "---- Emscripen is installed in ${EDIR}"
echo "---- Source is installed in ${DIR}"
echo "---- PATH=${PATH}"

echo "------------------------------------------------------------------------------------"

