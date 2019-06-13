#-----------------------------------------------------------------------------
#
# BISWEBConfig.cmake - BISWEB CMake configuration file for external projects.
#
# This file is  used by the UseBISWEB.cmake module to load BISWEB's settings for an external project.
GET_FILENAME_COMPONENT(BISWEB_DIR "${CMAKE_CURRENT_LIST_FILE}" PATH)

# The BISWEB include file directories.
SET(BISWEB_INCLUDE_DIRS ${BISWEB_DIR}/../include)

# The BISWEB library directories.
SET(BISWEB_LIBRARY_DIRS ${BISWEB_DIR}/../lib)

# The location of the UseBISWEB.cmake file.
SET(BISWEB_USE_FILE ${BISWEB_DIR}/UseBISWEB.cmake)

# The name of the BISWEB project
SET(CMAKE_BUILD_SETTING_PROJECT_NAME "BISWEB")

