@echo OFF
SET FIRST=8
SET LAST=12
SET BISWEBOS=windows

echo ----------------------------------------------------------
echo +++ Running %BISWEBOS% regression tests %FIRST%:%LAST% (Inputs were %BIS_FIRST_TEST%:%BIS_LAST_TEST%)
echo ----------------------------------------------------------   
echo 
sleep 1

SET  BASE=C:\Users\xpapa
echo +++ Using BASE=%BASE%


REM ------ Create output directories

SET BDIR=%BASE%\bisweb\src\build
SET OUTDIR=%BDIR%\output
mkdir  %OUTDIR%

SET LOGDIR=%OUTDIR%\logs\%BISWEBOS%
SET ELECTRON=%OUTDIR%\electron\%BISWEBOS%
SET BINARIES=%OUTDIR%\binaries\%BISWEBOS%
SET LIBRARIES=%OUTDIR%\libraries\%BISWEBOS%

mkdir %OUTDIR%
mkdir %LOGDIR%
mkdir %ELECTRON%
mkdir %BINARIES%
mkdir %LIBRARIES%


echo -- Temporary directories %OUTDIR%
cd  %OUTDIR%
dir

REM ------ Create testing files

SET RESULTFILE=%LOGDIR%\0_summary_results.txt
SET LOGFILE=%LOGDIR%\1_js_logfile.txt
SET LOGFILE2=%LOGDIR%\2_py_logfile.txt


cd %BDIR%

echo ----------------------------------------------------------  
echo --- Regression testing JS %BDIR% 
echo ---
cd %BDIR%\wasm
cd
dir

ctest -j2 -I %FIRST%,%LAST% -V 


echo ----------------------------------------------------------
echo --- Regression testing Python 
echo ---  
cd %BDIR%\native
cd

ctest -j2 -I %FIRST%,%LAST% -V 

echo ----------------------------------------------------------   

cd %BDIR%

REM echo ------------------------------------ 
REM echo --- Postprocessing Result
REM echo ------------------------------------

REM grep "Test   REM" %LOGFILE% >> %RESULTFILE%
REM grep "Test  REM" %LOGFILE% >> %RESULTFILE%
REM grep "Test REM" %LOGFILE% >> %RESULTFILE%
REM grep "passed" %LOGFILE% | REM grep "failed" >> %RESULTFILE%
REM grep "Total Test time" %LOGFILE% >> %RESULTFILE%

REM echo "...." >> %RESULTFILE%
REM echo "...." >> %RESULTFILE%
REM echo ".... Python tests" >> %RESULTFILE%
REM echo "...." >> %RESULTFILE%
REM grep "Test   REM" %LOGFILE2% >> %RESULTFILE%
REM grep "Test  REM" %LOGFILE2% >> %RESULTFILE%
REM grep "Test REM" %LOGFILE2% >> %RESULTFILE%
REM grep "passed" %LOGFILE2% | REM grep "failed" >> %RESULTFILE%
REM grep "Total Test time" %LOGFILE2% >> %RESULTFILE%
REM echo "...." >> %RESULTFILE%


SET REPORT="Done"
echo "::set-output name=result::$REPORT"

REM Now binaries
REM First copy node.js and python packages
REM

echo "On WINDOWS"
copy %BDIR%\native\*.dll %LIBRARIES%

REM JS Build artifacts
copy %BDIR%\wasm\*.js %LIBRARIES%
copy %BDIR%\wasm\*.wasm %LIBRARIES%

echo "____________________________________________________________________________________"
echo "___"
echo "___ Output files stored are %LOGFILE%, %LOGFILE2% and %RESULTFILE%"
echo "___   and binaries in %BINARIES%, %ELECTRON% and %LIBRARIES%"
echo "___"
echo "____________________________________________________________________________________"
