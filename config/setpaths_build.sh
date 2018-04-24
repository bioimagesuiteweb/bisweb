echo "------------------------------------------------------------------------------------"

export PATH=/usr/bin:${PATH}

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

EDIR=${DIR}/emsdk_portable/
source ${EDIR}/emsdk_env.sh

SDIR=`realpath ${DIR}/..`
export PATH=${SDIR}/js/bin:${SDIR}/js/scripts:${PATH}

echo "------------------------------------------------------------------------------------"
echo "----"
echo "---- BISWEB build paths set."
echo "---- Node.js is at `which node`"
echo "---- Emscripen is installed in ${EDIR}"
echo "---- Source is installed in ${SDIR}"
echo "---- PATH=${PATH}"

echo "------------------------------------------------------------------------------------"

