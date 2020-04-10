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


SET (CPACK_PACKAGE_VENDOR "Section of Bioimaging Sciences, Dept. of Diagnostic Radiology, Yale School of Medicine. (www.bioimagesuite.org)")
SET (CPACK_PACKAGE_NAME "bisweb")
SET (CPACK_PACKAGE_SHORT_FILE_NAME "bisweb")
SET (CPACK_PACKAGE_VERSION_MAJOR ${BISWEB_VERSION_MAJOR})
SET (CPACK_PACKAGE_VERSION_MINOR ${BISWEB_VERSION_MINOR})
SET (CPACK_PACKAGE_VERSION_PATCH ${BISWEB_VERSION_PATCH})


IF (BIS_A_EMSCRIPTEN)
  SET(BIS_OSNAME "js-wasm")
ELSE (BIS_A_EMSCRIPTEN)
  IF (BIS_A_MATLAB)
    SET(SNAME "python_matlab")
  ELSE (BIS_A_MATLAB)
    SET(SNAME "python")
  ENDIF(BIS_A_MATLAB)

  IF (WIN32)
    SET(BIS_OSNAME "${SNAME}_windows")
  ELSE(WIN32)
    IF (APPLE)
      SET(BIS_OSNAME "${SNAME}_macos")
    ELSE (APPLE)
      SET(BIS_OSNAME "${SNAME}_linux")
    ENDIF (APPLE)
  ENDIF(WIN32)
ENDIF (BIS_A_EMSCRIPTEN)
  

SET (CPACK_POSTINSTALL "")
IF (WIN32)
  EXECUTE_PROCESS (
    COMMAND cmd.exe /cdate /t
    OUTPUT_VARIABLE TMPD
    ERROR_VARIABLE TMPE
    )
  
  STRING(REGEX REPLACE "/" "_" TMPD "${TMPD}")
  STRING(REGEX REPLACE " " "-" TMPD "${TMPD}")
  STRING(REGEX REPLACE "[\n\t]" "" TMPD "${TMPD}")
  STRING(REGEX REPLACE "-" "" TMPD "${TMPD}")
  STRING(REGEX REPLACE "^[A-Za-z]+" "" TMPD "${TMPD}")
ELSE (WIN32)
  EXECUTE_PROCESS (
    COMMAND date +%d_%b_%Y
    OUTPUT_VARIABLE TMPD
    ERROR_VARIABLE TMPE
    )
ENDIF(WIN32)

STRING(REGEX REPLACE "[\n\t]" "" TMPD "${TMPD}")
SET (VERSION "${BISWEB_VERSION}-${BIS_OSNAME}-${TMPD}")
SET (BUILDNAME "${BIS_OSNAME}-${TMPD}" CACHE STRING "Buildname variable" FORCE)
SET(CPACK_PACKAGE_DESCRIPTION_SUMMARY "BioImage Suite Web ${BUILDNAME}")
SET(CPACK_PACKAGE_INSTALL_DIRECTORY "")
SET(CPACK_RESOURCE_FILE_LICENSE ${LICENSE_FILE})



INCLUDE(InstallRequiredSystemLibraries)
SET(CPACK_PACKAGE_FILE_NAME "bisweb-${VERSION}")
IF (NOT WIN32)
  SET(CPACK_GENERATOR "STGZ")
ELSE (NOT WIN32)
  SET(CPACK_GENERATOR "")
ENDIF (NOT WIN32)
INCLUDE(CPack)


MESSAGE("~~~~~ VERSION=${VERSION}, ${BUILDNAME} ${LICENSE_FILE}")


