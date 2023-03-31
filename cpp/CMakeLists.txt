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

# Extract version number from package.json parent file
include(JSONParser.cmake)
FILE (READ ${PROJECT_SOURCE_DIR}/../package.json jsonpackage)
sbeParseJson(jsonmod jsonpackage)
STRING(REGEX REPLACE "\\\." ";" BISWEBV "${jsonmod.version}")
LIST(GET BISWEBV 0 BISWEB_VERSION_MAJOR)
LIST(GET BISWEBV 1 BISWEB_VERSION_MINOR)
LIST(GET BISWEBV 2 BISWEB_VERSION_PATCH)
SET (BISWEB_VERSION "${BISWEB_VERSION_MAJOR}.${BISWEB_VERSION_MINOR}.${BISWEB_VERSION_PATCH}")

MESSAGE("----------------------------------------------------")
MESSAGE("-- Building BISWEB ${BISWEB_VERSION} major=${BISWEB_VERSION_MAJOR} minor=${BISWEB_VERSION_MINOR} patch=${BISWEB_VERSION_PATCH}")
MESSAGE("----------------------------------------------------")

FIND_PROGRAM(NODE_JS_EXECUTABLE node REQUIRED)
SET(MOCHA_EXECUTABLE "${MOCHA}")

# ------------------------------------------------------------------------------------------------------------------------------------------------
# Core Project
# ------------------------------------------------------------------------------------------------------------------------------------------------
SET (CPP_SOURCE_DIR ${PROJECT_SOURCE_DIR})
GET_FILENAME_COMPONENT(TOOLS_DIR ${PROJECT_SOURCE_DIR}/../compiletools ABSOLUTE)
GET_FILENAME_COMPONENT(TEST_DIR ${PROJECT_SOURCE_DIR}/../test ABSOLUTE)
GET_FILENAME_COMPONENT(SCRIPT_DIR ${PROJECT_SOURCE_DIR}/bin ABSOLUTE)

# Common scripts
SET (WRAP_SCRIPT ${TOOLS_DIR}/bis_create_wrappers.js)
SET (DESCRIPTION_SCRIPT ${TOOLS_DIR}/bis_createmoduledescriptions.js)

# JS
GET_FILENAME_COMPONENT(WEBPLIBCONFIG ${PROJECT_SOURCE_DIR}/../config/lib.config.js ABSOLUTE)
GET_FILENAME_COMPONENT(WEBPPACK ${PROJECT_SOURCE_DIR}/../node_modules/.bin/webpack-cli ABSOLUTE)
SET (MODULE_SCRIPTS_CREATOR ${TOOLS_DIR}/bis_createmodulescripts.js)
SET (MODULE_LIST_CREATOR ${TOOLS_DIR}/bis_createjsmodulestotestlist.js)
SET (NPM_PACKAGE_SCRIPT ${TOOLS_DIR}/biscreatepackagefile.js)

#Python
GET_FILENAME_COMPONENT(BISWEBPYTHON_SOURCE_DIR ${PROJECT_SOURCE_DIR}/../biswebpython ABSOLUTE)
SET (BISWEB_PYTHON_INIT ${BISWEBPYTHON_SOURCE_DIR}/config/__init__.py)
SET (BISWEB_PYTHON_SETUP ${BISWEBPYTHON_SOURCE_DIR}/config/setup.py)
SET (BISWEB_PYTHON_REQUIREMENTS ${BISWEBPYTHON_SOURCE_DIR}/config/requirements.txt)
SET (BISWEB_PYTHON_MANIFEST ${BISWEBPYTHON_SOURCE_DIR}/config/MANIFEST.in)
SET (BISWEBPYTHON_MODULE_LIST_FILENAME ${BISWEBPYTHON_SOURCE_DIR}/modules/PythonModuleList.txt)
SET (BISWEBPYTHON_MODULE_LIST_FILENAME_AFNI ${BISWEBPYTHON_SOURCE_DIR}/modules/PythonModuleListAFNI.txt)

SET(LIBNAME libbiswasm)
# ---------------------------------------------------------------------------------------------
# C++ Sources Core
# ---------------------------------------------------------------------------------------------

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
  bisIndividualizedParcellation.cpp
  bisSurface.cpp
  bisDataObjectFactory.cpp
  bisSimpleImageSegmentationAlgorithms.cpp
  bisfMRIAlgorithms.cpp
  bisJointHistogram.cpp
  bisExportedFunctions.cpp
  bisExportedFunctions2.cpp
  bisTesting.cpp
  bisvtkMultiThreader.cxx
  bisImageDistanceMatrix.cpp
  bisImageTransformationJacobian.cpp
  bisPointLocator.cpp
  bisPointRegistrationUtils.cpp
  )

# ---------------------------------------------------------------------------------------------
# PARSE HEADERS -- headers containing exported functions for JS/Python/Matlab Wrappers
# ---------------------------------------------------------------------------------------------
SET(PARSE_HEADERS
  ${CPP_SOURCE_DIR}/bisDefinitions.h
  ${CPP_SOURCE_DIR}/bisExportedFunctions.h
  ${CPP_SOURCE_DIR}/bisExportedFunctions2.h
  ${CPP_SOURCE_DIR}/bisTesting.h
  ${CPP_SOURCE_DIR}/bisImageDistanceMatrix.h
  ${CPP_SOURCE_DIR}/bisImageTransformationJacobian.h
  ${CPP_SOURCE_DIR}/bisPointRegistrationUtils.h
  ${CPP_SOURCE_DIR}/bisIndividualizedParcellation.h
  )

# ----------------------------------------------------------------------------
# All Headers
# ----------------------------------------------------------------------------
FILE(GLOB H1 ${CPP_SOURCE_DIR}/b*.h)
FILE(GLOB H2 ${CPP_SOURCE_DIR}/b*.txx)
SET(HEADERS ${H1} ${H2})


