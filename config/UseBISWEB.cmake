#
# This module is provided as BISWEB_USE_FILE by BISWEBConfig.cmake.  It can
# be included in a project to load the needed compiler and linker
# settings to use BISWEB.
#

# Add include directories needed to use BISWEB.
INCLUDE_DIRECTORIES(${BISWEB_INCLUDE_DIRS})

# Add link directories needed to use BISWEB.
LINK_DIRECTORIES(${BISWEB_LIBRARY_DIRS})

SET(BISWEB_LIBRARIES biswasm)



