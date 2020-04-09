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
echo "+++ New push into devel, running quick test"
echo "----------------------------------------------------------"   

BASE=/basedir

if [ -d  /hostfiles ]; then
    BASE=/hostfiles/biswebcontainer

FIRST=10
LAST=12
BDIR=${BASE}/bisweb/src/build
LOGFILE=${BDIR}/log.txt
RESULTFILE=${BDIR}/result.txt
cd ${BDIR}

echo "----------------------------------------------------------"  | tee ${LOGFILE}
echo "--- Regression testing JS" | tee -a ${LOGFILE}
echo "---" | tee -a ${LOGFILE}
cd wasm; 
ctest -I ${FIRST},${LAST} -V | tee  -a ${LOGFILE}


echo "----------------------------------------------------------"  | tee -a ${LOGFILE}
echo "--- Regression testing Python" | tee -a ${LOGFILE}
echo "---"  | tee -a ${LOGFILE}
cd ../native

#ctest -I ${FIRST},${LAST} -V | tee  -a  ${LOGFILE}

echo "----------------------------------------------------------"   | tee -a ${LOGFILE}


cd ${BDIR}
rm ${RESULTFILE}

echo "------------------------------------" 
echo "--- Postprocessing Result"
echo "------------------------------------"

grep "Test #" ${LOGFILE} > ${RESULTFILE}
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
LOG="$(cat ${LOGFILE} | tee)"
LOG="${LOG//'%'/'%25'}"
LOG="${LOG//$'\n'/'%0A'}"
LOG="${LOG//$'\r'/'%0D'}"
echo "::set-output name=logfile::$LOG"