# ---------------------------------------------------------------------------------------------
# External Code
# ---------------------------------------------------------------------------------------------

#    ------------------------------------------------------------------------
#    Configure AFNI build
#    ------------------------------------------------------------------------
OPTION(BISWEB_USEAFNI "Include AFNI Code" OFF)
IF (BISWEB_USEAFNI)
  INCLUDE (${PROJECT_SOURCE_DIR}/afni/BisWebAFNI.cmake)
  SET (KITSRCS ${KITSRCS} ${AFNI_SOURCES})
  SET (PARSE_HEADERS ${PARSE_HEADERS} ${AFNI_HEADERS})
ELSE (BISWEB_USEAFNI)
  SET (AFNI_WASM_COMPILE_FLAGS "")
  SET (AFNI_NATIVE_COMPILE_FLAGS "")
  SET (AFNI_INCLUDE_DIRS "")
ENDIF (BISWEB_USEAFNI)

#    -----------------------------------------------------------------------------------------
#    SOURCE Files and GPL Flags
#    -----------------------------------------------------------------------------------------

OPTION(BIS_USEGPL "Include the GPL-licensed C++ files (plugin)" OFF)
MARK_AS_ADVANCED(BIS_USEGPL)


IF (BIS_USEGPL)

  OPTION(BIS_BUILDNONGPL "Also Build Non GPL-licensed library" OFF)
  MESSAGE("-- Using GPL Licensed Code from ${BIS_GPL_DIR}")
  
  FIND_PATH(BIS_GPL_DIR BisWebExtra.cmake  REQUIRED)
  get_filename_component(BIS_GPL_DIR ${BIS_GPL_DIR} ABSOLUTE)
  INCLUDE (${BIS_GPL_DIR}/BisWebExtra.cmake)

  # Build also a library without the gpl code
  IF (BIS_BUILDNONGPL)
    SET(LIBNAME2 libbiswasm_nongpl)
    SET (NONGPLSRCS
      ${KITSRCS}
      nongpl/bisReplacementExportedFunctions.cpp)
  ENDIF (BIS_BUILDNONGPL)
  SET (KITSRCS ${KITSRCS} ${GPLSOURCES})
  SET(PARSE_HEADERS ${PARSE_HEADERS} ${GPLHEADERS})

ELSE (BIS_USEGPL)

  SET (KITSRCS ${KITSRCS} nongpl/bisReplacementExportedFunctions.cpp)
  SET(PARSE_HEADERS ${PARSE_HEADERS} ${CPP_SOURCE_DIR}/nongpl/bisReplacementExportedFunctions.h )

ENDIF (BIS_USEGPL)


#    ---------------
#    External Plugin
#    ---------------

OPTION(BIS_USEEXTERNAL "Include additional external C++ files (plugin)" OFF)
MARK_AS_ADVANCED(BIS_USEEXTERNAL)

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
  SET (KITSRCS ${KITSRCS} ${EXTERNALSOURCES})
  SET(PARSE_HEADERS ${PARSE_HEADERS} ${EXTERNALHEADERS})
ENDIF (BIS_USEEXTERNAL)

#    ---------------
#    CPM Plugin
#    ---------------

OPTION(BIS_USECPM "Include additional files for the CPM Code" OFF)

IF (BIS_USECPM)
  SET (KITSRCS
    ${KITSRCS}
    cpmcode/CPM.cpp
    cpmcode/Group.cpp
    cpmcode/predictory.cpp
    cpmcode/RCPM.cpp
    cpmcode/Subject.cpp
    cpmcode/tools.cpp
    cpmcode/bisCPM.cpp
    )
  SET (PARSE_HEADERS
    ${PARSE_HEADERS}
    ${CPP_SOURCE_DIR}/cpmcode/bisCPM.h
    )

  include_directories( "${PROJECT_SOURCE_DIR}/cpmcode")
ENDIF (BIS_USECPM)

# ---------------------------------------------------------------------------------------------
# Global Configuration flags
# ---------------------------------------------------------------------------------------------

INCLUDE(CTest)
FIND_PACKAGE(Eigen3 REQUIRED)
FIND_PACKAGE(IGL REQUIRED)

SET (CMAKE_VERBOSE_MAKEFILE ON)
OPTION(BIS_A_EMSCRIPTEN "Use Emscripten" ON)
OPTION(BIS_UNITTEST "Enable Unit Tests" ON)
OPTION(BIS_MODULETEST "Enable MODULE Tests" ON)

MARK_AS_ADVANCED(BIS_UNITTEST)
MARK_AS_ADVANCED(BIS_MODULETEST)

# ---------------------------------------------------------------------------------------------
# License File depending on whether we are using the GPL plugin or not
# ---------------------------------------------------------------------------------------------

IF (BIS_USEGPL)
  SET (LICENSE_FILE "${PROJECT_SOURCE_DIR}/../various/txt/gpl_license.txt")
ELSE (BIS_USEGPL)
  SET (LICENSE_FILE "${PROJECT_SOURCE_DIR}/../various/txt/apache_license.txt")
ENDIF (BIS_USEGPL)


# ----------------------------------------------------------
# Run Doxygen
# ----------------------------------------------------------
ADD_CUSTOM_TARGET(doc COMMAND doxygen config/Doxyfile WORKING_DIRECTORY ${PROJECT_SOURCE_DIR}/..)

INCLUDE (${PROJECT_SOURCE_DIR}/CPackOptions.cmake)

# ----------------------------------------------------------
# List of files to parse
# ----------------------------------------------------------
STRING(REGEX REPLACE ";" "," PARSE_LIST "${PARSE_HEADERS}")


# -----------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------
#
#
#  Webassembly Build
#
#
# -----------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------

