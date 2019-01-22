#!/bin/bash


echo "Copying binary builds back to build directory"
echo "------------------------------------------------------------------------------------"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DIR="${DIR}/../../build"
cd ${DIR}

WASMDIR=${DIR}/../various/wasm/

cp ${WASMDIR}/libbiswasm_wasm.js ${DIR}/web/ 
cp ${WASMDIR}/libbiswasm_nongpl_wasm.js ${DIR}/web/ 
cp ${WASMDIR}/libbiswasm.js    ${DIR}/wasm/
cp ${WASMDIR}/libbiswasm_nongpl.js ${DIR}/wasm/
cp ${WASMDIR}/libbiswasm.wasm ${DIR}/wasm/
cp ${WASMDIR}/libbiswasm_nongpl.wasm ${DIR}/wasm/
cp ${WASMDIR}/libbiswasm_wrapper.js ${DIR}/wasm/


echo "------------------------------------------------------------------------------------"



