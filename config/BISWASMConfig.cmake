#-----------------------------------------------------------------------------
#
# BISWASMConfig.cmake - BISWASM CMake configuration file for external projects.
#
# This file is  used by the UseBISWASM.cmake module to load BISWASM's settings for an external project.
GET_FILENAME_COMPONENT(BISWASM_DIR "${CMAKE_CURRENT_LIST_FILE}" PATH)

# The BISWASM include file directories.
SET(BISWASM_INCLUDE_DIRS ${BISWASM_DIR}/../include)

# The BISWASM library directories.
SET(BISWASM_LIBRARY_DIRS ${BISWASM_DIR}/../lib)

# The location of the UseBISWASM.cmake file.
SET(BISWASM_USE_FILE ${BISWASM_DIR}/UseBISWASM.cmake)

# The name of the BISWASM project
SET(CMAKE_BUILD_SETTING_PROJECT_NAME "BISWASM")

