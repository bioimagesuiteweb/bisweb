# LICENSE
# 
# _This file is Copyright 2018 by the Image Processing and Analysis Group (BioImage Suite Team). Dept. of Radiology & Biomedical Imaging, Yale School of Medicine._
# 
# BioImage Suite Web is licensed under the Apache License, Version 2.0 (the "License");
# 
# - you may not use this software except in compliance with the License.
# - You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
# 
# __Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.__
# 
# ENDLICENSE

cmake_minimum_required(VERSION 3.5)

PROJECT(BISWEB)

SET (BISWEB_VERSION "1.0.0b3")

# ------------------------------------------------------------------------------------------------------------------------------------------------
# Core Project
# ------------------------------------------------------------------------------------------------------------------------------------------------
SET (CPP_SOURCE_DIR ${PROJECT_SOURCE_DIR})
GET_FILENAME_COMPONENT(TOOLS_DIR ${PROJECT_SOURCE_DIR}/../compiletools ABSOLUTE)
GET_FILENAME_COMPONENT(TEST_DIR ${PROJECT_SOURCE_DIR}/../test ABSOLUTE)
GET_FILENAME_COMPONENT(JSMODULES_DIR ${PROJECT_SOURCE_DIR}/../js/modules ABSOLUTE)
GET_FILENAME_COMPONENT(PYTHONMODULE_DIR ${PROJECT_SOURCE_DIR}/../python/modules ABSOLUTE)
GET_FILENAME_COMPONENT(SCRIPT_DIR ${PROJECT_SOURCE_DIR}/bin ABSOLUTE)
SET (WRAP_SCRIPT ${TOOLS_DIR}/bis_create_wrappers.js)
SET (DESCRIPTION_SCRIPT ${TOOLS_DIR}/bis_createmoduledescriptions.js)
SET (BISWEB_PYTHON_INIT ${PROJECT_SOURCE_DIR}/../config/__init__.py)
SET (BISWEB_PYTHON_PATH ${PROJECT_SOURCE_DIR}/../config/bis_path.py)
SET (MODULE_LIST_FILENAME ${PROJECT_SOURCE_DIR}/ModuleList.txt)
SET (PYTHON_MODULE_LIST_FILENAME ${PROJECT_SOURCE_DIR}/PythonModuleList.txt)
FIND_PROGRAM(NodeInterp node)

# ---------------------------------------------------------------------------------------------
# JS Stuff
# ---------------------------------------------------------------------------------------------
SET(LIBNAME libbiswasm)
SET (PRE_JS "${PROJECT_SOURCE_DIR}/js/libbiswasm_pre.js")
SET (POST_JS "${PROJECT_SOURCE_DIR}/js/libbiswasm_post.js")
SET (JS_WRAP_OUTPUT ${EXECUTABLE_OUTPUT_PATH}/libbiswasm_wrapper.js)

# ---------------------------------------------------------------------------------------------
# Native/Python/Matlab Stuff
# ---------------------------------------------------------------------------------------------
SET(CLIBNAME biswasm)
SET (HEADER_SCRIPT ${TOOLS_DIR}/bis_create_matlab_header_file.js)


# ---------------------------------------------------------------------------------------------
# SOURCE Files and GPL Flags
# ---------------------------------------------------------------------------------------------

OPTION(BIS_USEGPL "Include the GPL-licensed C++ files (plugin)" OFF)
OPTION(BIS_USEEXTERNAL "Include additional external C++ files (plugin)" OFF)
MARK_AS_ADVANCED(BIS_USEGPL)
MARK_AS_ADVANCED(BIS_USEEXTERNAL)


IF (BIS_USEGPL)

  FIND_PATH(BIS_GPL_DIR BisWebExtra.cmake  REQUIRED)
  get_filename_component(BIS_GPL_DIR ${BIS_GPL_DIR} ABSOLUTE)
  MESSAGE("-- Using GPL Licensed Code from ${BIS_GPL_DIR}")
  INCLUDE (${BIS_GPL_DIR}/BisWebExtra.cmake)
  
  SET (EXTRASRCS ${GPLSOURCES})
ELSE (BIS_USEGPL)
  SET (EXTRASRCS nongpl/bisReplacementExportedFunctions.cpp)
ENDIF (BIS_USEGPL)


