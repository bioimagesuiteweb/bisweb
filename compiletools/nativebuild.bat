@echo off
SET IDIR0=%~dp0..
for %%i in ("%IDIR0%") do SET "IDIR=%%~fi"

SET BDIR0=%IDIR%\build
for %%i in ("%BDIR0%") do SET "BDIR=%%~fi"

SET SRCDIR0=%BDIR%\..
for %%i in ("%SRCDIR0%") do SET "SRCDIR=%%~fi"

SET CDIR0=%SRCDIR%/compiletools 
for %%i in ("%CDIR0%") do SET "CDIR=%%~fi"
                            
echo -----------------------------------------------------------------------
echo SRCDIR=%SRCDIR%
echo BDIR=%BDIR%
echo CDIR=%CDIR%
echo -----------------------------------------------------------------------

mkdir %BDIR%\doc\doxgen
mkdir %BDIR%\install
mkdir %BDIR%\install\zips

del %BDIR%\install\biswebpython /Q
del %BDIR%\install\biswebmatlab /Q
del %BDIR%\install\wheel /Q



REM Build NATIVE
mkdir %BDIR%\native
cd %BDIR%\native
del CMakeCache.txt /Q

cmake -G "NMake Makefiles" ^
      -DBIS_A_EMSCRIPTEN=OFF  ^
      -DEigen3_DIR="%BDIR%\eigen3\share\eigen3\cmake" ^
      -DCMAKE_VERBOSE_MAKEFILE=OFF ^
      -DBIS_A_MATLAB=ON ^
      -DCMAKE_BUILD_TYPE="Release" ^
      -DCMAKE_INSTALL_PREFIX="%BDIR%\install" ^
      -DBIS_USEGPL=ON -DBIS_GPL_DIR="%SRCDIR%\..\gpl" ^
      -DBIS_USEINDIV=ON -DIGL_DIR="%BDIR%\igl" ^
      %SRCDIR%\cpp


nmake

nmake install


echo -----------------------------------------------------------------------

cmd /c %CDIR%\pythonwheel.bat

echo -----------------------------------------------------------------------
echo  Done with Python Wheel stuff
echo -----------------------------------------------------------------------

cd %BDIR%\install\zips
cd
dir


echo -----------------------------------------------------------------------
echo  Done with Python\Matlab Tools
echo -----------------------------------------------------------------------
