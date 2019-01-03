#!/bin/bash


echo "Copying binary builds"
echo "------------------------------------------------------------------------------------"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DIR="${DIR}/../../build"
cd ${DIR}

WASMDIR=${DIR}/../various/wasm/

cp ${DIR}/web/libbiswasm_wasm.js ${WASMDIR}
cp ${DIR}/web/libbiswasm_nongpl_wasm.js ${WASMDIR}
cp ${DIR}/wasm/libbiswasm.js ${WASMDIR}
cp ${DIR}/wasm/libbiswasm_nongpl.js ${WASMDIR}
cp ${DIR}/wasm/libbiswasm.wasm ${WASMDIR}
cp ${DIR}/wasm/libbiswasm_nongpl.wasm ${WASMDIR}
cp ${DIR}/wasm/libbiswasm_wrapper.js ${WASMDIR}


echo "------------------------------------------------------------------------------------"