IF (BIS_USEEXTERNAL)
  #
  # This should sdefine two variables
  #    (1) EXTERNALSOURCES -- list of C++ file to compile
  #    (2) EXTERNALHEADERS -- list of .h files containing function headers
  #        to create js/python functions for
  #
  FIND_PATH(BIS_EXTERNAL_DIR BisWebExtra.cmake  REQUIRED)
  get_filename_component(BIS_EXTERNAL_DIR ${BIS_EXTERNAL_DIR} ABSOLUTE)
  MESSAGE("-- Using EXTERNAL Licensed Code from ${BIS_EXTERNAL_DIR}")
  INCLUDE (${BIS_EXTERNAL_DIR}/BisWebExtra.cmake)
  SET (EXTRASRCS ${EXTRASRCS} ${EXTERNALSOURCES})
ENDIF (BIS_USEEXTERNAL)

    
SET(KITSRCS
  b_jsmn.c
  bisDataTypes.cpp
  bisUtil.cpp
  bisEigenUtil.cpp
  bisMemoryManagement.cpp
  bisLegacyFileSupport.cpp
  bisObject.cpp
  bisDataObject.cpp
  bisJSONParameterList.cpp
  bisAbstractTransformation.cpp
  bisTransformationCollection.cpp
  bisMatrixTransformation.cpp
  bisIdentityTransformation.cpp
  bisLinearTransformation.cpp
  bisGridTransformation.cpp
  bisComboTransformation.cpp
  bisDataObjectFactory.cpp
  bisSimpleImageSegmentationAlgorithms.cpp
  bisfMRIAlgorithms.cpp
  bisJointHistogram.cpp
  bisExportedFunctions.cpp
  bisExportedFunctions2.cpp
  bisTesting.cpp
  ${EXTRASRCS}
)



FILE(GLOB H1 ${CPP_SOURCE_DIR}/b*.h)
FILE(GLOB H2 ${CPP_SOURCE_DIR}/b*.txx)
SET(HEADERS ${H1} ${H2})

# Read the modules
FILE (STRINGS ${MODULE_LIST_FILENAME} MODULES)

set (JSMODULES )
foreach(item ${MODULES})
  SET (JSMODULES ${JSMODULES} "${JSMODULES_DIR}/${item}.js")
endforeach(item ${MODULES})


# ---------------------------------------------------------------------------------------------
# PARSE HEADERS
# ---------------------------------------------------------------------------------------------
SET(PARSE_HEADERS
  ${CPP_SOURCE_DIR}/bisDefinitions.h
  ${CPP_SOURCE_DIR}/bisExportedFunctions.h
  ${CPP_SOURCE_DIR}/bisExportedFunctions2.h
  ${CPP_SOURCE_DIR}/bisTesting.h
  ) 

IF (BIS_USEGPL)
  SET(PARSE_HEADERS
    ${PARSE_HEADERS}
    ${GPLHEADERS}
    )
ELSE (BIS_USEGPL)
  SET(PARSE_HEADERS
    ${PARSE_HEADERS}
    ${CPP_SOURCE_DIR}/nongpl/bisReplacementExportedFunctions.h
    )
ENDIF (BIS_USEGPL)

IF (BIS_USEEXTERNAL)
  SET(PARSE_HEADERS
    ${PARSE_HEADERS}
    ${EXTERNALHEADERS}
  )
ENDIF (BIS_USEEXTERNAL)


STRING(REGEX REPLACE ";" "," PARSE_LIST "${PARSE_HEADERS}")

# ---------------------------------------------------------------------------------------------
# Global Configuration flags
# ---------------------------------------------------------------------------------------------

INCLUDE(CTest)
FIND_PACKAGE(Eigen3 REQUIRED)
SET (CMAKE_VERBOSE_MAKEFILE ON)

IF (WIN32)
  OPTION(BIS_A_EMSCRIPTEN "Use Emscripten" OFF)
ELSE (WIN32)
  OPTION(BIS_A_EMSCRIPTEN "Use Emscripten" ON)
ENDIF (WIN32)


OPTION(BIS_UNITTEST "Enable Unit Tests" ON)
MARK_AS_ADVANCED(BIS_UNITTEST)
OPTION(BIS_MODULETEST "Enable MODULE Tests" ON)
MARK_AS_ADVANCED(BIS_MODULETEST)

OPTION(BIS_INSTALLTESTS "Install Module Tests & Data" OFF)
MARK_AS_ADVANCED(BIS_INSTALLTESTS)