IF (BIS_A_EMSCRIPTEN)

  SET (PRE_JS "${PROJECT_SOURCE_DIR}/js/libbiswasm_pre.js")
  SET (POST_JS "${PROJECT_SOURCE_DIR}/js/libbiswasm_post.js")

  
  install (FILES ${LICENSE_FILE} DESTINATION bisweb/ RENAME LICENSE.md)
  CONFIGURE_FILE(${PROJECT_SOURCE_DIR}/bisConfigure.js.in ${PROJECT_BINARY_DIR}/bisConfigure.js)
  
  # ---------------------------------------------------------------------------------------------
  # Web Assembly Mode
  # ---------------------------------------------------------------------------------------------

  OPTION(BIS_WEB_WASM "Build webassembly instead of asm.js" ON)
  MARK_AS_ADVANCED(BIS_WEB_WASM)

  SET (BIS_WEB_OPT "-O2" CACHE STRING "BIS Compiler Optimization")
  MARK_AS_ADVANCED(BIS_WEB_OPT)

  OPTION(BIS_BUILDSCRIPTS "Create individual scripts for node.js modules" OFF)
  MARK_AS_ADVANCED(BIS_BUILDSCRIPTS)

  # Left over
  MARK_AS_ADVANCED(BIS_EXTRAPATH)

  # SET VARIABLES

  IF (BIS_WEB_WASM)
    SET(WASM_STRING "-s WASM=1 -s ALLOW_MEMORY_GROWTH=1")
  ELSE(BIS_WEB_WASM)
    SET(WASM_STRING "")
  ENDIF(BIS_WEB_WASM)

  SET( COMPILE_FLAGS "-Wall  -DBISWASM  ${BIS_WEB_OPT} ${WASM_STRING} -isystem ${EIGEN3_INCLUDE_DIRS} -I ${PROJECT_SOURCE_DIR}")
  SET( COMPILE_FLAGS "${COMPILE_FLAGS} -isystem ${IGL_INCLUDE_DIRS}")
  
  IF (BISWEB_USEAFNI)
    SET (COMPILE_FLAGS "${COMPILE_FLAGS} ${AFNI_WASM_COMPILE_FLAGS} -isystem ${AFNI_INCLUDE_DIRS}")
  ENDIF (BISWEB_USEAFNI)
  
  IF (BIS_USECPM)
    SET( COMPILE_FLAGS "${COMPILE_FLAGS} -I ${PROJECT_SOURCE_DIR}/cpmcode")
  ENDIF (BIS_USECPM)


  SET (CMAKE_CXX_FLAGS ${COMPILE_FLAGS} CACHE STRING "" FORCE)
  SET (CMAKE_C_FLAGS ${COMPILE_FLAGS} CACHE STRING "" FORCE)
  SET (CMAKE_EXE_LINKER_FLAGS "--pre-js ${PRE_JS} --post-js ${POST_JS}" CACHE STRING "" FORCE)

  SET (EXECUTABLE_OUTPUT_PATH ${PROJECT_BINARY_DIR} CACHE PATH "Single output directory for building all libraries.")
  SET (LIBRARY_OUTPUT_PATH ${PROJECT_BINARY_DIR}/lib CACHE PATH "Single output directory for building command line libraries.")

  MESSAGE("DIRS=${EXECUTABLE_OUTPUT_PATH}, ${LIBRARY_OUTPUT_PATH}")

  IF (BIS_BUILDNONGPL)
    MESSAGE("-- Also building Pure Apache C++ Library excluding GPL-Code from ${BIS_GPL_DIR}")
    ADD_EXECUTABLE (${LIBNAME} ${KITSRCS})
    ADD_EXECUTABLE (${LIBNAME2} ${NONGPLSRCS})
    SET (LIBLIST ${LIBNAME} ${LIBNAME2})
  ELSE (BIS_BUILDNONGPL)
    ADD_EXECUTABLE (${LIBNAME} ${KITSRCS})
    SET (LIBLIST ${LIBNAME})

  ENDIF (BIS_BUILDNONGPL)

  foreach(lib ${LIBLIST})

    IF (BIS_USEGPL)
      SET(GPL 1)
    ELSE (BIS_USEGPL)
      SET(GPL 0)
    ENDIF (BIS_USEGPL)


    SET_TARGET_PROPERTIES(${lib} PROPERTIES LINK_DEPENDS "${POST_JS};${PRE_JS}")
    SET(FVAR "${EXECUTABLE_OUTPUT_PATH}/${lib}.js")
    SET(FVAR2 "${EXECUTABLE_OUTPUT_PATH}/${lib}.wasm")
    install (FILES ${FVAR2} DESTINATION bisweb/lib)

    SET(WEBPACK_WASM_MODULE "${EXECUTABLE_OUTPUT_PATH}/../web/${lib}_wasm.js")
    # ------------------ create webpack wasm module for web-based tools ---------------
    ADD_CUSTOM_COMMAND(OUTPUT ${WEBPACK_WASM_MODULE}
      DEPENDS ${lib} ${TOOLS_DIR}/bis_create_wasm_module.js
      COMMENT "\nCreating Webpack Wasm Module"
      COMMAND ${NODE_JS_EXECUTABLE} ${TOOLS_DIR}/bis_create_wasm_module.js -i ${FVAR2} -o ${WEBPACK_WASM_MODULE} --gpl ${GPL})
    add_custom_target(wasm_${lib} ALL DEPENDS ${WEBPACK_WASM_MODULE})
  endforeach(lib ${LIBLIST})

  SET (README_FILE "${PROJECT_SOURCE_DIR}/../various/txt/README_js.txt")
  install (FILES ${README_FILE} DESTINATION bisweb/)
  configure_file( ${LICENSE_FILE} "${EXECUTABLE_OUTPUT_PATH}/../web/LICENSE" @ONLY )

  # ------------------ create wrapper ---------------------------
  SET (JS_WRAP_OUTPUT ${EXECUTABLE_OUTPUT_PATH}/libbiswasm_wrapper.js)
  SET (JS_WRAP_OUTPUT2 ${EXECUTABLE_OUTPUT_PATH}/biswasmdate.js)
  add_custom_command(OUTPUT ${JS_WRAP_OUTPUT} ${JS_WRAP_OUTPUT2}
    DEPENDS ${PARSE_HEADERS} ${WRAP_SCRIPT} CMakeLists.txt ${LIBNAME}
    PRE_BUILD COMMENT "Creating JS Wrappers"
    COMMAND ${NODE_JS_EXECUTABLE} ${WRAP_SCRIPT} -i ${PARSE_LIST} -o ${JS_WRAP_OUTPUT} --extra ${BIS_EXTRAPATH} --bisdate ${EXECUTABLE_OUTPUT_PATH}/biswasmdate.js)
  add_custom_target(wrappers ALL DEPENDS ${JS_WRAP_OUTPUT} ${JS_WRAP_OUTPUT2})

  

  
  # ---- create library for command line  -----------
  FILE(GLOB JSFILES ${PROJECT_SOURCE_DIR}/../js/*/[a-zA-z]*.js)

  # bioimagesuiteweblib.js
  SET (BISWEBLIBFILE bioimagesuiteweblib.js)
  SET (OUTSCRIPT ${LIBRARY_OUTPUT_PATH}/${BISWEBLIBFILE})
  GET_FILENAME_COMPONENT(OUTSCRIPT ${OUTSCRIPT} ABSOLUTE)
  SET (INSCRIPT ${PROJECT_SOURCE_DIR}/../js/bin/${BISWEBLIBFILE})
  GET_FILENAME_COMPONENT(INSCRIPT ${INSCRIPT} ABSOLUTE)
  SET (CONFIGFILE ${WEBPLIBCONFIG})



  add_custom_command(OUTPUT ${OUTSCRIPT}
    DEPENDS  ${DESCRIPTION_SCRIPT} CMakeLists.txt ${JSFILES}  ${LIBNAME} ${INSCRIPT} ${JS_WRAP_OUTPUT} ${JS_DATE_OUTPUT} ${WEBPACK_WASM_MODULE} ${CONFIGFILE}
    PRE_BUILD COMMENT "Creating webpack-cli commandline library ${BISWEBLIBFILE} using ${CONFIGFILE}"
    COMMAND ${WEBPPACK} --entry ${INSCRIPT} --config ${CONFIGFILE} --output-path ${LIBRARY_OUTPUT_PATH} --output-filename ${BISWEBLIBFILE}
    )
  add_custom_target(${BISWEBLIBFILE} ALL DEPENDS ${OUTSCRIPT})


  SET (OUTSCRIPT ${LIBRARY_OUTPUT_PATH}/${BISWEBLIBFILE})
  install (FILES ${OUTSCRIPT} DESTINATION bisweb/lib
    PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)

  SET (MAINSCRIPT  ${PROJECT_SOURCE_DIR}/../js/bin/bisweb.js )
  install (FILES ${MAINSCRIPT} DESTINATION bisweb/lib PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)

  SET (TFSCRIPT  ${PROJECT_SOURCE_DIR}/../js/utilities/bis_tfjs.js )
  install (FILES ${TFSCRIPT} DESTINATION bisweb/lib PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)

  SET (OUTSCRIPT ${PROJECT_SOURCE_DIR}/../js/bin/bisweb-test.js)
  install (FILES ${OUTSCRIPT} DESTINATION bisweb/lib
    PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)

  # ---- create npm package stuff  -----------
  SET (NPMREADME
    ${LIBRARY_OUTPUT_PATH}/README.md )
  add_custom_command(OUTPUT ${NPMREADME}
    DEPENDS ${PROJECT_SOURCE_DIR}/../config/biswebnode_readme.md ${LIBNAME}
    PRE_BUILD COMMENT "Creating npm README.md"
    COMMAND ${CMAKE_COMMAND} -E copy "${PROJECT_SOURCE_DIR}/../config/biswebnode_readme.md" ${NPMREADME}
    )
  add_custom_target(npmreadme ALL DEPENDS ${NPMREADME} ${BISWEBLIBFILE})
  install (FILES ${NPMREADME}  DESTINATION bisweb)

  set (NPMPACKAGEFILE ${LIBRARY_OUTPUT_PATH}/package.json)
  set (NPMPACKAGEFILE2 ${LIBRARY_OUTPUT_PATH}/package.json.tf)
  add_custom_command(OUTPUT ${NPMPACKAGEFILE} ${NPMPACKAGEFILE2}
    DEPENDS ${NPM_PACKAGE_SCRIPT} ${BISWEBLIBFILE} ${PROJECT_SOURCE_DIR}/../package.json ${CONFIGFILE} ${LIBNAME}
    PRE_BUILD COMMENT "Creating package.json file"
    COMMAND node ${NPM_PACKAGE_SCRIPT} -o ${LIBRARY_OUTPUT_PATH} -c ${WEBPLIBCONFIG}
    )
  add_custom_target(package.json ALL DEPENDS ${NPMPACKAGEFILE} ${NPMPACKAGEFILE2} ${BISWEBLIBFILE})
  install (FILES ${NPMPACKAGEFILE} DESTINATION bisweb PERMISSIONS OWNER_READ WORLD_READ)
  install (FILES ${NPMPACKAGEFILE2} DESTINATION bisweb PERMISSIONS OWNER_READ WORLD_READ)

  # ---- create scripts for command line  -----------
  # Read the modules
  IF(BIS_BUILDSCRIPTS)

    GET_FILENAME_COMPONENT(MODULE_DIR ${LIBRARY_OUTPUT_PATH}/bin ABSOLUTE)
    SET(MODULE_LIST_FILENAME "${MODULE_DIR}/ModuleList.txt")
    MESSAGE("Creating Scripts ${MODULE_LIST_FILENAME}, ${MODULE_DIR}")
    add_custom_command(OUTPUT ${MODULE_LIST_FILENAME}
      DEPENDS ${JSFILES} ${MODULE_SCRIPTS_CREATOR} CMakeLists.txt  ${LIBNAME}
      PRE_BUILD COMMENT "Creating JS Wrappers Scripts (Unix)"
      COMMAND ${NODE_JS_EXECUTABLE} ${MODULE_SCRIPTS_CREATOR} -o ${MODULE_DIR} -m 0)

    GET_FILENAME_COMPONENT(MODULE2_DIR ${LIBRARY_OUTPUT_PATH}/winbin ABSOLUTE)
    SET(MODULE_LIST_FILENAME2 "${MODULE2_DIR}/ModuleList.txt")
    MESSAGE("Creating Scripts ${MODULE_LIST_FILENAME2}, ${MODULE2_DIR}")
    add_custom_command(OUTPUT ${MODULE_LIST_FILENAME2}
      DEPENDS ${JSFILES} ${MODULE_SCRIPTS_CREATOR} CMakeLists.txt  ${LIBNAME}
      PRE_BUILD COMMENT "Creating JS Wrappers Scripts (Windows)"
      COMMAND ${NODE_JS_EXECUTABLE} ${MODULE_SCRIPTS_CREATOR} -o ${MODULE2_DIR} -m 1)

    add_custom_target(modulescripts ALL DEPENDS ${MODULE_LIST_FILENAME} ${MODULE_LIST_FILENAME2} ${LIBNAME} ${BISWEBLIBFILE})

    install (DIRECTORY ${MODULE_DIR}  DESTINATION bisweb
      PATTERN "*.txt" EXCLUDE
      PATTERN "*.sh"
      PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE GROUP_READ GROUP_EXECUTE WORLD_READ WORLD_EXECUTE
      PATTERN "*.xml"
      PERMISSIONS OWNER_READ GROUP_READ WORLD_READ)

    install (DIRECTORY ${MODULE2_DIR}  DESTINATION bisweb
      PATTERN "*.txt" EXCLUDE
      PATTERN "*.bat"
      PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE GROUP_READ GROUP_EXECUTE WORLD_READ WORLD_EXECUTE
      PATTERN "*.xml"
      PERMISSIONS OWNER_READ GROUP_READ WORLD_READ)
  ENDIF()

  MESSAGE("-- TEST_DIR=${TEST_DIR}")

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
      add_test(NAME "js-unit-${TNAME}" COMMAND ${MOCHA_EXECUTABLE} ${TNAME} WORKING_DIRECTORY ${DNAME})
      MATH (EXPR COUNT "${COUNT}+1")
    ENDFOREACH (item ${TLIST})
    MESSAGE("~~~~~ Added ${COUNT} javascript/mocha unit tests")
  ENDIF(BIS_UNITTEST)
  # ------------------ module tests ---------------------------
  IF(BIS_MODULETEST)
    SET(JS_MODULE_LIST_FILENAME "${LIBRARY_OUTPUT_PATH}/JSModules.txt")
    MESSAGE("Creating Module List in ${JS_MODULE_LIST_FILENAME}")
    execute_process(COMMAND ${NODE_JS_EXECUTABLE} ${MODULE_LIST_CREATOR} -o ${JS_MODULE_LIST_FILENAME})
    FILE (STRINGS ${JS_MODULE_LIST_FILENAME} JSMODULES)
    SET (COUNT 0)
    FOREACH (item ${JSMODULES})
      add_test(NAME "js-module-${item}" COMMAND ${MOCHA_EXECUTABLE} test_module.js --testname ${item} --input ${TEST_DIR}/module_tests.json WORKING_DIRECTORY ${TEST_DIR} )
      MATH (EXPR COUNT "${COUNT}+1")
    ENDFOREACH (item ${TLIST})
    MESSAGE("~~~~~ Added ${COUNT} javascript/mocha module tests ${LIBRARY_OUTPUT_PATH}")
  ENDIF(BIS_MODULETEST)
  # ---------------------------------------------------------------------------------------------

  GET_FILENAME_COMPONENT(WEBPCONFIG ${PROJECT_SOURCE_DIR}/../config/app.config.js ABSOLUTE)

  SET (INSCRIPT ${PROJECT_SOURCE_DIR}/../test/test_module.js)
  install (FILES ${INSCRIPT} DESTINATION bisweb/test
    PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)

  # Other stuff

  install (DIRECTORY ${PROJECT_SOURCE_DIR}/../various/serverconfig  DESTINATION bisweb )
  install (FILES ${PROJECT_SOURCE_DIR}/../web/images/mean_reg2mean.nii.gz DESTINATION bisweb/images)
  install (FILES ${PROJECT_SOURCE_DIR}/../web/images/facemask_char.nii.gz DESTINATION bisweb/images)
  install (FILES ${PROJECT_SOURCE_DIR}/../web/images/ISAS_SPECT_Template.nii.gz DESTINATION bisweb/images)
  install (FILES ${PROJECT_SOURCE_DIR}/../web/images/MNI_T1_1mm_ras.nii.gz DESTINATION bisweb/images)
  install (FILES ${PROJECT_SOURCE_DIR}/../web/images/MNI_T1_1mm_mask.nii.gz DESTINATION bisweb/images)
  install (FILES ${PROJECT_SOURCE_DIR}/../web/images/MNI_T1_2mm_stripped_ras.nii.gz DESTINATION bisweb/images)
  install (FILES ${PROJECT_SOURCE_DIR}/../web/images/ISASHN_Standard_Deviation.nii.gz DESTINATION bisweb/images)
  install (FILES ${PROJECT_SOURCE_DIR}/../web/images/ISAS_SPECT_Mask.nii.gz DESTINATION bisweb/images)


  install (FILES ${PROJECT_SOURCE_DIR}/../web/dcm2nii_binaries/README.md DESTINATION bisweb/lib/dcm2nii_binaries)
  install (FILES ${PROJECT_SOURCE_DIR}/../web/dcm2nii_binaries/license.txt DESTINATION bisweb/lib/dcm2nii_binaries)
  install (PROGRAMS ${PROJECT_SOURCE_DIR}/../web/dcm2nii_binaries/windows/dcm2niix.exe DESTINATION bisweb/lib/dcm2nii_binaries/windows)
  install (PROGRAMS ${PROJECT_SOURCE_DIR}/../web/dcm2nii_binaries/linux/dcm2niix DESTINATION bisweb/lib/dcm2nii_binaries/linux)
  install (PROGRAMS ${PROJECT_SOURCE_DIR}/../web/dcm2nii_binaries/mac/dcm2niix DESTINATION bisweb/lib/dcm2nii_binaries/mac)
  install (FILES ${PROJECT_SOURCE_DIR}/../various/txt/README_test.md DESTINATION bisweb/test)

ELSE(BIS_A_EMSCRIPTEN)

  # ---------------------------------------------------------------------------------------------
  # Native C++ Mode
  # ---------------------------------------------------------------------------------------------

  OPTION(BIS_A_PYTHON "Build Python Wrappers" ON)
  OPTION(BIS_A_MATLAB "Build Matlab Wrappers" ON)
  OPTION(BIS_A_DEVEL "Install Developer Environment (on make install)" OFF)
  MARK_AS_ADVANCED(BIS_A_DEVEL)

  SET(CLIBNAME biswasm)
  SET (HEADER_SCRIPT ${TOOLS_DIR}/bis_create_matlab_header_file.js)

  # ---------------------------

  IF (WIN32)
    SET( CMAKE_CXX_FLAGS "/DEIGEN_HAS_C99_MATH /W1 /EHsc" CACHE STRING "" FORCE)
  ELSE (WIN32)
    SET( COMPILE_FLAGS "-Wall -Wextra -Wpedantic -Wformat ${AFNI_NATIVE_COMPILE_FLAGS}")
    SET (CMAKE_CXX_FLAGS "${COMPILE_FLAGS} -std=c++11 " CACHE STRING "" FORCE)
    SET (CMAKE_C_FLAGS ${COMPILE_FLAGS} CACHE STRING "" FORCE)
  ENDIF(WIN32)

  # ---------------------------

  include_directories (SYSTEM ${EIGEN3_INCLUDE_DIRS} )
  include_directories (SYSTEM ${IGL_INCLUDE_DIRS} )
  IF (BISWEB_USEAFNI)
    include_directories (SYSTEM ${AFNI_INCLUDE_DIRS})
  ENDIF (BISWEB_USEAFNI)

  include_directories (${PROJECT_SOURCE_DIR})
  SET (LIBRARY_OUTPUT_PATH ${PROJECT_BINARY_DIR}/ CACHE PATH "Single output directory for building all libraries.")
  ADD_LIBRARY (${CLIBNAME} SHARED ${KITSRCS})

  # ---------------------------

  if(MSVC)
    SET( CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG "${PROJECT_BINARY_DIR}")
    SET( CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE "${PROJECT_BINARY_DIR}")
    SET( CMAKE_LIBRARY_OUTPUT_DIRECTORY_DEBUG "${PROJECT_BINARY_DIR}")
    SET( CMAKE_LIBRARY_OUTPUT_DIRECTORY_RELEASE "${PROJECT_BINARY_DIR}")
    SET( CMAKE_ARCHIVE_OUTPUT_DIRECTORY_DEBUG "${PROJECT_BINARY_DIR}")
    SET( CMAKE_ARCHIVE_OUTPUT_DIRECTORY_RELEASE "${PROJECT_BINARY_DIR}")
  ENDIF(MSVC)

  # ---------------------------

  IF (BIS_A_PYTHON)
    CONFIGURE_FILE(${PROJECT_SOURCE_DIR}/bisConfigure.py.in ${PROJECT_BINARY_DIR}/bisConfigure.py)
    install (TARGETS ${CLIBNAME} DESTINATION biswebpython/lib)
    IF (BIS_A_DEVEL)
      install (FILES ${HEADERS} DESTINATION biswebpython/include)
      install (FILES ../config/UseBISWEB.cmake ../config/BISWEBConfig.cmake DESTINATION biswebpython/lib)
    ENDIF (BIS_A_DEVEL)
  ENDIF (BIS_A_PYTHON)

  IF (BIS_A_MATLAB)
    install (TARGETS ${CLIBNAME} DESTINATION biswebmatlab)
    install (FILES ${LICENSE_FILE} DESTINATION biswebmatlab RENAME LICENSE.md)
  ENDIF (BIS_A_MATLAB)


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
      COMMAND ${NODE_JS_EXECUTABLE} ${WRAP_SCRIPT} --python -i ${PARSE_LIST} -o ${PYTHON_WRAP_OUTPUT}
      )

    #    MESSAGE("${NODE_JS_EXECUTABLE} ${WRAP_SCRIPT} --python -i ${PARSE_LIST} -o ${PYTHON_WRAP_OUTPUT}")
    add_custom_target(wrappers_py ALL DEPENDS ${PYTHON_WRAP_OUTPUT})
    install (FILES ${PYTHON_WRAP_OUTPUT} DESTINATION biswebpython/lib)

    # ------------------ create module descriptions -------------

    FILE (STRINGS ${BISWEBPYTHON_MODULE_LIST_FILENAME} PYTHONMODULES)

    IF (BISWEB_USEAFNI)
      FILE (STRINGS ${BISWEBPYTHON_MODULE_LIST_FILENAME_AFNI} PYTHONMODULES2)
      list (APPEND PYTHONMODULES ${PYTHONMODULES2})
    ENDIF (BISWEB_USEAFNI)
    
    SET (PYTHON_MODULE_DESC ${LIBRARY_OUTPUT_PATH}/bismodules_desc.py)
    FILE(GLOB JMODS ${PROJECT_SOURCE_DIR}/../js/modules/*.js)

    IF (WIN32)
      add_custom_command(OUTPUT ${PYTHON_MODULE_DESC}
        DEPENDS ${BISWEBPYTHON_MODULE_LIST_FILENAME} ${DESCRIPTION_SCRIPT} CMakeLists.txt #${JMODS}
        PRE_BUILD COMMENT "Creating Python Module Descriptions"
        COMMAND ${NODE_JS_EXECUTABLE} ${DESCRIPTION_SCRIPT} -i ${BISWEBPYTHON_MODULE_LIST_FILENAME} --afni ${BISWEBPYTHON_MODULE_LIST_FILENAME_AFNI} -o ${PYTHON_MODULE_DESC} }
        )
    ELSE(WIN32)
        add_custom_command(OUTPUT ${PYTHON_MODULE_DESC}
        DEPENDS ${BISWEBPYTHON_MODULE_LIST_FILENAME} ${DESCRIPTION_SCRIPT} CMakeLists.txt ${JMODS}
        PRE_BUILD COMMENT "Creating Python Module Descriptions"
        COMMAND ${NODE_JS_EXECUTABLE} ${DESCRIPTION_SCRIPT} -i ${BISWEBPYTHON_MODULE_LIST_FILENAME} --afni ${BISWEBPYTHON_MODULE_LIST_FILENAME_AFNI} -o ${PYTHON_MODULE_DESC} }
        )
    ENDIF(WIN32)
    add_custom_target(module_desc_py ALL DEPENDS ${PYTHON_MODULE_DESC})
    add_custom_target(python_module_list_py ALL DEPENDS ${PYTHON_MODULE_DESC})
    install (FILES ${PYTHON_MODULE_DESC} DESTINATION biswebpython/lib)



    FILE(GLOB PYLIST0 ${BISWEBPYTHON_SOURCE_DIR}/[_a-zA-Z]*.py)
    FILE(GLOB PYLIST1 ${BISWEBPYTHON_SOURCE_DIR}/core/[_a-zA-Z]*.py)
    FILE(GLOB PYLIST2 ${BISWEBPYTHON_SOURCE_DIR}/modules/[_a-zA-Z]*.py)
    FILE(GLOB PYLIST3 ${BISWEBPYTHON_SOURCE_DIR}/utilities/[_a-zA-Z]*.py)
    FILE(GLOB PYLIST4 ${BISWEBPYTHON_SOURCE_DIR}/modules/[_a-zA-Z]*.txt)
    MESSAGE(${PYLIST4})
    
    install (FILES ${BISWEB_PYTHON_INIT} DESTINATION biswebpython)
    install (FILES ${PYLIST0} DESTINATION  biswebpython
      PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)
    install (FILES ${PYLIST1} DESTINATION biswebpython/core)
    install (FILES ${PYLIST3} DESTINATION biswebpython/utilities)
    install (FILES ${PYLIST2} DESTINATION biswebpython/modules
      PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)
    install (FILES ${PYLIST4} DESTINATION biswebpython/modules
      PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE WORLD_READ WORLD_EXECUTE)

    INSTALL (FILES "${PROJECT_SOURCE_DIR}/../biswebpython/config/biswebpython_readme.md" DESTINATION wheel RENAME README.md  PERMISSIONS OWNER_READ  WORLD_READ)
    INSTALL (FILES ${BISWEBPYTHON_SOURCE_DIR}/core/__init__.py DESTINATION biswebpython/lib PERMISSIONS OWNER_READ  WORLD_READ)


    configure_file( ${BISWEB_PYTHON_SETUP} "${PROJECT_BINARY_DIR}/setup.py" @ONLY )
    install (FILES ${PROJECT_BINARY_DIR}/setup.py DESTINATION wheel)
    install (FILES ${BISWEB_PYTHON_MANIFEST} DESTINATION wheel)
    install (FILES ${BISWEB_PYTHON_REQUIREMENTS} DESTINATION biswebpython)
    install (FILES ${BISWEBPYTHON_MODULE_LIST_FILENAME} DESTINATION biswebpython/modules)
    IF (BISWEB_USEAFNI)
      install (FILES ${BISWEBPYTHON_MODULE_LIST_FILENAME_AFNI} DESTINATION biswebpython/modules)
    ENDIF (BISWEB_USEAFNI)

    install (FILES ${PROJECT_BINARY_DIR}/bisConfigure.py DESTINATION biswebpython)

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

    # ------------------ module tests ---------------------------
    IF(BIS_MODULETEST)
      SET (COUNT 0)
      FOREACH (item ${PYTHONMODULES})
	add_test(NAME "py-module-${item}" COMMAND ${PYTHON_EXECUTABLE} test_module.py --testname ${item} --input local WORKING_DIRECTORY ${TEST_DIR})
	MATH (EXPR COUNT "${COUNT}+1")
      ENDFOREACH (item ${PYTHONMODULES})
      MESSAGE("~~~~~ Added ${COUNT} python module tests")

    ENDIF(BIS_MODULETEST)


    # Do not install this just yet
    install (FILES ${PROJECT_SOURCE_DIR}/../test/test_module.py DESTINATION biswebpython)


  ENDIF(BIS_A_PYTHON)

  # ---------------
  # Matlab
  # ---------------

  IF (BIS_A_MATLAB)
    MESSAGE("++ Building Matlab Prerequisites")


    OPTION(BIS_MATLABUNITTEST "Enable Matlab Unit Tests" OFF)
    MARK_AS_ADVANCED(BIS_MATLABUNITTEST)

    SET (README_FILE "${PROJECT_SOURCE_DIR}/../matlab/config/README.md")
    install (FILES ${README_FILE} DESTINATION biswebmatlab)

    configure_file( ${PROJECT_SOURCE_DIR}/../matlab/config/bis_package.m.in "${PROJECT_BINARY_DIR}/creatematlab.sh" @ONLY )
    install (FILES ${PROJECT_BINARY_DIR}/creatematlab.sh DESTINATION ".")

    SET (MATLAB_WRAP_OUTPUT ${LIBRARY_OUTPUT_PATH}/biswrapper.m)
    add_custom_command(OUTPUT ${MATLAB_WRAP_OUTPUT}
      DEPENDS ${PARSE_HEADERS} ${WRAP_SCRIPT}
      PRE_BUILD COMMENT "Creating Matlab Header"
      COMMAND ${NODE_JS_EXECUTABLE} ${WRAP_SCRIPT} -i ${PARSE_LIST} --matlab -o ${MATLAB_WRAP_OUTPUT})
    add_custom_target(wrappers_mat ALL DEPENDS ${MATLAB_WRAP_OUTPUT})
    install (FILES ${MATLAB_WRAP_OUTPUT} DESTINATION biswebmatlab)

    SET (MATLAB_OUT_HEADER ${LIBRARY_OUTPUT_PATH}/bis_matlab.h)
    add_custom_command(OUTPUT ${MATLAB_OUT_HEADER}
      DEPENDS ${PARSE_HEADERS} ${HEADER_SCRIPT} CMakeLists.txt
      PRE_BUILD COMMENT "Creating Matlab Header"
      COMMAND ${NODE_JS_EXECUTABLE} ${HEADER_SCRIPT} -i ${PARSE_LIST} -o ${MATLAB_OUT_HEADER})
    add_custom_target(header_mat ALL DEPENDS ${MATLAB_OUT_HEADER})
    install (FILES ${MATLAB_OUT_HEADER} DESTINATION biswebmatlab)

    GET_FILENAME_COMPONENT(MATLAB_SOURCE_DIR ${PROJECT_SOURCE_DIR}/../matlab ABSOLUTE)
    FILE(GLOB MLIST ${MATLAB_SOURCE_DIR}/bis*.m)
    list(REMOVE_ITEM MLIST ${MATLAB_SOURCE_DIR}/bispath.m)
    install (FILES ${MLIST} DESTINATION biswebmatlab)
    FILE(GLOB MLIST ${MATLAB_SOURCE_DIR}/example.m)
    install (FILES ${MLIST} DESTINATION biswebmatlab)
    FILE(GLOB MLIST ${MATLAB_SOURCE_DIR}/nii/[a-zA-Z]*.m)
    install (FILES ${MLIST} DESTINATION biswebmatlab/nii)
    FILE(GLOB MLIST ${MATLAB_SOURCE_DIR}/nii/license.txt)
    install (FILES ${MLIST} DESTINATION biswebmatlab/nii)
    FILE(GLOB MLIST ${MATLAB_SOURCE_DIR}/tests/[a-zA-Z]*.m)
    install (FILES ${MLIST} DESTINATION biswebmatlab/tests)

    # Install replacement bispath
    install (FILES ${MATLAB_SOURCE_DIR}/config/bispath.m DESTINATION biswebmatlab)

    IF (BIS_MATLABUNITTEST)
        FIND_PROGRAM(MATLAB matlab REQUIRED)
        SET (CMDARGS "-nodesktop -nodisplay < bisweb_runalltests.m")
        MESSAGE("${MATLAB} ${CMDARGS}")
        add_test(NAME "MATLAB-unittests" COMMAND ${MATLAB} ${CMDARGS}  WORKING_DIRECTORY  ${CMAKE_INSTALL_PREFIX}/biswebmatlab/tests)
    ENDIF (BIS_MATLABUNITTEST)
  ENDIF(BIS_A_MATLAB)


  if(UNIX AND NOT APPLE)
    FILE(GLOB MACEXTRA ${PROJECT_BINARY_DIR}/libbiswasm.dylib)
    FILE(GLOB WINEXTRA ${PROJECT_BINARY_DIR}/biswasm.dll)
    MESSAGE("--- Intalling Extra libraries if they exist ${MACEXTRA},${WINEXTRA}")

    IF (BIS_A_PYTHON)
      install (FILES ${MACEXTRA} DESTINATION biswebpython/lib)
      install (FILES ${WINEXTRA} DESTINATION biswebpython/lib)
    ENDIF (BIS_A_PYTHON)

    IF (BIS_A_MATLAB)
        install (FILES ${MACEXTRA} DESTINATION biswebmatlab)
        install (FILES ${WINEXTRA} DESTINATION biswebmatlab)
      ENDIF (BIS_A_MATLAB)
    endif()

  # ---------------
  # Common
  # ---------------
  add_custom_target(wrappers ALL DEPENDS ${MATLAB_OUT_HEADER} ${MATLAB_WRAP_OUTPUT} ${PYTHON_WRAP_OUTPUT} ${WRAP_SCRIPT} ${HEADER_SCRIPT} ${PYTHON_MODULE_DESC})

ENDIF(BIS_A_EMSCRIPTEN)



