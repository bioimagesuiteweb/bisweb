@echo off
SET IDIR0=%~dp0..
for %%i in ("%IDIR0%") do SET "IDIR=%%~fi"

SET BDIR0=%IDIR%\buildwin
for %%i in ("%BDIR0%") do SET "BDIR=%%~fi"

SET SRCDIR0=%BDIR%\..
for %%i in ("%SRCDIR0%") do SET "SRCDIR=%%~fi"

echo -----------------------------------------------------------------------
echo SRCDIR=%SRCDIR%
echo BDIR=%BDIR%
echo -----------------------------------------------------------------------

call %BDIR%\emsdk_portable\emsdk_env.bat
echo -------------------------------------

cd %BDIR%\wasm
mkdir lib

cmake -G "NMake Makefiles" -DCMAKE_TOOLCHAIN_FILE="%BDIR%\emsdk_portable\upstream\emscripten\cmake\Modules\Platform\Emscripten.cmake" ^
      -DEigen3_DIR="%BDIR%\eigen3\share\eigen3\cmake"^
      -DCMAKE_CXX_FLAGS="-o2 -s WASM=1 -s TOTAL_MEMORY=512MB -Wint-in-bool-context" ^
      -DCMAKE_EXE_LINKER_FLAGS="--pre-js %SRCDIR%\cpp\libbiswasm_pre.js --post-js %SRCDIR%\cpp\libbiswasm_post.js" ^
      -DCMAKE_INSTALL_PREFIX="BDIR%\install" ^
      -DBIS_BUILDSCRIPTS=ON ^
      -DCMAKE_VERBOSE_MAKEFILE=ON ^
      -DBIS_USEGPL=ON ^
      -DBIS_GPL_DIR="%SRCDIR%\..\gpl" ^
      -DBIS_USEINDIV=ON ^
      -DIGL_DIR="%BDIR%\igl" ^
      -DBIS_USECPM=ON ^
      %SRCDIR%\cpp


cd ..\..\compiletools
exit /b
