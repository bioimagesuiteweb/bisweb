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


cd %BDIR%
cmd /c node %SRCDIR%\js\bin\bisweb -h

REM Run quick tests
cd %SRCDIR%\test
mocha   test_module.js --input local --last 2
python3 test_module.py --last 5

REM Done
cd %SRCDIR%
