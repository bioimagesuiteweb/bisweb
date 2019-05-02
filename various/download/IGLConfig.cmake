#-----------------------------------------------------------------------------
#
# IGLConfig.cmake - IGL CMake configuration file for external projects.
#
# This file is  used by the UseIGL.cmake module to load IGL's settings for an external project.


get_filename_component(PACKAGE_PREFIX_DIR "${CMAKE_CURRENT_LIST_DIR}" ABSOLUTE)

# The IGL include file directories.
SET(IGL_INCLUDE_DIRS "${PACKAGE_PREFIX_DIR}")

