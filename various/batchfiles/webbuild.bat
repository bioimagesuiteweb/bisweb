@echo off
SET IDIR0=%~dp0..
for %%i in ("%IDIR0%") do SET "IDIR=%%~fi"

SET BDIR0=%IDIR%\build
for %%i in ("%BDIR0%") do SET "BDIR=%%~fi"

SET SRCDIR0=%BDIR%\..
for %%i in ("%SRCDIR0%") do SET "SRCDIR=%%~fi"

SET EXTRA=-m
                            
echo -----------------------------------------------------------------------
echo SRCDIR=%SRCDIR%
echo BDIR=%BDIR%
echo -----------------------------------------------------------------------

SET BDIST=%BDIR%\dist

mkdir  %BDIST%
mkdir  %BDIR%\install\zips
mkdir  %BDIR%\web
mkdir  %BDIR%\build\doc

cmd /c gulp build %EXTRA%
cmd /c gulp zip
copy %BDIST%\*zip %BDIR%\install\zips

dir

echo -----------------------------------------------------------------------
echo  Done with Web Based Tools
echo -----------------------------------------------------------------------
