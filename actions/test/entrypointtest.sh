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
# Defaults basically all tests
FIRST=${BIS_FIRST_TEST}
LAST=${BIS_LAST_TEST}

if [ -z ${BIS_FIRST_TEST} ]; then
    FIRST=1
fi

if [ -z ${BIS_LAST_TEST} ]; then
    LAST=10000
fi

echo "----------------------------------------------------------"
echo "+++ Running regression tests ${FIRST}:${LAST} (Inputs were ${BIS_FIRST_TEST}:${BIS_LAST_TEST})"
echo "----------------------------------------------------------"   
echo ""
sleep 2


# ------------------------------------------------------
BASE = $1

if  [ -z ${BASE}]; then
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
    mkdir -p ${BASE}
    echo "+++ Creating base directory inside the container in ${BASE}"
    cd ${BASE}
    mkdir -p bisweb
    cd bisweb
    chmod +x ${BASE}/biswebconfig.sh
    ${BASE}/biswebconfig.sh
fi

BDIR=${BASE}/bisweb/src/build
LOGFILE=${BDIR}/logjs.txt
LOGFILE2=${BDIR}/logpy.txt
RESULTFILE=${BDIR}/result.txt
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

ctest -I ${FIRST},${LAST} -V | tee  -a  ${LOGFILE2}

echo "----------------------------------------------------------"   | tee -a ${LOGFILE2}

cd ${BDIR}

echo "------------------------------------" 
echo "--- Postprocessing Result"
echo "------------------------------------"

echo "...." > ${RESULTFILE}

echo "...." >> ${RESULTFILE}
echo ".... Javascript tests" >> ${RESULTFILE}
echo "...." >> ${RESULTFILE}
grep "Test #" ${LOGFILE} >> ${RESULTFILE}
grep "passed" ${LOGFILE} | grep "failed" >> ${RESULTFILE}
grep "Total Test time" ${LOGFILE} >> ${RESULTFILE}

echo "...." >> ${RESULTFILE}
echo "...." >> ${RESULTFILE}
echo ".... Python tests" >> ${RESULTFILE}
echo "...." >> ${RESULTFILE}
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

echo "------------------------------------" 
echo "--- Postprocessing Result Step2"
echo "------------------------------------"

echo "Reading full log file"
LOG="$(cat ${LOGFILE}  ${LOGFILE2})"
LOG="${LOG//'%'/'%25'}"
LOG="${LOG//$'\n'/'%0A'}"
LOG="${LOG//$'\r'/'%0D'}"
echo "::set-output name=logfile::$LOG"


