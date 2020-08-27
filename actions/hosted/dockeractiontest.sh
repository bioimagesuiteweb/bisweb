#!/bin/bash

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
BASE=$1
FIRST=$2
LAST=$3
BISWEBOS=`uname`


# Defaults basically all tests

if [ -z ${FIRST} ]; then
    if [ -z ${BIS_FIRST_TEST} ]; then
        FIRST=1
    else 
        FIRST=${BIS_FIRST_TEST}
    fi
fi

if [ -z ${LAST} ]; then
    if [ -z ${BIS_LAST_TEST} ]; then
        LAST=10000
    else 
        LAST=${BIS_LAST_TEST}
    fi
fi

echo "----------------------------------------------------------"
echo "+++ Running ${BISWEBOS} regression tests ${FIRST}:${LAST} (Inputs were ${BIS_FIRST_TEST}:${BIS_LAST_TEST})"
echo "----------------------------------------------------------"   
echo ""
sleep 1

# ------------------------------------------------------


if  [ -z ${BASE} ]; then
    BASE=/basedir
    
    if [ -d  /hostfiles ]; then
        # Running in persisent container, no need to build
        BASE=/hostfiles/biswebcontainer
    else
        # New container configure everything
        mkdir ${BASE}
        echo "+++ Creating base directory inside the container in ${BASE}"
        cd ${BASE}

        export PATH=/usr/local/bin:${PATH}
        cd ${BASE}
        mkdir -p bisweb
        cd bisweb
        /usr/local/bin/biswebconfig.sh
    fi
else
    echo "+++ Using BASE=${BASE}"
fi

# ------ Create output directories

BDIR=${BASE}/bisweb/src/build
OUTDIR=${BDIR}/output
mkdir -p ${OUTDIR}

LOGDIR=${OUTDIR}/logs/${BISWEBOS}
ELECTRON=${OUTDIR}/electron/${BISWEBOS}
BINARIES=${OUTDIR}/binaries/${BISWEBOS}
LIBRARIES=${OUTDIR}/libraries/${BISWEBOS}

mkdir -p ${OUTDIR}
mkdir -p ${LOGDIR}
mkdir -p ${ELECTRON}
mkdir -p ${BINARIES}
mkdir -p ${LIBRARIES}


echo "-- Temporary directories ${OUTDIR}"
ls ${OUTDIR}

# ------ Create testing files

RESULTFILE=${LOGDIR}/0_summary_results.txt
LOGFILE=${LOGDIR}/1_js_logfile.txt
LOGFILE2=${LOGDIR}/2_py_logfile.txt


cd ${BDIR}

echo "----------------------------------------------------------"  | tee ${LOGFILE}
echo "--- Regression testing JS" | tee -a ${LOGFILE}
echo "---" | tee -a ${LOGFILE}
cd wasm; 
ctest -I ${FIRST},${LAST} -V | tee  -a ${LOGFILE}


echo "----------------------------------------------------------"  | tee ${LOGFILE2}
echo "--- Regression testing Python" | tee -a ${LOGFILE2}
echo "---"  | tee -a ${LOGFILE2}
cd ../native

ctest -j2 -I ${FIRST},${LAST} -V | tee  -a  ${LOGFILE2}

echo "----------------------------------------------------------"   | tee -a ${LOGFILE2}

cd ${BDIR}

echo "------------------------------------" 
echo "--- Postprocessing Result"
echo "------------------------------------"

echo "...." > ${RESULTFILE}

echo "...." >> ${RESULTFILE}
echo ".... Javascript tests" >> ${RESULTFILE}
echo "...." >> ${RESULTFILE}
grep "Test   #" ${LOGFILE} >> ${RESULTFILE}
grep "Test  #" ${LOGFILE} >> ${RESULTFILE}
grep "Test #" ${LOGFILE} >> ${RESULTFILE}
grep "passed" ${LOGFILE} | grep "failed" >> ${RESULTFILE}
grep "Total Test time" ${LOGFILE} >> ${RESULTFILE}

echo "...." >> ${RESULTFILE}
echo "...." >> ${RESULTFILE}
echo ".... Python tests" >> ${RESULTFILE}
echo "...." >> ${RESULTFILE}
grep "Test   #" ${LOGFILE2} >> ${RESULTFILE}
grep "Test  #" ${LOGFILE2} >> ${RESULTFILE}
grep "Test #" ${LOGFILE2} >> ${RESULTFILE}
grep "passed" ${LOGFILE2} | grep "failed" >> ${RESULTFILE}
grep "Total Test time" ${LOGFILE2} >> ${RESULTFILE}
echo "...." >> ${RESULTFILE}


echo "Reading results file"
REPORT="$(cat ${RESULTFILE})"
REPORT="${REPORT//'%'/'%25'}"
REPORT="${REPORT//$'\n'/'%0A'}"
REPORT="${REPORT//$'\r'/'%0D'}"

echo "::set-output name=result::$REPORT"

# Now binaries
# First copy node.js and python packages
#


cp ${BDIR}/install/zips/*tgz ${BINARIES}

# Web and Electron Installer now
# ----------------------
cd ${BDIR}/..
gulp build -m

if  [  ${BISWEBOS} == "Linux" ] ; then
    # Web distribution from linux
    gulp zip
    mv ${BDIR}/dist/*zip ${BINARIES}
fi

# package for electron
gulp package

if  [  ${BISWEBOS} == "Darwin" ] ; then
    echo "On MacOS"
    mv ${BDIR}/dist/*dmg ${ELECTRON}
    cp ${BDIR}/native/*dylib ${LIBRARIES}
else
    echo "On Linux or windows"
    mv ${BDIR}/dist/*zip ${ELECTRON}
    cp ${BDIR}/native/*so ${LIBRARIES}
    cp ${BDIR}/native/*.dll ${LIBRARIES}
fi

#JS Build artifacts
cp ${BDIR}/wasm/*.js ${LIBRARIES}
cp ${BDIR}/wasm/*.wasm ${LIBRARIES}

echo "____________________________________________________________________________________"
echo "___"
echo "___ Output files stored are ${LOGFILE}, ${LOGFILE2} and ${RESULTFILE}"
echo "___   and binaries in ${BINARIES}, ${ELECTRON} and ${LIBRARIES}"
echo "___"
echo "____________________________________________________________________________________"
