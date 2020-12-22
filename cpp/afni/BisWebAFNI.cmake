# Compile Flags to turn warnings off
# ----------------------------------
include(FetchContent)
set(COMP_MINI_MRI ON)
FetchContent_Declare(
  afni
  GIT_REPOSITORY https://github.com/leej3/afni
  GIT_TAG bisweb
  )
SET(FETCHCONTENT_SOURCE_DIR_AFNI ${PROJECT_SOURCE_DIR}/../../afni)
FetchContent_MakeAvailable(afni)


# --------
FIND_PATH(BISWEB_AFNI_DIR mrilib.h  REQUIRED)


SET (AFNI_WASM_COMPILE_FLAGS "-DMRILIB_MINI -DREPLACE_XT")
# -Wc++11-compat-deprecated-writable-strings -Wc++11-compat-deprecated-writable-strings")
#SET (AFNI_NATIVE_COMPILE_FLAGS "-DMRILIB_MINI -DREPLACE_XT")

# Include directories

SET (BISWEBAFNI_INCLUDE_DIRS ${BISWEB_AFNI_DIR})
SET (BISWEBAFNI_HEADERS ${PROJECT_SOURCE_DIR}/afni/bisAFNIExportedFunctions.h)
SET (BISWEBAFNI_SOURCES ${PROJECT_SOURCE_DIR}/afni/bisAFNIExportedFunctions.cpp)


    
