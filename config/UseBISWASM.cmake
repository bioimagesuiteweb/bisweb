#
# This module is provided as BISWASM_USE_FILE by BISWASMConfig.cmake.  It can
# be included in a project to load the needed compiler and linker
# settings to use BISWASM.
#

# Add include directories needed to use BISWASM.
INCLUDE_DIRECTORIES(${BISWASM_INCLUDE_DIRS})

# Add link directories needed to use BISWASM.
LINK_DIRECTORIES(${BISWASM_LIBRARY_DIRS})

SET(BISWASM_LIBRARIES biswasm)



