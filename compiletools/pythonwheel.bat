@echo off
SET IDIR0=%~dp0..
for %%i in ("%IDIR0%") do SET "IDIR=%%~fi"

SET BDIR0=%IDIR%\buildwin
for %%i in ("%BDIR0%") do SET "BDIR=%%~fi"

SET SRCDIR0=%BDIR%\..
for %%i in ("%SRCDIR0%") do SET "SRCDIR=%%~fi"

echo -----------------------------------------------------------------------
echo Assembling python package
echo -----------------------------------------------------------------------

cd %BDIR%\install

SET ORIG=%BDIR%\install\biswebpython
SET WHEEL=%BDIR%\install\wheel

del %WHEEL%\biswebpython /Q



echo %ORIG%
echo %WHEEL%

xcopy  %ORIG% %WHEEL% /E
del %WHEEL%\biswebpython\__pycache__ /Q
del %WHEEL%\biswebpython\*\__pycache__ /Q
del %WHEEL%\biswebpython\setpaths* /Q

cd %WHEEL%
python setup.py sdist bdist_wheel

echo "-----------------------------------------------------------------------"
cd %BDIR%\install\zips
del bisweb*any.whl /Q
del bisweb*.tar.gz /Q
copy %BDIR%\install\wheel\dist\* .
cd
dir


echo "-----------------------------------------------------------------------"
echo " Done with Python Wheel stuff"
echo "-----------------------------------------------------------------------"
