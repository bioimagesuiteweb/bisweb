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

REM  Cleanup some old stuff
del %BDIR%\install /Q
echo H3
del %BDIR%\doc  /Q
echo H4
echo -----------------------------------------------------------------------
echo "Done with cleanup"
dir %BDIR%
echo -----------------------------------------------------------------------

cd %CDIR%
SET QPATH=%PATH%
cmd /c %CDIR%\wasmbuild.bat
cd %CDIR%
SET PATH=%QPATH%
cmd /c %CDIR%\webbuild.bat
cd %CDIR%
cmd /c %CDIR%\nativebuild.bat
cd %CDIR%
cmd /c @call %CDIR%\testbuild.bat
cd %CDIR%

