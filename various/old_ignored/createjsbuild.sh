#!/bin/bash

echo "------------------------------------------------------------------------------------"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DIR="${DIR}/../build"

mkdir -p ${DIR}
cd ${DIR}

mkdir -p ${DIR}/web
mkdir -p ${DIR}/wasm
mkdir -p ${DIR}/dist

WASMDIR=${DIR}/../various/wasm/

cp ${WASMDIR}/libbiswasm_wasm.js ${DIR}/web/ 
cp ${WASMDIR}/libbiswasm_nongpl_wasm.js ${DIR}/web/ 
cp ${WASMDIR}/libbiswasm.js    ${DIR}/wasm/
cp ${WASMDIR}/libbiswasm_nongpl.js ${DIR}/wasm/
cp ${WASMDIR}/libbiswasm.wasm ${DIR}/wasm/
cp ${WASMDIR}/libbiswasm_nongpl.wasm ${DIR}/wasm/
cp ${WASMDIR}/libbiswasm_wrapper.js ${DIR}/wasm/

echo "------------------------------------------------------------------------------------"