# ---------------------------------------------------------------------------------------------
# License File depending on whether we are using the GPL plugin or not
# ---------------------------------------------------------------------------------------------

IF (BIS_USEGPL)
  SET (LICENSE_FILE "${PROJECT_SOURCE_DIR}/../various/txt/gpl_license.txt")
ELSE (BIS_USEGPL)
  SET (LICENSE_FILE "${PROJECT_SOURCE_DIR}/../various/txt/apache_license.txt")
ENDIF (BIS_USEGPL)

install (FILES ${LICENSE_FILE} DESTINATION bisweb/ RENAME LICENSE)

install (FILES ${PROJECT_SOURCE_DIR}/../web/images/mean_reg2mean.nii.gz DESTINATION bisweb/images)
install (FILES ${PROJECT_SOURCE_DIR}/../web/images/facemask_char.nii.gz DESTINATION bisweb/images)


IF (BIS_A_EMSCRIPTEN)

  # ---------------------------------------------------------------------------------------------
  # Web Assembly Mode
  # ---------------------------------------------------------------------------------------------
  
  OPTION(BIS_WEB_WASM "Build webassembly instead of asm.js" ON)
  SET (BIS_WEB_OPT "-O2" CACHE STRING "BIS Compiler Optimization")
  #  SET (BIS_WEB_MEMORY "1024" CACHE STRING "BIS Initial Memory in MB")

  
  # SET VARIABLES
 
  IF (BIS_WEB_WASM)
    SET(WASM_STRING "-s WASM=1 -s ALLOW_MEMORY_GROWTH=1")
  ELSE(BIS_WEB_WASM)
    SET(WASM_STRING "")
  ENDIF(BIS_WEB_WASM)
  
  SET( COMPILE_FLAGS "-Wall -DBISWASM ${BIS_WEB_OPT} ${WASM_STRING} -I ${EIGEN3_INCLUDE_DIRS} -I ${PROJECT_SOURCE_DIR}")
  SET (CMAKE_CXX_FLAGS ${COMPILE_FLAGS} CACHE STRING "" FORCE)
  SET (CMAKE_C_FLAGS ${COMPILE_FLAGS} CACHE STRING "" FORCE)
  SET (CMAKE_EXE_LINKER_FLAGS "--pre-js ${PRE_JS} --post-js ${POST_JS}" CACHE STRING "" FORCE)
  
  SET (EXECUTABLE_OUTPUT_PATH ${PROJECT_BINARY_DIR} CACHE PATH "Single output directory for building all libraries.")
  SET (LIBRARY_OUTPUT_PATH ${PROJECT_BINARY_DIR}/lib CACHE PATH "Single output directory for building command line libraries.")
  ADD_EXECUTABLE (${LIBNAME} ${KITSRCS})
  SET_TARGET_PROPERTIES(${LIBNAME} PROPERTIES LINK_DEPENDS "${POST_JS};${PRE_JS}")


  SET(FVAR "${EXECUTABLE_OUTPUT_PATH}/${LIBNAME}.js")
  SET(FVAR2 "${EXECUTABLE_OUTPUT_PATH}/${LIBNAME}.wasm")
  install (FILES ${FVAR2} DESTINATION bisweb/lib)

  SET(WEBPACK_WASM_MODULE "${EXECUTABLE_OUTPUT_PATH}/../web/${LIBNAME}_wasm.js")
  # ------------------ create webpack wasm module ---------------
  ADD_CUSTOM_COMMAND(OUTPUT ${WEBPACK_WASM_MODULE}
    DEPENDS ${LIBNAME} ${TOOLS_DIR}/bis_create_wasm_module.js
    COMMENT "\nCreating Webpack Wasm Module"
    COMMAND ${NodeInterp} ${TOOLS_DIR}/bis_create_wasm_module.js -i ${FVAR2} -o ${WEBPACK_WASM_MODULE})
  add_custom_target(wasm ALL DEPENDS ${WEBPACK_WASM_MODULE})
  
  # --------------------- Copy to windows


  SET (README_FILE "${PROJECT_SOURCE_DIR}/../various/txt/README_js.txt")
  install (FILES ${README_FILE} DESTINATION bisweb/)
  
  
  configure_file( ${LICENSE_FILE} "${EXECUTABLE_OUTPUT_PATH}/../web/LICENSE" @ONLY )

  
  IF (BIS_WASMLIB_COPY)
    MESSAGE("-- Copying to second directory ${BIS_EXTRAPATH}")
    ADD_CUSTOM_COMMAND(
      TARGET ${LIBNAME}
      POST_BUILD
      COMMAND ${CMAKE_COMMAND} -E copy
      ARGS ${FVAR} ${BIS_EXTRAPATH})

    ADD_CUSTOM_COMMAND(
      TARGET ${LIBNAME}
      POST_BUILD
      COMMAND ${CMAKE_COMMAND} -E copy
      ARGS ${FVAR2} ${BIS_EXTRAPATH})

    install (FILES ${FVAR2} DESTINATION bisweb/lib
      PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)

    SET(WEBPACK_WASM_MODULE_COPY "${BIS_EXTRAPATH}/../web/${LIBNAME}_wasm.js")
    MESSAGE("-- Copying ${WEBPACK_WASM_MODULE} -> ${WEBPACK_WASM_MODULE_COPY}")
    ADD_CUSTOM_COMMAND(OUTPUT ${WEBPACK_WASM_MODULE_COPY}
      DEPENDS ${WEBPACK_WASM_MODULE}
      COMMENT "Copying Webpack Masm Module to windows"
      COMMAND ${CMAKE_COMMAND} -E copy ${WEBPACK_WASM_MODULE} ${WEBPACK_WASM_MODULE_COPY})
    add_custom_target(wasm2 ALL DEPENDS ${WEBPACK_WASM_MODULE_COPY})

    configure_file( ${LICENSE_FILE} "${BIS_EXTRAPATH}/../web/LICENSE" @ONLY )

  ENDIF(BIS_WASMLIB_COPY)
 
    
 
  # ------------------ create wrapper ---------------------------

  
  add_custom_command(OUTPUT ${JS_WRAP_OUTPUT}
    DEPENDS ${PARSE_HEADERS} ${WRAP_SCRIPT} CMakeLists.txt
    PRE_BUILD COMMENT "Creating JS Wrappers"
    COMMAND ${NodeInterp} ${WRAP_SCRIPT} -i ${PARSE_LIST} -o ${JS_WRAP_OUTPUT} --extra ${BIS_EXTRAPATH})
  add_custom_target(wrappers ALL DEPENDS ${JS_WRAP_OUTPUT})

  # ---- create scripts and library for command line  -----------
  FILE(GLOB H1 ${PROJECT_SOURCE_DIR}/../legacy/*.js)
  FILE(GLOB H2 ${PROJECT_SOURCE_DIR}/../js/*.js)
  FILE(GLOB H3 ${PROJECT_SOURCE_DIR}/../js/modules/*.js)
  SET(JSFILES ${H1} ${H2} ${H3})


  SET (WNAMELIST bisweb.js bisweb-test.js)
  
  GET_FILENAME_COMPONENT(WEBPCONFIG ${PROJECT_SOURCE_DIR}/../config/app.config.js ABSOLUTE)
  GET_FILENAME_COMPONENT(WEBPCONFIGMOCHA ${PROJECT_SOURCE_DIR}/../config/mocha.config.js ABSOLUTE)

  FOREACH(item ${WNAMELIST})
    SET (OUTSCRIPT ${LIBRARY_OUTPUT_PATH}/${item})
    GET_FILENAME_COMPONENT(OUTSCRIPT ${OUTSCRIPT} ABSOLUTE)
    SET (INSCRIPT ${PROJECT_SOURCE_DIR}/../js/bin/${item})
    GET_FILENAME_COMPONENT(INSCRIPT ${INSCRIPT} ABSOLUTE)
    
    add_custom_command(OUTPUT ${OUTSCRIPT}
      DEPENDS ${MODULE_LIST_FILENAME} ${DESCRIPTION_SCRIPT} CMakeLists.txt ${JSFILES}  ${LIBNAME} ${INSCRIPT} ${JS_WRAP_OUTPUT} ${JS_DATE_OUTPUT} ${WEBPACK_WASM_MODULE}
      PRE_BUILD COMMENT "Creating webpack-cli commandline library ${item}"
      COMMAND webpack-cli --entry ${INSCRIPT} --config ${WEBPCONFIG} --output-path ${LIBRARY_OUTPUT_PATH} --output-filename ${item}
      )
    add_custom_target(${item} ALL DEPENDS ${OUTSCRIPT})
  ENDFOREACH(item ${WNAMELIST})

  SET (OUTSCRIPT ${LIBRARY_OUTPUT_PATH}/bisweb.js)
  install (FILES ${OUTSCRIPT} DESTINATION bisweb/lib
    PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)

  IF (BIS_INSTALLTESTS)
    SET (OUTSCRIPT ${LIBRARY_OUTPUT_PATH}/bisweb-test.js)
    install (FILES ${OUTSCRIPT} DESTINATION bisweb/lib
      PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)
  ENDIF (BIS_INSTALLTESTS)


  SET(OUTFILES "")
  SET(OUTFILESWIN "")
  foreach(item ${MODULES})
    SET (OFILE ${LIBRARY_OUTPUT_PATH}/bw_${item})
    SET (OFILE2 ${LIBRARY_OUTPUT_PATH}/bw_${item}.bat)
    configure_file( ${PROJECT_SOURCE_DIR}/../config/runscript.in ${OFILE} @ONLY )
    configure_file( ${PROJECT_SOURCE_DIR}/../config/runscript.bat.in ${OFILE2} @ONLY )
    SET(OUTFILES ${OUTFILES} ${OFILE})
    SET(OUTFILESWIN ${OUTFILESWIN} ${OFILE2})
  endforeach(item ${MODULES})
  install (FILES ${PROJECT_SOURCE_DIR}/../config/setpaths.sh  DESTINATION bisweb)
  install (FILES ${PROJECT_SOURCE_DIR}/../config/setpaths.csh DESTINATION bisweb)
  install (FILES ${PROJECT_SOURCE_DIR}/../config/setpaths.bat DESTINATION bisweb)

  
  install (FILES ${OUTFILES} DESTINATION bisweb/bin 
    PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)
  install (FILES ${OUTFILESWIN} DESTINATION bisweb/winbin 
    PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)

  MESSAGE("-- TEST_DIR=${TEST_DIR}")
    # ------------------ module tests ---------------------------
    IF(BIS_MODULETEST)
      SET (COUNT 0)
      FOREACH (item ${MODULES})
	add_test(NAME "js-module-${item}" COMMAND mocha test_module.js --tpath ${LIBRARY_OUTPUT_PATH} --testname ${item} WORKING_DIRECTORY ${TEST_DIR})
	MATH (EXPR COUNT "${COUNT}+1")
      ENDFOREACH (item ${TLIST})
      MESSAGE("~~~~~ Added ${COUNT} javascript/mocha module tests ${LIBRARY_OUTPUT_PATH}")
    ENDIF(BIS_MODULETEST)

    # ------------------ unit tests ---------------------------
    IF(BIS_UNITTEST)
      SET (COUNT 0)
      FILE(GLOB TLIST ${TEST_DIR}/test*.js)
      list(REMOVE_ITEM TLIST ${TEST_DIR}/test_module.js)
      list(LENGTH TLIST N)
      FOREACH (item ${TLIST})
	GET_FILENAME_COMPONENT(TNAME ${item} NAME)
	GET_FILENAME_COMPONENT(DNAME ${item} DIRECTORY)
	GET_FILENAME_COMPONENT(DNAME ${DNAME} ABSOLUTE)
	add_test(NAME "js-unit-${TNAME}" COMMAND mocha ${TNAME} WORKING_DIRECTORY ${DNAME})
	MATH (EXPR COUNT "${COUNT}+1")
      ENDFOREACH (item ${TLIST})
      MESSAGE("~~~~~ Added ${COUNT} javascript/mocha unit tests")
    ENDIF(BIS_UNITTEST)
  
  OPTION(BIS_WASMLIB_COPY "Copy WASM Output to another directory (for Ubuntu -> Windows)" OFF)

  IF (BIS_WASMLIB_COPY)
    SET (BIS_EXTRAPATH  
      ""
      CACHE PATH
      "Extra path to copy WASM output to")

  ENDIF (BIS_WASMLIB_COPY)

  # ---------------------------------------------------------------------------------------------

  IF (BIS_INSTALLTESTS)
    GET_FILENAME_COMPONENT(WEBPCONFIG ${PROJECT_SOURCE_DIR}/../config/app.config.js ABSOLUTE)

    SET (OUTSCRIPT test_module.js)
    SET (INSCRIPT ${PROJECT_SOURCE_DIR}/../test/test_module.js)

    GET_FILENAME_COMPONENT(INSCRIPT ${INSCRIPT} ABSOLUTE)
    add_custom_command(OUTPUT ${OUTSCRIPT}
      DEPENDS ${MODULE_LIST_FILENAME} ${DESCRIPTION_SCRIPT} CMakeLists.txt ${JSFILES}  ${LIBNAME} ${INSCRIPT} ${JS_WRAP_OUTPUT} ${WEBPACK_WASM_MODULE}
      PRE_BUILD COMMENT "Creating webpack-cli test_module.js"
      COMMAND webpack-cli --entry ${INSCRIPT} --config ${WEBPCONFIG} --output-path ${LIBRARY_OUTPUT_PATH} --output-filename test_module.js
      )
    add_custom_target(module_test ALL DEPENDS ${OUTSCRIPT})
    install (FILES ${PROJECT_BINARY_DIR}/lib/${OUTSCRIPT} DESTINATION bisweb/test
          PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)
  ENDIF (BIS_INSTALLTESTS)
    
  
ELSE(BIS_A_EMSCRIPTEN)

 # ---------------------------------------------------------------------------------------------
  # Native C++ Mode
  # ---------------------------------------------------------------------------------------------
  
  OPTION(BIS_A_PYTHON "Build Python Wrappers" ON)
  OPTION(BIS_A_MATLAB "Build Matlab Wrappers" OFF)
  OPTION(BIS_A_DEVEL "Install Developer Environment (on make install)" OFF)
  
  IF (WIN32)
    SET( COMPILE_FLAGS "/DEIGEN_HAS_C99_MATH /W1" CACHE STRING "" FORCE)
  ELSE (WIN32)
    SET( COMPILE_FLAGS "-O2 -Wall -Wextra -Wpedantic -Wformat")
    SET (CMAKE_CXX_FLAGS "${COMPILE_FLAGS} -std=c++11" CACHE STRING "" FORCE)
    SET (CMAKE_C_FLAGS ${COMPILE_FLAGS} CACHE STRING "" FORCE)
  ENDIF(WIN32)
  
  
  include_directories ( ${EIGEN3_INCLUDE_DIRS} )
  include_directories (${PROJECT_SOURCE_DIR})
      
  SET (LIBRARY_OUTPUT_PATH ${PROJECT_BINARY_DIR}/ CACHE PATH "Single output directory for building all libraries.")
  ADD_LIBRARY (${CLIBNAME} SHARED ${KITSRCS})
  install (TARGETS ${CLIBNAME} DESTINATION bisweb/lib)
  IF (BIS_A_DEVEL)
    install (FILES ${HEADERS} DESTINATION bisweb/include)
    install (FILES ../config/UseBISWASM.cmake ../config/BISWASMConfig.cmake DESTINATION bisweb/lib)
  ENDIF (BIS_A_DEVEL)
  # ---------------
  # Python
  # ---------------
  IF (BIS_A_PYTHON)

    FIND_PACKAGE(PythonInterp REQUIRED)
    IF (${PYTHON_VERSION_MAJOR} LESS 3)
      MESSAGE(FATAL_ERROR "Need Python 3.5 or greater, found ${PYTHON_VERSION_STRING}")
    ELSEIF (${PYTHON_VERSION_MINOR} LESS 5)
      MESSAGE(FATAL_ERROR "Need Python 3.5 or greater, found ${PYTHON_VERSION_STRING}")
    ENDIF (${PYTHON_VERSION_MAJOR} LESS 3)

  # ------------------ create wrapper ---------------------------    
    SET (PYTHON_WRAP_OUTPUT ${LIBRARY_OUTPUT_PATH}/biswrapper.py)
    add_custom_command(OUTPUT ${PYTHON_WRAP_OUTPUT}
      DEPENDS ${PARSE_HEADERS} ${WRAP_SCRIPT} CMakeLists.txt
      PRE_BUILD COMMENT "Creating Python Header"
      COMMAND ${NodeInterp} ${WRAP_SCRIPT} --python -i ${PARSE_LIST} -o ${PYTHON_WRAP_OUTPUT}
      )
    add_custom_target(wrappers_py ALL DEPENDS ${PYTHON_WRAP_OUTPUT})
    install (FILES ${PYTHON_WRAP_OUTPUT} DESTINATION bisweb/lib)

    # ------------------ create module descriptions -------------

    FILE (STRINGS ${PYTHON_MODULE_LIST_FILENAME} PMODULES)
    
    SET (PYTHON_MODULE_DESC ${LIBRARY_OUTPUT_PATH}/modules_desc.py)
    
    add_custom_command(OUTPUT ${PYTHON_MODULE_DESC}
      DEPENDS ${MODULE_LIST_FILENAME} ${DESCRIPTION_SCRIPT} CMakeLists.txt ${JSMODULES}
      PRE_BUILD COMMENT "Creating Python Module Descriptions"
      COMMAND ${NodeInterp} ${DESCRIPTION_SCRIPT} -i ${PYTHON_MODULE_LIST_FILENAME} -o ${PYTHON_MODULE_DESC} }
      )
    add_custom_target(module_desc_py ALL DEPENDS ${PYTHON_MODULE_DESC})
    add_custom_target(python_module_list_py ALL DEPENDS ${PYTHON_MODULE_DESC})
    install (FILES ${PYTHON_MODULE_DESC} DESTINATION bisweb/lib)

    GET_FILENAME_COMPONENT(PYTHON_SOURCE_DIR ${PROJECT_SOURCE_DIR}/../python ABSOLUTE)
    FILE(GLOB PYLIST ${PYTHON_SOURCE_DIR}/bis*.py)
    FILE(GLOB PYLIST2 ${PYTHON_SOURCE_DIR}/modules/*.py)
    list(REMOVE_ITEM PYLIST2 ${PYTHON_SOURCE_DIR}/bis_path.py)

    install (FILES ${BISWEB_PYTHON_INIT} DESTINATION bisweb)
    install (FILES ${PYLIST} DESTINATION bisweb/python)
    install (FILES ${PYLIST2} DESTINATION bisweb/python/modules
      PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)

    IF (WIN32)
      install (FILES ${PROJECT_SOURCE_DIR}/../config/setpaths.bat  DESTINATION bisweb
        PERMISSIONS OWNER_READ  WORLD_READ)
    ELSE (WIN32)
      install (FILES ${PROJECT_SOURCE_DIR}/../config/setpaths.sh  DESTINATION bisweb
        PERMISSIONS OWNER_READ  WORLD_READ)
      install (FILES ${PROJECT_SOURCE_DIR}/../config/setpaths.csh   DESTINATION bisweb
        PERMISSIONS OWNER_READ  WORLD_READ)
    ENDIF (WIN32)

    SET (README_FILE "${PROJECT_SOURCE_DIR}/../various/txt/README_py.txt")
    install (FILES ${README_FILE} DESTINATION bisweb/)

    # This overwrites bis_path.py with one suitable for install purposes
    MESSAGE("Installing ${BISWEB_PYTHON_PATH}")
    install (FILES ${BISWEB_PYTHON_PATH} DESTINATION bisweb/python/modules)
	  
    # ------------------ module tests ---------------------------
    IF(BIS_MODULETEST)
#      FILE (STRINGS ${PYTHON_MODULE_LIST} MODULES)
      SET (COUNT 0)
      FOREACH (item ${PMODULES})
	add_test(NAME "py-module-${item}" COMMAND python3 test_module.py --testname ${item} WORKING_DIRECTORY ${TEST_DIR})
	MATH (EXPR COUNT "${COUNT}+1")
      ENDFOREACH (item ${PMODULES})
      MESSAGE("~~~~~ Added ${COUNT} python module tests")
    
    ENDIF(BIS_MODULETEST)

    # ------------------ unit tests ---------------------------
    IF(BIS_UNITTEST)
      FILE(GLOB TLIST ${TEST_DIR}/test*.py)
      list(REMOVE_ITEM TLIST ${TEST_DIR}/test_module.py)
      SET (COUNT 0)
      FOREACH (item ${TLIST})
	GET_FILENAME_COMPONENT(TNAME ${item} NAME)
	GET_FILENAME_COMPONENT(DNAME ${item} DIRECTORY)
	GET_FILENAME_COMPONENT(DNAME ${DNAME} ABSOLUTE)
	add_test(NAME "py-unit-${TNAME}" COMMAND ${PYTHON_EXECUTABLE} -m unittest ${TNAME} WORKING_DIRECTORY ${DNAME})
	MATH (EXPR COUNT "${COUNT}+1")
      ENDFOREACH (item ${TLIST})
      MESSAGE("~~~~~ Added ${COUNT} python/unittest tests")
    ENDIF(BIS_UNITTEST)

    IF (BIS_INSTALLTESTS)
      install (FILES ${PROJECT_SOURCE_DIR}/../test/test_module.py DESTINATION bisweb/test)
    ENDIF (BIS_INSTALLTESTS)

  ENDIF(BIS_A_PYTHON)

  # ---------------
  # Matlab
  # ---------------
  MESSAGE("Matlab is ${BIS_A_MATLAB}")
  
  IF (BIS_A_MATLAB)
    SET (MATLAB_WRAP_OUTPUT ${LIBRARY_OUTPUT_PATH}/biswrapper.m)
    add_custom_command(OUTPUT ${MATLAB_WRAP_OUTPUT}
      DEPENDS ${PARSE_HEADERS} ${WRAP_SCRIPT}
      PRE_BUILD COMMENT "Creating Matlab Header"
      COMMAND ${NodeInterp} ${WRAP_SCRIPT} -i ${PARSE_LIST} --matlab -o ${MATLAB_WRAP_OUTPUT})
    add_custom_target(wrappers_mat ALL DEPENDS ${MATLAB_WRAP_OUTPUT})
    install (FILES ${MATLAB_WRAP_OUTPUT} DESTINATION bisweb/lib)
    
    SET (MATLAB_OUT_HEADER ${LIBRARY_OUTPUT_PATH}/bis_matlab.h)
    add_custom_command(OUTPUT ${MATLAB_OUT_HEADER}
      DEPENDS ${PARSE_HEADERS} ${HEADER_SCRIPT} CMakeLists.txt
      PRE_BUILD COMMENT "Creating Matlab Header"
      COMMAND ${NodeInterp} ${HEADER_SCRIPT} -i ${PARSE_LIST} -o ${MATLAB_OUT_HEADER})
    add_custom_target(header_mat ALL DEPENDS ${MATLAB_OUT_HEADER})
    install (FILES ${MATLAB_OUT_HEADER} DESTINATION bisweb/lib)

    GET_FILENAME_COMPONENT(MATLAB_SOURCE_DIR ${PROJECT_SOURCE_DIR}/../matlab ABSOLUTE)
    FILE(GLOB MLIST ${MATLAB_SOURCE_DIR}/bis*.m)
    MESSAGE("Here ${MLIST}")
    install (FILES ${MLIST} DESTINATION bisweb/matlab)
  ENDIF(BIS_A_MATLAB)
  
  # ---------------
  # Common
  # ---------------
  add_custom_target(wrappers ALL DEPENDS ${MATLAB_OUT_HEADER} ${MATLAB_WRAP_OUTPUT} ${PYTHON_WRAP_OUTPUT} ${WRAP_SCRIPT} ${HEADER_SCRIPT} ${PYTHON_MODULE_DESC})
  
  # ----------------------------------------------------------
ENDIF(BIS_A_EMSCRIPTEN)


# Make some flags advanced
MARK_AS_ADVANCED(BIS_WEB_MEMORY)
MARK_AS_ADVANCED(BIS_WEB_WASM)
MARK_AS_ADVANCED(BIS_WASMLIB_COPY)
MARK_AS_ADVANCED(BIS_EXTRAPATH)
MARK_AS_ADVANCED(BIS_WEB_OPT)
MARK_AS_ADVANCED(BIS_A_DEVEL)


# ----------------------------------------------------------
# If installing tests

IF (BIS_INSTALLTESTS)
  MESSAGE("Installing tests ${BIS_INSTALLTESTS}")
  install (FILES ${PROJECT_SOURCE_DIR}/../test/module_tests.json DESTINATION bisweb/test)
  install (DIRECTORY ${PROJECT_SOURCE_DIR}/../test/testdata DESTINATION bisweb/test)
  install (FILES ${PROJECT_SOURCE_DIR}/../various/txt/README_test.md DESTINATION bisweb/test)
ENDIF (BIS_INSTALLTESTS)

# ----------------------------------------------------------
# Run Doxygen
# ----------------------------------------------------------
ADD_CUSTOM_TARGET(doc COMMAND doxygen config/Doxyfile WORKING_DIRECTORY ${PROJECT_SOURCE_DIR}/..)


INCLUDE (${PROJECT_SOURCE_DIR}/CPackOptions.cmake)

