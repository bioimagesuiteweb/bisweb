FIND_PATH(BISWEB_AFNI_DIR mrilib.h  REQUIRED)

MESSAGE("~~~~")
MESSAGE("~~~~ Found AFNI in ${BISWEB_AFNI_DIR}")
MESSAGE("~~~~")

# Compile Flags to turn warnings off
# ----------------------------------
SET (AFNI_WASM_COMPILE_FLAGS "-DMRILIB_MINI -DREPLACE_XT")
# -Wc++11-compat-deprecated-writable-strings -Wc++11-compat-deprecated-writable-strings")
SET (AFNI_NATIVE_COMPILE_FLAGS "-DMRILIB_MINI -DREPLACE_XT")

# Include directories

SET(AFNI_INCLUDE_DIRS ${BISWEB_AFNI_DIR})

# List of header files
SET (AFNI_HEADERS ${PROJECT_SOURCE_DIR}/afni/bisAFNIExportedFunctions.h)

SET(AFNI_SOURCES
  ${BISWEB_AFNI_DIR}/mri_blur3d_variable.c
  ${BISWEB_AFNI_DIR}/mri_new.c
  ${BISWEB_AFNI_DIR}/mri_free.c
  ${BISWEB_AFNI_DIR}/debugtrace.c
  ${PROJECT_SOURCE_DIR}/afni/bisAFNIExportedFunctions.cpp
  )

SET (AFNI_SOURCES2
    ${BISWEB_AFNI_DIR}/niml/niml_b64.c
    ${BISWEB_AFNI_DIR}/niml/niml_byteorder.c
    ${BISWEB_AFNI_DIR}/niml/niml_dataset.c
    ${BISWEB_AFNI_DIR}/niml/niml_do.c
    ${BISWEB_AFNI_DIR}/niml/niml_dtable.c
    ${BISWEB_AFNI_DIR}/niml/niml_element.c
    ${BISWEB_AFNI_DIR}/niml/niml_elemio.c
    ${BISWEB_AFNI_DIR}/niml/niml_header.c
    ${BISWEB_AFNI_DIR}/niml/niml_htable.c
    ${BISWEB_AFNI_DIR}/niml/niml_malloc.c
    ${BISWEB_AFNI_DIR}/niml/niml_md5.c
    ${BISWEB_AFNI_DIR}/niml/niml_private.h
    ${BISWEB_AFNI_DIR}/niml/niml_registry.c
    ${BISWEB_AFNI_DIR}/niml/niml_rowtype.c
    ${BISWEB_AFNI_DIR}/niml/niml_stat.c
    ${BISWEB_AFNI_DIR}/niml/niml_stream.c
    ${BISWEB_AFNI_DIR}/niml/niml_struct.c
    ${BISWEB_AFNI_DIR}/niml/niml_sucker.c
    ${BISWEB_AFNI_DIR}/niml/niml_url.c
    ${BISWEB_AFNI_DIR}/niml/niml_util.c
    ${BISWEB_AFNI_DIR}/niml/niml_uuid.c
    ${BISWEB_AFNI_DIR}/niml/niml_vector.c
)



    
